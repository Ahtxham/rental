#!/usr/bin/env node
/**
 * Run Musafir in one terminal: the API and the website.
 *
 *   npm run dev
 *   npm run dev -- --only=backend
 *   npm run dev -- --only=web
 *
 * Preflight first, because the two fail in very different ways and a wall of
 * interleaved stack traces is the worst place to work out which one broke.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const c = {
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};
const say = (m = "") => console.log(m);
const ok = (m) => say(`  ${c.green}✓${c.reset} ${m}`);
const warn = (m) => say(`  ${c.yellow}!${c.reset} ${m}`);
const bad = (m) => say(`  ${c.red}✗${c.reset} ${m}`);

const args = process.argv.slice(2);
const only = args
  .find((a) => a.startsWith("--only="))
  ?.slice("--only=".length)
  .split(",")
  .map((s) => s.trim());
const wanted = (name) => (only ? only.includes(name) : true);

const readEnv = (file) => {
  const env = {};
  if (!existsSync(resolve(ROOT, file))) return env;
  for (const line of readFileSync(resolve(ROOT, file), "utf8").split("\n")) {
    if (line.trim().startsWith("#")) continue;
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
};

const portOpen = (port) =>
  new Promise((done) => {
    const socket = createConnection({ port, host: "127.0.0.1" });
    socket.setTimeout(400);
    socket.on("connect", () => (socket.destroy(), done(true)));
    socket.on("timeout", () => (socket.destroy(), done(false)));
    socket.on("error", () => done(false));
  });

say();
say(`${c.bold}Musafir${c.reset} ${c.dim}, starting the stack${c.reset}`);
say();

let fatal = false;

const backendEnv = readEnv("backend/.env");
const webEnv = readEnv("rentals-web/.env");
const BE_PORT = Number(backendEnv.PORT) || 5012;

if (wanted("backend")) {
  if (!existsSync(resolve(ROOT, "backend/.env"))) {
    bad("backend/.env is missing, copy backend/.env.example and fill it in.");
    fatal = true;
  } else if ((backendEnv.JWT_SECRET ?? "").length < 32) {
    bad("backend/.env JWT_SECRET must be at least 32 characters, the server refuses to boot.");
    fatal = true;
  } else {
    ok(`backend/.env looks sane (port ${BE_PORT})`);
  }

  if (!backendEnv.PUBLIC_AGENCY_ID) {
    // Not fatal: the API runs fine, the public site simply answers 404 for
    // every car. Worth saying out loud, because "why is the site empty" is
    // otherwise a twenty-minute hunt.
    warn("PUBLIC_AGENCY_ID is unset, musafircars.com will show no cars. Run `yarn seed:agency`.");
  }

  if (await portOpen(BE_PORT)) {
    bad(`port ${BE_PORT} is already in use, something else is running the API.`);
    fatal = true;
  }
}

if (wanted("web")) {
  if (!existsSync(resolve(ROOT, "rentals-web/node_modules"))) {
    bad("rentals-web/node_modules is missing, run `cd rentals-web && npm install`.");
    fatal = true;
  } else {
    ok(`rentals-web ready (API at ${webEnv.API_URL || `http://localhost:${BE_PORT}`})`);
  }
}

if (fatal) {
  say();
  say(`${c.red}Fix the above and run again.${c.reset}`);
  say();
  process.exit(1);
}

say();

const procs = [];
const start = (name, colour, cwd, command, cmdArgs, env = {}) => {
  const child = spawn(command, cmdArgs, {
    cwd: resolve(ROOT, cwd),
    shell: false,
    // A PORT inherited from whatever launched this would silently take
    // precedence over each project's own .env, dotenv never overwrites an
    // existing variable, and both halves would fight for one port. So each
    // child is told its port outright.
    env: { ...process.env, ...env },
  });
  const tag = `${colour}${name.padEnd(7)}${c.reset} ${c.dim}|${c.reset} `;
  const pipe = (stream) => {
    stream.setEncoding("utf8");
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) say(tag + line);
    });
  };
  pipe(child.stdout);
  pipe(child.stderr);
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) say(`${tag}${c.red}exited with ${code}${c.reset}`);
  });
  procs.push(child);
};

if (wanted("backend")) start("api", c.cyan, "backend", "yarn", ["dev"], { PORT: String(BE_PORT) });
if (wanted("web")) start("web", c.magenta, "rentals-web", "npm", ["run", "dev"], { PORT: "" });

// One Ctrl-C should take both down, not orphan the one that did not get it.
const stop = () => {
  for (const child of procs) child.kill("SIGTERM");
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
