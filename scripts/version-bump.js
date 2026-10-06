#!/usr/bin/env node
/**
 * Version bump — single source of truth sync.
 *
 * Usage:
 *   node scripts/version-bump.js <major|minor|patch> [--commit]
 *   node scripts/version-bump.js --set X.Y.Z [--commit]   (direct set)
 *
 * Updates, in one pass:
 *   - app.config.js  `version: "X.Y.Z"`    (read by expo-constants / the app UI)
 *   - package.json   "version"             (npm convention)
 *   - android/app/build.gradle `versionCode` (+1 every bump; local builds bypass
 *     EAS remote versioning, so Android MUST see a strictly increasing code)
 *     and `versionName "X.Y.Z"` — what the OS shows and what expo-application
 *     reads for the in-app version footer.
 *   - ios/Kalba/Info.plist `CFBundleShortVersionString` and
 *     ios/Kalba.xcodeproj/project.pbxproj `MARKETING_VERSION` — iOS native
 *     project (EAS uses the value found in native code, not the manifest);
 *     also bumps `CURRENT_PROJECT_VERSION` to stay ahead of/aligned with the
 *     EAS remote build number so autoIncrement never regresses.
 *
 * `--commit` creates a standalone `chore: bump version to X.Y.Z` commit —
 * version bumps never ride along in feature PRs (branch-protection friendly).
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const [firstArg, ...rest] = process.argv.slice(2);
const doCommit = rest.includes("--commit");

// --set X.Y.Z: direct version set (pre-release resets, e.g. 1.2.0 -> 0.1.0).
let bumpArg;
const setMatch = firstArg === "--set" ? rest[0] : null;
if (setMatch) {
  if (!/^\d+\.\d+\.\d+$/.test(setMatch)) {
    console.error("[version-bump] --set expects X.Y.Z, got:", setMatch);
    process.exit(1);
  }
  bumpArg = setMatch;
} else {
  bumpArg = firstArg;
}
const directSet = Boolean(setMatch);

if (!bumpArg || !(["major", "minor", "patch"].includes(bumpArg) || directSet)) {
  console.error("Usage: node scripts/version-bump.js <major|minor|patch> [--commit]");
  console.error("       node scripts/version-bump.js --set X.Y.Z [--commit]");
  process.exit(1);
}

const root = path.join(__dirname, "..");
const appConfigPath = path.join(root, "app.config.js");
const packageJsonPath = path.join(root, "package.json");
const buildGradlePath = path.join(root, "android", "app", "build.gradle");
// Real case-sensitive paths (EAS/Linux builds resolve them strictly).
const iosPlistPath = path.join(root, "ios", "Kalba", "Info.plist");
const iosPbxprojPath = path.join(root, "ios", "Kalba.xcodeproj", "project.pbxproj");

function readCurrentVersion() {
  const config = fs.readFileSync(appConfigPath, "utf8");
  const match = config.match(/version:\s*"(\d+)\.(\d+)\.(\d+)"/);

  if (!match) {
    throw new Error('app.config.js: cannot find version: "X.Y.Z"');
  }

  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

/**
 * Reads the EAS remote iOS build number (server truth when
 * appVersionSource: remote). Unreachable/stale info must not block the
 * bump — we only use it to keep the local pbxproj counter from regressing.
 */
function readRemoteIosBuildNumber() {
  try {
    const { execFileSync } = require("child_process");
    const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
    const out = execFileSync(cmd, ["eas-cli", "build:version:get", "-p", "ios", "--non-interactive"], {
      cwd: root,
      encoding: "utf8",
      timeout: 120_000,
      shell: true,
    });
    const m = out.match(/iOS buildNumber\s*-\s*(\d+)/);
    return m ? Number(m[1]) : null;
  } catch (error) {
    console.warn(`[version-bump] Could not read remote iOS build number (${String(error.message).split("\n")[0]}); using local counter only.`);
    return null;
  }
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
  const next = directSet
    ? (bumpArg.match(/(\d+)\.(\d+)\.(\d+)/).slice(1).map(Number))
      .reduce((acc, n, i) => ({ ...acc, [["major", "minor", "patch"][i]]: n }), {})
    : bump(current, bumpArg);
  const nextStr = format(next);
  const gradleMatch = fs.readFileSync(buildGradlePath, "utf8").match(/versionCode\s+(\d+)/);
  const nextVersionCode = gradleMatch ? Number(gradleMatch[1]) + 1 : 1;
  const remoteIosBuildNumber = readRemoteIosBuildNumber();

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

  // iOS native project — EAS builds with a bare ios/ directory read the
  // version from native code, ignoring the app.config.js manifest value.
  // Both files must carry the marketing version; CURRENT_PROJECT_VERSION
  // advances with every bump so local Xcode builds align with EAS remote
  // build numbers (autoIncrement never regresses below this).
  let plist = fs.readFileSync(iosPlistPath, "utf8");
  plist = replaceLast(
    plist,
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)\d+\.\d+\.\d+(<\/string>)/,
    `$1${nextStr}$2`,
  );
  fs.writeFileSync(iosPlistPath, plist);

  let pbxproj = fs.readFileSync(iosPbxprojPath, "utf8");
  const buildMatch = pbxproj.match(/CURRENT_PROJECT_VERSION = (\d+);/);
  if (!buildMatch) {
    throw new Error("project.pbxproj: cannot find CURRENT_PROJECT_VERSION");
  }

  const counters = [Number(buildMatch[1]), remoteIosBuildNumber].filter((n) => Number.isFinite(n));
  const nextBuildNumber = Math.max(...counters) + 1;
  // pbxproj repeats MARKETING_VERSION/CURRENT_PROJECT_VERSION per build
  // configuration (Debug/Release) — every occurrence must carry the same
  // values, so this is an all-occurrences replace (unlike the others).
  pbxproj = pbxproj.replace(/MARKETING_VERSION = \d+(\.\d+)*;/g, `MARKETING_VERSION = ${nextStr};`);
  pbxproj = pbxproj.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${nextBuildNumber};`);
  fs.writeFileSync(iosPbxprojPath, pbxproj);

  console.log(`[version-bump] ${previous} -> ${nextStr}  (versionCode ${nextVersionCode}, iOS build ${nextBuildNumber})`);

  if (!doCommit) {
    console.log("[version-bump] Files updated (no commit — pass --commit to create one).");
    return;
  }

  // Stand-alone chore commit keeps feature PRs clean.
  const commit = spawnSync("git", ["add", "app.config.js", "package.json", "android/app/build.gradle", "ios/Kalba/Info.plist", "ios/Kalba.xcodeproj/project.pbxproj"], { cwd: root, stdio: "inherit" });
  if (commit.status !== 0) process.exit(commit.status ?? 1);

  const message = `chore: bump version to ${nextStr}`;
  const run = spawnSync("git", ["commit", "-m", message], { cwd: root, stdio: "inherit" });
  if (run.status !== 0) process.exit(run.status ?? 1);

  console.log(`[version-bump] Committed: ${message}`);
}

try {
  main();
} catch (error) {
  console.error(`[version-bump] FAILED: ${error.message}`);
  process.exit(1);
}