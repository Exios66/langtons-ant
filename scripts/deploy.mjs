#!/usr/bin/env node
/**
 * Branch-based GitHub Pages publisher — no GitHub Actions deployment.
 *
 * Flow: build dist/ (must exist or pass --build), publish it as the root of
 * the `gh-pages` branch via a temporary worktree, push, clean up. Configure
 * the repo once: Settings -> Pages -> Source: "Deploy from a branch",
 * branch gh-pages, folder / (root).
 *
 * Works with an uncommitted working tree (nothing on the current branch is
 * stashed or touched) because the publish writes happen in the worktree only.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const BRANCH = "gh-pages";
const WORKTREE = path.join(ROOT, ".gh-pages-worktree");

function git(...argv) {
  const last = argv[argv.length - 1];
  const opts = last && typeof last === "object" && !Array.isArray(last) ? argv.pop() : {};
  const args = argv.length === 1 && Array.isArray(argv[0]) ? argv[0] : argv;
  return execFileSync("git", args, {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  })
    .toString()
    .trim();
}

const headMsg = git("log", "-1", "--format=%h %s");
console.log(`publishing dist/ from HEAD (${headMsg})`);

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error("dist/index.html missing — run `npm run build` first (or `npm run deploy`).");
  process.exit(1);
}

// Clean any stale worktree from a previous failed run.
try {
  git("worktree", "remove", "--force", WORKTREE);
} catch {
  /* absent or not a worktree */
}
fs.rmSync(WORKTREE, { recursive: true, force: true });

// Start from the remote gh-pages if it exists, else an orphan history.
let haveRemote = false;
try {
  git("fetch", "--quiet", "origin", BRANCH);
  haveRemote = true;
} catch {
  console.log(`no remote ${BRANCH} branch yet — starting fresh history`);
}
try {
  if (haveRemote) {
    git("worktree", "add", WORKTREE, `origin/${BRANCH}`);
  } else {
    git("worktree", "add", "--orphan", "-b", BRANCH, WORKTREE);
  }
} catch (err) {
  console.error(`worktree setup failed: ${err.message}`);
  process.exit(1);
}

const wtGit = (...args) => git(args, { cwd: WORKTREE });

// Replace worktree contents (except git's own .git file) with dist/.
for (const entry of fs.readdirSync(WORKTREE)) {
  if (entry === ".git") continue;
  fs.rmSync(path.join(WORKTREE, entry), { recursive: true, force: true });
}
fs.cpSync(DIST, WORKTREE, { recursive: true });

// Nojekyll keeps underscore-prefixed asset dirs (Vite bundles) servable.
fs.writeFileSync(path.join(WORKTREE, ".nojekyll"), "");

wtGit("add", "-A");

const status = wtGit("status", "--porcelain");
if (status.length === 0) {
  console.log("gh-pages is already up to date — nothing to publish.");
} else {
  wtGit(
    "-c",
    "user.name=langtons-ant deploy",
    "-c",
    "user.email=deploy@exios66.invalid",
    "commit",
    "-m",
    `publish ${new Date().toISOString()} from ${headMsg.split(" ")[0]}`,
  );
  wtGit("push", "origin", "HEAD:refs/heads/" + BRANCH);
  console.log(`published to ${BRANCH} (push succeeded).`);
}

try {
  git("worktree", "remove", "--force", WORKTREE);
} catch {
  fs.rmSync(WORKTREE, { recursive: true, force: true });
}
console.log("done.");
