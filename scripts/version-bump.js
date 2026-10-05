#!/usr/bin/env node
/**
 * Version bump — single source of truth sync.
 *
 * Usage: node scripts/version-bump.js <major|minor|patch| current-version> [--commit]
 *
 * Updates, in one pass:
 *   - app.config.js  `version: "X.Y.Z"`    (read by expo-constants / the app UI)
 *   - package.json   "version"             (npm convention)
 *   - android/app/build.gradle `versionCode` (+1 every bump; local builds bypass
 *     EAS remote versioning, so Android MUST see a strictly increasing code)
 *     and `versionName "X.Y.Z"` — what the OS shows and what expo-application
 *     reads for the in-app version footer.
 *
 * `--commit` creates a standalone `chore: bump version to X.Y.Z` commit —
 * version bumps never ride along in feature PRs (branch-protection friendly).
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const [bumpArg, ...rest] = process.argv.slice(2);
const doCommit = rest.includes("--commit");

if (!bumpArg || !["major", "minor", "patch"].includes(bumpArg)) {
  console.error("Usage: node scripts/version-bump.js <major|minor|patch> [--commit]");
  process.exit(1);
}

const root = path.join(__dirname, "..");
const appConfigPath = path.join(root, "app.config.js");
const packageJsonPath = path.join(root, "package.json");
const buildGradlePath = path.join(root, "android", "app", "build.gradle");

function readCurrentVersion() {
  const config = fs.readFileSync(appConfigPath, "utf8");
  const match = config.match(/version:\s*"(\d+)\.(\d+)\.(\d+)"/);

  if (!match) {
    throw new Error('app.config.js: cannot find version: "X.Y.Z"');
  }

  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function bump({ major, minor, patch }, part) {
  if (part === "major") return { major: major + 1, minor: 0, patch: 0 };
  if (part === "minor") return { major, minor: minor + 1, patch: 0 };
  return { major, minor, patch: patch + 1 };
}

function format(v) {
  return `${v.major}.${v.minor}.${v.patch}`;
}

function replaceLast(content, regex, replacement) {
  // One deterministic replacement per file — a second match means the file
  // drifted from the expected shape and must be fixed by hand.
  const matches = content.match(new RegExp(regex.source, regex.flags + "g"));

  if (!matches || matches.length !== 1) {
    throw new Error(`Expected exactly one match of ${regex.source} — found ${matches ? matches.length : 0}`);
  }

  return content.replace(regex, replacement);
}

function main() {
  const current = readCurrentVersion();
  const previous = format(current);
  const next = bump(current, bumpArg);
  const nextStr = format(next);
  const gradleMatch = fs.readFileSync(buildGradlePath, "utf8").match(/versionCode\s+(\d+)/);
  const nextVersionCode = gradleMatch ? Number(gradleMatch[1]) + 1 : 1;

  // app.config.js — the source the app and expo-constants read.
  let appConfig = fs.readFileSync(appConfigPath, "utf8");
  appConfig = replaceLast(appConfig, /version:\s*"\d+\.\d+\.\d+"/, `version: "${nextStr}"`);
  fs.writeFileSync(appConfigPath, appConfig);

  // package.json — sync npm convention (two bytes: "version": "X.Y.Z").
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  pkg.version = nextStr;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n");

  // build.gradle — versionCode must strictly increase for Android updates,
  // and versionName MUST match the app version: it is what the OS app
  // settings page shows and what expo-application reads (`Application.
  // nativeApplicationVersion` — the value the new version UI displays).
  let gradle = fs.readFileSync(buildGradlePath, "utf8");
  gradle = replaceLast(gradle, /versionCode\s+\d+/, `versionCode ${nextVersionCode}`);
  gradle = replaceLast(gradle, /versionName\s+"\d+\.\d+\.\d+"/, `versionName "${nextStr}"`);
  fs.writeFileSync(buildGradlePath, gradle);

  console.log(`[version-bump] ${previous} -> ${nextStr}  (versionCode ${nextVersionCode})`);

  if (!doCommit) {
    console.log("[version-bump] Files updated (no commit — pass --commit to create one).");
    return;
  }

  // Stand-alone chore commit keeps feature PRs clean.
  const commit = spawnSync("git", ["add", "app.config.js", "package.json", "android/app/build.gradle"], { cwd: root, stdio: "inherit", shell: true });
  if (commit.status !== 0) process.exit(commit.status ?? 1);

  const message = `chore: bump version to ${nextStr}`;
  const run = spawnSync("git", ["commit", "-m", message], { cwd: root, stdio: "inherit", shell: true });
  if (run.status !== 0) process.exit(run.status ?? 1);

  console.log(`[version-bump] Committed: ${message}`);
}

try {
  main();
} catch (error) {
  console.error(`[version-bump] FAILED: ${error.message}`);
  process.exit(1);
}