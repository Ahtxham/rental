#!/usr/bin/env node
/**
 * Copy the production database down to this machine.
 *
 *   npm run db:pull
 *   npm run db:pull -- --replace          make local EXACTLY production, nothing else
 *   npm run db:pull -- --dry-run          show what would be copied
 *   npm run db:pull -- --from-file=backups/prod-....archive.gz   restore a snapshot you already have
 *
 * Note the `--` before the flags. `npm run db:pull --replace` hands the flag to
 * npm, not to this script, and npm silently expands it to something else
 * entirely (`--replace-registry-host`), so the run looks normal and the flag
 * does nothing at all.
 *
 * Data moves in exactly one direction. There is no flag, no environment
 * variable and no argument that makes this write to the server, and the
 * destination is refused unless it is on localhost, a script that can
 * overwrite production by way of a typo should not exist, and the guard is
 * cheaper than the incident.
 *
 * The order is: back up what you have, download, then restore. Each step is a
 * file on disk rather than a pipe, so a dropped connection costs you a retry
 * instead of a half-replaced database, and the snapshot is still there
 * afterwards, `--from-file` replays it without touching the server again.
 *
 * The production connection string never leaves the server. It is read inside
 * the remote shell, used there, and never printed; only the database name
 * comes back, which is not a secret.
 *
 * One thing to be conscious of: this puts real driver records, names, CNICs,
 * phone numbers, licence document URLs, on a laptop. That is a reasonable
 * thing to do to debug a real bug, and worth remembering before the laptop
 * goes anywhere.
 */
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, statSync, createWriteStream } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(HERE, "..");
const BACKUP_DIR = resolve(REPO_DIR, "backups");

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

const dryRun = has("dry-run");
const assumeYes = has("yes") || args.includes("-y");
const skipBackup = has("no-backup");
const replace = has("replace");
const fromFile = flag("from-file");

// ── where it lands ────────────────────────────────────────────────────────
const localUri =
  flag("to") ??
  (() => {
    const envFile = resolve(REPO_DIR, "backend/.env");
    if (!existsSync(envFile)) die("backend/.env not found, nothing tells me which local database to write to.");
    const match = readFileSync(envFile, "utf8").match(/^\s*DB_URI\s*=\s*(.+)$/m);
    if (!match) die("backend/.env has no DB_URI.");
    return match[1].trim();
  })();

const parseUri = (uri) => {
  // mongodb+srv:// has no port, and the URL parser rejects the scheme, so the
  // host and database come out by hand.
  const withoutScheme = uri.replace(/^mongodb(\+srv)?:\/\//, "");
  const afterCredentials = withoutScheme.includes("@") ? withoutScheme.slice(withoutScheme.indexOf("@") + 1) : withoutScheme;
  const [hostPart, ...rest] = afterCredentials.split("/");
  return {
    host: hostPart.split(",")[0].split(":")[0],
    database: (rest.join("/") || "").split("?")[0],
  };
};

const local = parseUri(localUri);

/**
 * The only guard that really matters.
 *
 * Everything below restores with --drop. Pointed at anything but this machine,
 * that is not a database copy, it is a database replacement, and the fleet
 * would be running on last week's data before anyone noticed. There is
 * deliberately no override.
 */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);
if (!LOOPBACK.has(local.host)) {
  die(
    `Refusing to restore into a non-local database (${local.host}).`,
    "This script only ever writes to localhost. If you meant a different local",
    "database, name it: npm run db:pull -- --to=mongodb://localhost:27017/other",
  );
}
if (!local.database) die(`No database name in the destination URI (${local.host}).`);

// ── tools ─────────────────────────────────────────────────────────────────
for (const tool of ["mongodump", "mongorestore"]) {
  try {
    execFileSync(tool, ["--version"], { stdio: "ignore" });
  } catch {
    die(`\`${tool}\` is not installed.`, "brew install mongodb-database-tools");
  }
}

// ── what production is holding ────────────────────────────────────────────
// DB_URI is read, used and discarded inside this shell. Only the database name
// and a few counts come back over the wire.
const REMOTE_INFO = String.raw`
set -euo pipefail
DB_URI=$(grep -E '^DB_URI=' "$1/backend/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
if [ -z "$DB_URI" ]; then echo "backend/.env on the server has no DB_URI" >&2; exit 1; fi
DB=$(printf '%s' "$DB_URI" | sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')
echo "::DB::$DB"
mongosh "$DB_URI" --quiet --eval 'print("::COUNTS::" + JSON.stringify({collections: db.getCollectionNames().length, drivers: db.drivers.estimatedDocumentCount(), cars: db.cars.estimatedDocumentCount(), shifts: db.shifts.estimatedDocumentCount()}))'
`;

const sshBase = ["-o", "ConnectTimeout=10", "-T", HOST, "bash", "-s", "--"];

let remoteDatabase = flag("source-db");
let counts;
if (!fromFile) {
  let info;
  try {
    info = execFileSync("ssh", [...sshBase, DIR], { input: REMOTE_INFO, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] });
  } catch {
    die(`Could not read the database on ${HOST}.`, `ssh ${HOST} 'ls ${DIR}/backend/.env'`);
  }
  remoteDatabase = remoteDatabase ?? (info.match(/^::DB::(.+)$/m) ?? [])[1];
  const rawCounts = (info.match(/::COUNTS::(\{.*\})/) ?? [])[1];
  if (rawCounts) counts = JSON.parse(rawCounts);
  if (!remoteDatabase) die("Could not work out the production database name.");
}

// ── show the plan ─────────────────────────────────────────────────────────
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
const snapshot = fromFile
  ? isAbsolute(fromFile)
    ? fromFile
    : resolve(REPO_DIR, fromFile)
  : resolve(BACKUP_DIR, `prod-${remoteDatabase}-${stamp}.archive.gz`);

if (fromFile && !existsSync(snapshot)) die(`No such snapshot: ${fromFile}`);

say("");
say(`${c.bold}Production → this machine${c.reset}`);
if (fromFile) {
  say(`  source       ${c.dim}${snapshot.replace(REPO_DIR + "/", "")} (${(statSync(snapshot).size / 1024 / 1024).toFixed(1)} MB)${c.reset}`);
} else {
  say(`  source       ${HOST} ${c.dim}·${c.reset} ${remoteDatabase}`);
  if (counts) {
    say(
      `               ${c.dim}${counts.collections} collections · ${counts.drivers} drivers · ${counts.cars} cars · ${counts.shifts} shifts${c.reset}`,
    );
  }
}
say(
  `  destination  ${c.bold}${local.host}/${local.database}${c.reset} ${c.yellow}(${
    replace ? "dropped and replaced" : "collections overwritten"
  })${c.reset}`,
);
if (!skipBackup) say(`  safety net   ${c.dim}backups/local-${local.database}-${stamp}.archive.gz${c.reset}`);

/**
 * `mongorestore --drop` drops only what the archive contains.
 *
 * That is the honest behaviour and not the one people assume: a collection you
 * have locally that production does not, left over from a migration you tried,
 * or a model you renamed, survives a "fresh" pull untouched and goes on
 * answering queries as though it belonged there. `--replace` drops the whole
 * database first, so what is left afterwards is exactly production and nothing
 * else.
 */
say("");
say(
  replace
    ? `  ${c.dim}The whole database is dropped first, so anything you have locally that\n  production does not goes with it.${c.reset}`
    : `  ${c.dim}Collections present in production are dropped and rewritten. Anything you have\n  locally that production does not is left alone, pass --replace to clear those too.${c.reset}`,
);
if (replace && skipBackup) {
  say("");
  say(`  ${c.red}--replace --no-backup: the local database is being deleted with nothing kept.${c.reset}`);
}

if (dryRun) {
  say("");
  say(`${c.dim}--dry-run: nothing dumped, downloaded or restored.${c.reset}`);
  process.exit(0);
}

if (!assumeYes) {
  if (!process.stdin.isTTY) die("Nothing to read the confirmation from.", "Pass --yes if you meant to run this unattended.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const question = replace
    ? `\nDrop ${c.bold}${local.database}${c.reset} on this machine and replace it with production? ${c.dim}[y/N]${c.reset} `
    : `\nReplace ${c.bold}${local.database}${c.reset} on this machine? ${c.dim}[y/N]${c.reset} `;
  const answer = (await rl.question(question))
    .trim()
    .toLowerCase();
  rl.close();
  if (answer !== "y" && answer !== "yes") {
    say("Nothing done.");
    process.exit(0);
  }
}

mkdirSync(BACKUP_DIR, { recursive: true });

const step = (label) => {
  say("");
  say(`${c.bold}▸ ${label}${c.reset}`);
};

const wait = (child) => new Promise((done) => child.on("exit", (code) => done(code ?? 1)));

// ── 1. keep what is already here ──────────────────────────────────────────
if (!skipBackup) {
  step(`backing up ${local.database}`);
  const target = resolve(BACKUP_DIR, `local-${local.database}-${stamp}.archive.gz`);
  const code = await wait(
    spawn("mongodump", [`--uri=${localUri}`, "--archive=" + target, "--gzip", "--quiet"], { stdio: "inherit" }),
  );
  if (code !== 0) {
    die(
      "Could not back up the local database, stopping before anything is overwritten.",
      "Is mongod running?  brew services start mongodb-community",
    );
  }
  say(`  ${c.green}✓${c.reset} ${target.replace(REPO_DIR + "/", "")} ${c.dim}(${(statSync(target).size / 1024).toFixed(0)} KB)${c.reset}`);
}

// ── 2. dump production, straight into a local file ────────────────────────
const REMOTE_DUMP = String.raw`
set -euo pipefail
DB_URI=$(grep -E '^DB_URI=' "$1/backend/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
if [ -z "$DB_URI" ]; then echo "backend/.env on the server has no DB_URI" >&2; exit 1; fi
mongodump --uri="$DB_URI" --archive --gzip --quiet
`;

if (!fromFile) {
  step(`dumping ${remoteDatabase} from ${HOST}`);
  const ssh = spawn("ssh", [...sshBase, DIR], { stdio: ["pipe", "pipe", "inherit"] });
  ssh.stdin.end(REMOTE_DUMP);
  ssh.stdout.pipe(createWriteStream(snapshot));
  const code = await wait(ssh);
  if (code !== 0) die("The dump failed. Nothing local has been touched yet.");
  const size = statSync(snapshot).size;
  if (size === 0) die("The dump came back empty.", "Nothing local has been touched yet.");
  say(`  ${c.green}✓${c.reset} ${snapshot.replace(REPO_DIR + "/", "")} ${c.dim}(${(size / 1024 / 1024).toFixed(1)} MB)${c.reset}`);
}

// ── 3. clear the way, if asked ────────────────────────────────────────────
/**
 * Dropping the database needs a driver, not a shell tool.
 *
 * `mongorestore` has no "drop everything first" option, only `--drop`, which
 * is per-collection and per-archive, and `mongosh` is a separate install most
 * machines here do not have. The mongodb driver is already in
 * `backend/node_modules`, and this script already reads `backend/.env` for the
 * connection string, so reaching for it adds no assumption that was not
 * already being made.
 */
let droppedNames = [];
let restored;
if (replace) {
  step(`dropping ${local.database}`);

  const require = createRequire(resolve(REPO_DIR, "backend/package.json"));
  let MongoClient;
  try {
    ({ MongoClient } = require("mongodb"));
  } catch {
    die(
      "--replace needs the mongodb driver, and it is not installed.",
      "It lives in backend/node_modules, cd backend && yarn install",
      skipBackup ? "Nothing has been touched." : "Your backup is already written; nothing else has been touched.",
    );
  }

  const client = new MongoClient(localUri);
  try {
    await client.connect();
    const database = client.db(local.database);
    droppedNames = (await database.listCollections({}, { nameOnly: true }).toArray()).map((entry) => entry.name);
    await database.dropDatabase();
  } catch (error) {
    die(
      `Could not drop ${local.database}.`,
      String(error?.message ?? error).trim(),
      "Is mongod running? Nothing has been restored, so the database is as you left it.",
    );
  } finally {
    await client.close().catch(() => {});
  }

  say(`  ${c.green}✓${c.reset} ${droppedNames.length} collection(s) dropped`);
}

// ── 4. restore it ─────────────────────────────────────────────────────────
step(`restoring into ${local.database}`);

// The archive remembers the database it came from, so a rename is needed
// whenever the two are not called the same thing, which here is always:
// production is `musafir` and the local copy is `musafir_live`.
const renaming = Boolean(remoteDatabase && remoteDatabase !== local.database);

/**
 * A renaming restore must be given a URI with NO database in it.
 *
 * mongorestore reads the database out of the URI path as `--db`, and `--db`
 * together with `--nsFrom/--nsTo` is a combination it accepts, warns about in
 * one deprecation line, and then silently ignores: "0 document(s) restored
 * successfully", exit status 0. Every check below it passes, "Done." prints,
 * and the local database is left exactly as stale as it was, which is the
 * whole failure this script exists to prevent, wearing a green tick.
 */
const uriWithoutDatabase = (uri) => {
  const scheme = (uri.match(/^mongodb(\+srv)?:\/\//) ?? [""])[0];
  const rest = uri.slice(scheme.length);
  const split = rest.includes("@") ? rest.indexOf("@") + 1 : 0;
  const credentials = rest.slice(0, split);
  const tail = rest.slice(split);
  const slash = tail.indexOf("/");
  if (slash === -1) return uri; // no database in it to begin with
  const query = tail.includes("?") ? tail.slice(tail.indexOf("?")) : "";
  return `${scheme}${credentials}${tail.slice(0, slash)}/${query}`;
};

const restoreArgs = [
  `--uri=${renaming ? uriWithoutDatabase(localUri) : localUri}`,
  `--archive=${snapshot}`,
  "--gzip",
  "--drop",
  "--quiet",
];
if (renaming) restoreArgs.push("--nsFrom", `${remoteDatabase}.*`, "--nsTo", `${local.database}.*`);

const restoreCode = await wait(spawn("mongorestore", restoreArgs, { stdio: "inherit" }));

say("");
if (restoreCode !== 0) {
  die(
    "The restore failed.",
    skipBackup
      ? "You ran with --no-backup, so there is no local snapshot to fall back on."
      : `Put your old data back with:\n  mongorestore --uri=${localUri} --archive=backups/local-${local.database}-${stamp}.archive.gz --gzip --drop`,
  );
}

/**
 * Did anything actually land?
 *
 * mongorestore can exit 0 having restored nothing, that is exactly how the
 * `--db` + `--nsFrom` collision above went unnoticed. Exit status is not
 * evidence that a copy happened, so this asks the database instead, and says so
 * rather than printing a green tick over an empty restore.
 */
try {
  const require = createRequire(resolve(REPO_DIR, "backend/package.json"));
  const { MongoClient } = require("mongodb");
  const client = new MongoClient(localUri);
  await client.connect();
  restored = (await client.db(local.database).listCollections({}, { nameOnly: true }).toArray()).map((e) => e.name);
  await client.close();
} catch {
  // Best effort. Failing to verify is not the same as failing to restore.
}

if (restored?.length === 0) {
  die(
    `mongorestore reported success but ${local.database} is empty.`,
    `The snapshot is still at ${snapshot.replace(REPO_DIR + "/", "")}, so nothing is lost.`,
    remoteDatabase && remoteDatabase !== local.database
      ? `Try it by hand:\n  mongorestore --uri=mongodb://${local.host} --archive=${snapshot.replace(REPO_DIR + "/", "")} --gzip --drop --nsFrom '${remoteDatabase}.*' --nsTo '${local.database}.*'`
      : "Check that mongod is running and that the archive is not truncated.",
  );
}

say(`${c.green}${c.bold}Done.${c.reset} ${local.database} is now a copy of production${
  restored ? `, ${restored.length} collections` : ""
}.`);

// The point of --replace, stated as a fact rather than a promise: these are the
// collections that were here, are not in production, and are now gone.
if (replace && droppedNames.length > 0 && restored) {
  const now = new Set(restored);
  const removed = droppedNames.filter((name) => !now.has(name));
  if (removed.length > 0) {
    say(`  ${c.dim}not in production, so removed: ${removed.join(", ")}${c.reset}`);
  }
}
say(`  ${c.dim}snapshot kept at ${snapshot.replace(REPO_DIR + "/", "")}, replay it with --from-file=${c.reset}`);
say(`  ${c.dim}restart the backend so it is not holding stale cached documents${c.reset}`);
