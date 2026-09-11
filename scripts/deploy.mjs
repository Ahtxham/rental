#!/usr/bin/env node
/**
 * Deploy to the droplet: pull, build, restart PM2.
 *
 *   npm run deploy                    main → 159.65.228.41
 *   npm run deploy -- --dry-run       show what would ship, change nothing
 *   npm run deploy -- --all           rebuild both halves even if unchanged
 *   npm run deploy -- --install       force a dependency install
 *   npm run deploy -- --branch=hotfix
 *   npm run deploy -- --yes           no prompt
 *
 * The server pulls from GitHub, it does not receive anything from this
 * machine. A commit that only exists locally will not be in the deploy, so the
 * first thing this checks is whether your branch is pushed. That mistake looks
 * exactly like the fix not working.
 *
 * What it decides for you, from `git diff OLD..NEW`:
 *
 *   - Dependencies are installed only when a package.json or a lockfile moved.
 *     `npm ci` deletes node_modules and rebuilds it, which on a 4 GB box with
 *     no swap is both slow and a genuine out-of-memory risk. Running it on
 *     every deploy buys nothing.
 *   - Each half is built and restarted only if its own files changed (or its
 *     build output is missing). A copy change on the website should not bounce
 *     the API, and a backend fix should not take the website down with it.
 *
 * Both halves are built BEFORE either is restarted, so a compile error leaves
 * the currently-running processes alone, a failed deploy is a no-op, not an
 * outage.
 *
 * The one window that cannot be closed here: `next build` rewrites `rentals-web/.next`
 * underneath the running `next start`, so for a minute or two a page load can
 * miss a chunk it expects. Closing that properly means building to a second
 * directory and swapping, worth doing if it ever bites, and not worth the
 * machinery until it does.
 */
import { execFileSync, spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";

const HOST = process.env.DEPLOY_HOST ?? "root@159.65.228.41";
const DIR = process.env.DEPLOY_DIR ?? "/var/code/musafir";

const c = {
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};
const say = (msg = "") => console.log(msg);
const die = (headline, ...detail) => {
  say("");
  say(`${c.red}${headline}${c.reset}`);
  for (const line of detail) say(`  ${c.dim}${line}${c.reset}`);
  process.exit(1);
};

// ── args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => {
  const match = args.find((a) => a.startsWith(`--${name}=`));
  return match ? match.slice(name.length + 3) : undefined;
};
const has = (name) => args.includes(`--${name}`);

const branch = flag("branch") ?? "main";
const dryRun = has("dry-run");
const assumeYes = has("yes") || args.includes("-y");
const buildAll = has("all");
const forceInstall = has("install");
const force = has("force");

// ── ssh ───────────────────────────────────────────────────────────────────
// The remote scripts take everything through positional parameters and never
// interpolate. A deploy script that builds shell out of string concatenation
// is one odd branch name away from running something else entirely.
const sshArgs = ["-o", "ConnectTimeout=10", "-T", HOST, "bash", "-s", "--"];

const sshCapture = (script, params) =>
  execFileSync("ssh", [...sshArgs, ...params], { input: script, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] });

const sshStream = async (script, params) => {
  const child = spawn("ssh", [...sshArgs, ...params], { stdio: ["pipe", "inherit", "inherit"] });
  child.stdin.end(script);
  return new Promise((done) => child.on("exit", (code) => done(code ?? 1)));
};

// ── what the server is holding right now ──────────────────────────────────
const INSPECT = String.raw`
set -euo pipefail
cd "$1"
git fetch --quiet origin "$2"
echo "::BRANCH::$(git rev-parse --abbrev-ref HEAD)"
echo "::HEAD::$(git rev-parse HEAD)"
echo "::TARGET::$(git rev-parse origin/"$2")"
echo "::MEM::$(free -m | awk '/^Mem:/{print $7}')"
echo "::SWAP::$(free -m | awk '/^Swap:/{print $2}')"
echo "::DIST::$([ -d backend/dist ] && echo yes || echo no)"
echo "::NEXT::$([ -d rentals-web/.next ] && echo yes || echo no)"
echo "::APPS::$(node -e 'const a=require("./ecosystem.config.js").apps;console.log(JSON.stringify(a.map(function(x){return{name:x.name,port:Number(x.env&&x.env.PORT)||Number((String(x.args||"").match(/-p ([0-9]+)/)||[])[1])||null,kind:/-BE-/.test(x.name)?"backend":"web"}})))')"
echo "::DIRTY::"
git status --porcelain
echo "::COMMITS::"
git log --pretty=tformat:"%h %s" HEAD..origin/"$2"
echo "::FILES::"
git diff --name-only HEAD origin/"$2"
echo "::END::"
`;

say("");
say(`${c.bold}Musafir → droplet${c.reset}`);
say(`  host    ${HOST}`);
say(`  dir     ${DIR}`);
say(`  branch  ${branch}`);

let report;
try {
  report = sshCapture(INSPECT, [DIR, branch]);
} catch {
  die(
    `Could not read ${DIR} on ${HOST}.`,
    "Check the box is up and your key is loaded:",
    `ssh ${HOST} 'cd ${DIR} && git status'`,
  );
}

// ── parse it ──────────────────────────────────────────────────────────────
const scalar = (key) => (report.match(new RegExp(`^::${key}::(.*)$`, "m")) ?? [])[1] ?? "";
const block = (key, next) => {
  const start = report.indexOf(`::${key}::`);
  const end = report.indexOf(`::${next}::`);
  if (start === -1 || end === -1) return [];
  return report
    .slice(start + `::${key}::`.length, end)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
};

const remoteBranch = scalar("BRANCH");
const remoteHead = scalar("HEAD");
const target = scalar("TARGET");
const memFree = Number(scalar("MEM"));
const swap = Number(scalar("SWAP"));
const hasDist = scalar("DIST") === "yes";
const hasNext = scalar("NEXT") === "yes";
const apps = JSON.parse(scalar("APPS") || "[]");
const dirty = block("DIRTY", "COMMITS");
const commits = block("COMMITS", "FILES");
const files = block("FILES", "END");

// ── is what you meant to ship actually on GitHub? ─────────────────────────
const git = (...gitArgs) => execFileSync("git", gitArgs, { encoding: "utf8" }).trimEnd();
let unpushed = [];
try {
  git("fetch", "--quiet", "origin", branch);
  unpushed = git("log", "--oneline", `origin/${branch}..${branch}`).split("\n").filter(Boolean);
} catch {
  // No local checkout of that branch, or no network, the server's own fetch
  // is the one that matters, so this is advisory only.
}

// ── decide what needs doing ───────────────────────────────────────────────
const touched = (pattern) => files.some((file) => pattern.test(file));
const rootChanged = touched(/^(ecosystem\.config\.js|package\.json|package-lock\.json)$/);
const backendChanged = buildAll || rootChanged || touched(/^backend\//) || !hasDist;
const webChanged = buildAll || rootChanged || touched(/^rentals-web\//) || !hasNext;
const installBackend = forceInstall || touched(/^backend\/(package\.json|yarn\.lock)$/) || !hasDist;
const installWeb = forceInstall || touched(/^rentals-web\/(package\.json|package-lock\.json)$/) || !hasNext;

const selected = apps.filter((app) => (app.kind === "backend" ? backendChanged : webChanged));

// ── show the plan ─────────────────────────────────────────────────────────
// Pulling origin/main into a checkout that is sitting on something else
// fast-forwards the wrong branch, and every count above would be measured
// against the wrong HEAD.
if (remoteBranch !== branch) {
  die(
    `The server is on branch "${remoteBranch}", not "${branch}".`,
    "Deploying would pull one branch's commits onto another.",
    `Check it out first: ssh ${HOST} 'cd ${DIR} && git checkout ${branch}'`,
    `Or deploy what is actually there: npm run deploy -- --branch=${remoteBranch}`,
  );
}

say(`  commit  ${remoteHead.slice(0, 7)} → ${c.bold}${target.slice(0, 7)}${c.reset}`);

if (remoteHead === target && !force) {
  say("");
  say(`${c.green}Already up to date.${c.reset} ${c.dim}Nothing to pull, pass --force to rebuild anyway.${c.reset}`);
  process.exit(0);
}

if (unpushed.length > 0) {
  say("");
  say(`  ${c.yellow}${unpushed.length} local commit${unpushed.length === 1 ? "" : "s"} not pushed${c.reset} ${c.dim}, the server pulls from GitHub, so these will NOT ship${c.reset}`);
  for (const line of unpushed.slice(0, 5)) say(`    ${c.dim}${line}${c.reset}`);
  say(`    ${c.dim}git push origin ${branch}${c.reset}`);
}

if (commits.length > 0) {
  say("");
  say(`  ${c.bold}${commits.length} commit${commits.length === 1 ? "" : "s"} to deploy${c.reset}`);
  for (const line of commits.slice(0, 12)) say(`    ${line}`);
  if (commits.length > 12) say(`    ${c.dim}…and ${commits.length - 12} more${c.reset}`);
}

// Tracked files edited on the server itself. `git pull --ff-only` will refuse
// to clobber them, so this is a hard stop rather than a surprise mid-deploy.
const dirtyTracked = dirty.filter((line) => !line.startsWith("??"));
if (dirtyTracked.length > 0) {
  die(
    `${dirtyTracked.length} tracked file${dirtyTracked.length === 1 ? " has" : "s have"} been edited on the server.`,
    ...dirtyTracked.slice(0, 10),
    "",
    "Somebody changed production by hand. Look at it before overwriting it:",
    `ssh ${HOST} 'cd ${DIR} && git diff'`,
    "Then commit it properly, or discard it with: git checkout -- <file>",
  );
}

say("");
say(`  ${c.bold}plan${c.reset}`);
if (!backendChanged && !webChanged) {
  say(`    ${c.dim}nothing server-side changed, pull only, no build, no restart${c.reset}`);
} else {
  if (backendChanged) say(`    backend  ${installBackend ? "yarn install · " : ""}yarn build · restart`);
  else say(`    backend  ${c.dim}unchanged, left running${c.reset}`);
  if (webChanged) say(`    web      ${installWeb ? "npm ci · " : ""}next build · restart`);
  else say(`    web      ${c.dim}unchanged, left running${c.reset}`);
}

// A Next build is the memory-hungry step, and this box has no swap to fall
// back on, an OOM kill there reads as a mysterious "Killed" with no stack.
if (webChanged && memFree < 900) {
  say("");
  say(`  ${c.yellow}${memFree} MB free, ${swap} MB swap${c.reset} ${c.dim}, next build may be OOM-killed. If it dies with "Killed", add swap.${c.reset}`);
}

if (dryRun) {
  say("");
  say(`${c.dim}--dry-run: the server was only read from. Nothing pulled, built or restarted.${c.reset}`);
  process.exit(0);
}

if (!assumeYes) {
  if (!process.stdin.isTTY) die("Nothing to read the confirmation from.", "Pass --yes if you meant to run this unattended.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`\nDeploy to ${c.bold}production${c.reset}? ${c.dim}[y/N]${c.reset} `)).trim().toLowerCase();
  rl.close();
  if (answer !== "y" && answer !== "yes") {
    say("Nothing done.");
    process.exit(0);
  }
}

// ── pull and build ────────────────────────────────────────────────────────
const DEPLOY = String.raw`
set -euo pipefail
cd "$1"
step() { printf "\n\033[1m▸ %s\033[0m\n" "$1"; }

step "pull $2"
git pull --ff-only origin "$2"
git --no-pager log -1 --pretty="  now at %h %s"

mkdir -p backend/logs rentals-web/logs

if [ "$3" = "1" ]; then
  if [ "$4" = "1" ]; then
    step "backend: install"
    cd backend && yarn install --frozen-lockfile && cd ..
  fi
  step "backend: build"
  cd backend && yarn build && cd ..
fi

if [ "$5" = "1" ]; then
  if [ "$6" = "1" ]; then
    step "web: install"
    cd rentals-web && npm ci && cd ..
  fi
  step "web: build"
  # Clear the ISR cache first. A rebuild alone leaves it in place, and a
  # prerendered page keeps being served with the OLD markup: a deploy that
  # changes metadata or structured data appears to do nothing, which cost an
  # hour of confusion the first time it happened.
  rm -rf rentals-web/.next/cache
  cd rentals-web && npm run build && cd ..
fi
`;

const on = (yes) => (yes ? "1" : "0");
const buildCode = await sshStream(DEPLOY, [
  DIR,
  branch,
  on(backendChanged),
  on(installBackend),
  on(webChanged),
  on(installWeb),
]);

if (buildCode !== 0) {
  say("");
  die(
    "Build failed, nothing was restarted.",
    "The old processes are still running and still serving, so the site is unchanged.",
    'If the failure was a bare "Killed", it ran out of memory: add swap on the droplet.',
  );
}

if (selected.length === 0) {
  say("");
  say(`${c.green}Pulled.${c.reset} ${c.dim}Nothing server-side changed, so nothing was restarted.${c.reset}`);
  process.exit(0);
}

// ── restart ───────────────────────────────────────────────────────────────
// The dump is copied first because it is the only record of what PM2 should
// be running, and it is one bad `pm2 save` away from being rewritten.
const RESTART = String.raw`
set -euo pipefail
cd "$1"
step() { printf "\n\033[1m▸ %s\033[0m\n" "$1"; }

step "pm2"
[ -f /root/.pm2/dump.pm2 ] && cp -a /root/.pm2/dump.pm2 "/root/.pm2/dump.pm2.$(date +%Y%m%d-%H%M%S)" || true
pm2 startOrRestart ecosystem.config.js --only "$2" --update-env
pm2 save --force
pm2 list --no-color | grep -E "musafir|status" || true
`;

const restartCode = await sshStream(RESTART, [DIR, selected.map((app) => app.name).join(",")]);
if (restartCode !== 0) die("PM2 refused to restart.", `ssh ${HOST} 'pm2 list && pm2 logs --lines 40 --nostream'`);

// ── did it actually come back? ────────────────────────────────────────────
// "pm2 restarted it" and "it is serving" are different claims, and only the
// second one is the deploy being over.
const HEALTH = String.raw`
set -uo pipefail
name="$1"; port="$2"; path="$3"; min="$4"; max="$5"
i=0
code=000
while [ "$i" -lt 20 ]; do
  code=$(curl -s -o /dev/null -m 5 -w "%{http_code}" "http://127.0.0.1:$port$path" 2>/dev/null || true)
  # A refused connection makes curl print 000 AND exit non-zero; anything that
  # is not a bare number would blow up the numeric test below.
  case "$code" in ''|*[!0-9]*) code=000 ;; esac
  if [ "$code" -ge "$min" ] && [ "$code" -le "$max" ]; then
    printf "  \033[32m✓\033[0m %-20s HTTP %s\n" "$name" "$code"
    exit 0
  fi
  i=$((i+1))
  sleep 2
done
printf "  \033[31m✗\033[0m %-20s HTTP %s after 40s\n" "$name" "$code"
pm2 logs "$name" --lines 40 --nostream --no-color 2>&1 | tail -40
exit 1
`;

say("");
say(`${c.bold}▸ health${c.reset}`);
let healthy = true;
for (const app of selected) {
  const isBackend = app.kind === "backend";
  const code = await sshStream(HEALTH, [
    app.name,
    String(app.port),
    isBackend ? "/health" : "/",
    "200",
    // The web app answers `/` with a 307 to the login page, a redirect is a
    // healthy Next server. Only 5xx means it came back broken.
    isBackend ? "200" : "499",
  ]);
  if (code !== 0) healthy = false;
}

say("");
if (!healthy) {
  say(`${c.red}Deployed, but something is not answering.${c.reset}`);
  say(`  ${c.dim}ssh ${HOST} 'pm2 logs --lines 100 --nostream'${c.reset}`);
  say(`  ${c.dim}Roll back with: ssh ${HOST} 'cd ${DIR} && git reset --hard ${remoteHead.slice(0, 7)}' then deploy again${c.reset}`);
  process.exit(1);
}

say(`${c.green}${c.bold}Deployed.${c.reset} ${remoteHead.slice(0, 7)} → ${target.slice(0, 7)} ${c.dim}(${selected.map((a) => a.name).join(", ")})${c.reset}`);
say(`  ${c.dim}https://musafircars.com · https://api.musafircars.com${c.reset}`);
