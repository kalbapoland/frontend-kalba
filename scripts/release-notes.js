#!/usr/bin/env node
/**
 * Release notes generator — what happened between two releases.
 *
 * Usage:
 *   node scripts/release-notes.js                    # previous release tag -> current release tag
 *   node scripts/release-notes.js v0.1.0..v0.2.0     # explicit range
 *   node scripts/release-notes.js --release v0.2.0    # previous tag -> this release tag
 *   node scripts/release-notes.js --since v0.1.0     # start tag -> current release tag
 *   node scripts/release-notes.js --commits          # commits grouped by priority
 *   node scripts/release-notes.js --short            # mechanical draft (max 500 chars)
 *   node scripts/release-notes.js --json             # machine-readable
 *
 * Source of data: git commit titles between two tags. Classification follows
 * the repo's commit convention (already in practice):
 *   feat:  Features
 *   task:  Tasks
 *   fix:   Bug Fixes
 *   rest:  Other Changes (chore/docs/ci/refactor/perf/test)
 *
 * Merge commits are skipped as note sources; work commits carry the changes.
 * PR numbers found in commit subjects are linked at the end of each entry.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const args = process.argv.slice(2);
const wantJson = args.includes("--json");
const wantCommits = args.includes("--commits");
const wantShort = args.includes("--short");
const rangeArg = args.find((a) => !a.startsWith("--") && a.includes(".."));
const SHORT_LIMIT = 500;
const SHORT_OVERFLOW_LINE = "- More improvements in the full changelog.";

function validateArgs() {
  const flags = args.filter((arg) => arg.startsWith("--"));
  const knownFlags = new Set(["--json", "--commits", "--short", "--since", "--release"]);
  const outputModes = ["--json", "--commits", "--short"].filter((flag) => args.includes(flag));
  const sinceIndexes = args.flatMap((arg, index) => (arg === "--since" ? [index] : []));
  const releaseIndexes = args.flatMap((arg, index) => (arg === "--release" ? [index] : []));
  const ranges = args.filter((arg) => !arg.startsWith("--") && arg.includes(".."));
  const sinceValue = sinceIndexes.length === 1 ? args[sinceIndexes[0] + 1] : null;
  const releaseValue = releaseIndexes.length === 1 ? args[releaseIndexes[0] + 1] : null;
  const allowedValues = new Set([rangeArg, sinceValue, releaseValue].filter(Boolean));

  if (flags.some((flag) => !knownFlags.has(flag))) {
    die(`Unknown option: ${flags.find((flag) => !knownFlags.has(flag))}`);
  }
  if (outputModes.length > 1) {
    die("Choose only one output mode: --commits, --short, or --json.");
  }
  if (sinceIndexes.length > 1 || releaseIndexes.length > 1) {
    die("Use --since or --release at most once.");
  }
  if (sinceIndexes.length === 1 && (!sinceValue || sinceValue.startsWith("--"))) {
    die("--since requires an existing vX.Y.Z release tag.");
  }
  if (releaseIndexes.length === 1 && (!releaseValue || releaseValue.startsWith("--"))) {
    die("--release requires an existing vX.Y.Z release tag.");
  }
  if (
    [rangeArg, sinceValue, releaseValue].filter(Boolean).length > 1
  ) {
    die("Use only one of an explicit range, --since, or --release.");
  }
  if (ranges.length > 1) {
    die("Pass only one explicit release-tag range.");
  }
  if (args.some((arg) => !arg.startsWith("--") && !allowedValues.has(arg))) {
    die("Unexpected positional argument. Pass a vX.Y.Z..vA.B.C tag range.");
  }
}

function die(message) {
  console.error(`[release-notes] ${message}`);
  process.exit(1);
}

function git(gitArgs) {
  const result = spawnSync("git", gitArgs, { cwd: root, encoding: "utf8" });

  if (result.error) {
    die(`Could not run git: ${result.error.message}`);
  }

  if (result.status !== 0) {
    die(`git ${gitArgs.join(" ")} failed: ${(result.stderr ?? "").trim()}`);
  }

  return result.stdout;
}

/** Release tags are stable semantic versions created by version-bump.js. */
function readReleaseTags() {
  return git(["tag", "--list", "v*", "--sort=-v:refname"])
    .split("\n")
    .map((tag) => tag.trim())
    .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag));
}

/** Select a release-tag range; never compare a release with HEAD. */
function resolveRange() {
  const tags = readReleaseTags();

  if (tags.length === 0) {
    die("No version tags found. Tag a release first (git tag v0.1.0).");
  }

  if (rangeArg) {
    return validateReleaseRange(rangeArg, tags);
  }

  const releaseIdx = args.indexOf("--release");
  if (releaseIdx !== -1) {
    const targetTag = args[releaseIdx + 1];
    if (!tags.includes(targetTag)) {
      die("--release requires an existing vX.Y.Z release tag.");
    }
    const previousTag = tags[tags.indexOf(targetTag) + 1];
    if (!previousTag) {
      die(`Release tag ${targetTag} has no previous version tag.`);
    }
    return `${previousTag}..${targetTag}`;
  }

  const sinceIdx = args.indexOf("--since");
  if (sinceIdx !== -1) {
    const startTag = args[sinceIdx + 1];
    if (!startTag || !tags.includes(startTag)) {
      die("--since requires an existing vX.Y.Z release tag.");
    }

    const tagsAtHead = new Set(
      git(["tag", "--points-at", "HEAD"]).split("\n").map((tag) => tag.trim()),
    );
    const currentReleaseTag = tags.find((tag) => tagsAtHead.has(tag)) ?? tags[0];
    return validateReleaseRange(`${startTag}..${currentReleaseTag}`, tags);
  }

  const tagsAtHead = new Set(
    git(["tag", "--points-at", "HEAD"]).split("\n").map((tag) => tag.trim()),
  );
  const currentReleaseTag = tags.find((tag) => tagsAtHead.has(tag)) ?? tags[0];
  const previousReleaseTag = tags[tags.indexOf(currentReleaseTag) + 1];
  if (!previousReleaseTag) {
    die(
      `Release tag ${currentReleaseTag} has no previous version tag. Pass an explicit range between two release tags.`,
    );
  }

  return `${previousReleaseTag}..${currentReleaseTag}`;
}

function validateReleaseRange(range, tags) {
  const parts = range.split("..");
  if (parts.length !== 2 || !tags.includes(parts[0]) || !tags.includes(parts[1])) {
    die("Release notes require a range between two existing vX.Y.Z tags.");
  }

  if (tags.indexOf(parts[0]) <= tags.indexOf(parts[1])) {
    die("The start release tag must be older than the end release tag.");
  }

  return range;
}

/** Skip merge commits; keep (hash, subject) of real work. */
function readCommits(range) {
  const raw = git(["log", "--no-merges", "--pretty=format:%h%x09%s", range]).split("\n");

  return raw
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash, ...subjectParts] = line.split("\t");
      return { hash: hash.trim(), subject: subjectParts.join("\t").trim() };
    })
    .filter(({ subject }) => !/^chore(?:\([^)]*\))?!?:\s*bump version to\b/i.test(subject));
}

/** PR number from conventional subjects like "fix: … (#123)" or "(PR #123)". */
function extractPr(subject) {
  const m = subject.match(/\(#(\d+)\)/) ?? subject.match(/\bPR #(\d+)\b/);
  return m ? Number(m[1]) : null;
}

/** Classification by the repo's commit-message convention. */
const SECTIONS = [
  { key: "feat", title: "Features", prefixes: ["feat", "feature"] },
  { key: "task", title: "Tasks", prefixes: ["task", "tasks"] },
  { key: "fix", title: "Bug Fixes", prefixes: ["fix", "bugfix", "bug"] },
  { key: "other", title: "Other Changes", prefixes: [] }, // always last
];

function commitType(subject) {
  const match = subject.match(/^([a-z][a-z0-9-]*)(?:\([^)]*\))?!?:/i);
  return match ? match[1].toLowerCase() : "";
}

function classify(subject) {
  const type = commitType(subject);
  const section = SECTIONS.find((s) => s.prefixes.includes(type));
  return section ? section.key : "other";
}

// Changelog scopes such as (android-build) add no value to product-facing notes.
function humanize(subject) {
  return subject
    .replace(/^[a-z][a-z0-9-]*(?:\([^)]*\))?!?:\s*/i, "")
    .replace(/\s*\((?:PR )?#\d+\)\s*$/i, "");
}

function formatCommit({ hash, subject }) {
  return `- \`${hash}\` ${subject}`;
}

function capitalize(text) {
  const humanized = humanize(text);
  const firstChar = humanized.charAt(0).toUpperCase();
  return firstChar + humanized.slice(1);
}

function formatShortEntry(commit) {
  return capitalize(commit.subject);
}

function formatMarkdownEntry({ subject }) {
  const pr = extractPr(subject);
  const text = capitalize(subject);
  return pr ? `${text} ([#${pr}](https://github.com/kalbapoland/frontend-kalba/pull/${pr}))` : text;
}

function formatShortNotes(bulletLines) {
  if (bulletLines.length === 0) {
    return "- No feature or bug-fix commits in this release.\n";
  }

  const complete = `${bulletLines.join("\n")}\n`;
  if (complete.length <= SHORT_LIMIT) return complete;

  const selected = [];
  for (const line of bulletLines) {
    const candidate = [...selected, line, SHORT_OVERFLOW_LINE].join("\n") + "\n";
    if (candidate.length > SHORT_LIMIT) break;
    selected.push(line);
  }

  if (selected.length === 0) {
    const maxBulletLength = SHORT_LIMIT - SHORT_OVERFLOW_LINE.length - 2;
    const truncated = `${bulletLines[0].slice(0, maxBulletLength - 1)}…`;
    return `${truncated}\n${SHORT_OVERFLOW_LINE}\n`;
  }

  return [...selected, SHORT_OVERFLOW_LINE].join("\n") + "\n";
}

function main() {
  validateArgs();
  const range = resolveRange();
  process.stderr.write(`[release-notes] range: ${range}\n`);
  const commits = readCommits(range);

  if (commits.length === 0) {
    if (wantJson) {
      const emptyBuckets = { feat: [], task: [], fix: [], other: [] };
      process.stdout.write(
        JSON.stringify({ range, commits: emptyBuckets }, null, 2) + "\n",
      );
    } else if (wantShort) {
      process.stdout.write(formatShortNotes([]));
    } else {
      console.log(`No commits in range ${range}.`);
    }
    return;
  }

  const buckets = { feat: [], task: [], fix: [], other: [] };
  for (const commit of commits) {
    buckets[classify(commit.subject)].push(commit);
  }

  if (wantJson) {
    process.stdout.write(
      JSON.stringify({ range, commits: buckets }, null, 2) + "\n",
    );
    return;
  }

  if (wantCommits) {
    const lines = [`## Commits by priority (${range})`, ""];

    for (const section of SECTIONS) {
      if (buckets[section.key].length === 0) continue;

      lines.push(`### ${section.title}`, "");
      for (const commit of buckets[section.key]) {
        lines.push(formatCommit(commit));
      }
      lines.push("");
    }

    process.stdout.write(lines.join("\n").trimEnd() + "\n");
    return;
  }

  if (wantShort) {
    // Raw commit subjects may expose internal work; rewrite before publishing.
    const bulletLines = [
      ...buckets.feat.map((c) => `- ${formatShortEntry(c)}`),
      ...buckets.fix.map((c) => `- ${formatShortEntry(c)}`),
    ];
    process.stdout.write(formatShortNotes(bulletLines));
    return;
  }

  const lines = [`## Changes (${range})`, ""];

  for (const section of SECTIONS) {
    if (buckets[section.key].length === 0) continue;

    lines.push(`### ${section.title}`, "");
    for (const commit of buckets[section.key]) {
      lines.push(`- ${formatMarkdownEntry(commit)}`);
    }
    lines.push("");
  }

  process.stdout.write(lines.join("\n"));
}

main();