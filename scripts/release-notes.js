#!/usr/bin/env node
/**
 * Release notes generator — what happened between two releases.
 *
 * Usage:
 *   node scripts/release-notes.js                    # last tag -> HEAD
 *   node scripts/release-notes.js v0.1.0..HEAD       # explicit range
 *   node scripts/release-notes.js --since v0.1.0     # same as range
 *   node scripts/release-notes.js --short            # store-friendly (500 chars)
 *   node scripts/release-notes.js --json             # machine-readable
 *
 * Source of data: git commit titles between two tags. Classification follows
 * the repo's commit convention (already in practice):
 *   feat:  Features
 *   fix:   Bug Fixes
 *   rest:  Other Changes (chore/docs/ci/refactor/perf/test)
 *
 * Merge commits are skipped as note sources — the PR-title commits inside
 * them carry the actual work. PR numbers are extracted from branch/merge
 * lines and linked at the end of each entry.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const args = process.argv.slice(2);
const wantJson = args.includes("--json");
const wantShort = args.includes("--short");
const rangeArg = args.find((a) => !a.startsWith("--") && a.includes(".."));

function die(message) {
  console.error(`[release-notes] ${message}`);
  process.exit(1);
}

function git(gitArgs) {
  const result = spawnSync("git", gitArgs, { cwd: root, encoding: "utf8" });

  if (result.status !== 0) {
    die(`git ${gitArgs.join(" ")} failed: ${result.stderr.trim()}`);
  }

  return result.stdout;
}

/** Resolve the range: explicit, --since, or last tag -> HEAD. */
function resolveRange() {
  if (rangeArg) return rangeArg;

  const sinceIdx = args.indexOf("--since");
  if (sinceIdx !== -1 && args[sinceIdx + 1]) {
    return `${args[sinceIdx + 1]}..HEAD`;
  }

  const tags = git(["tag", "--list", "--sort=-v:refname"]).split("\n").map((t) => t.trim()).filter(Boolean);

  if (tags.length === 0) {
    die("No git tags found. Tag a release first (git tag v0.1.0).");
  }

  return `${tags[0]}..HEAD`;
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
    });
}

/** PR number from conventional subjects like "fix: … (#123)" or "(PR #123)". */
function extractPr(subject) {
  const m = subject.match(/\(#(\d+)\)/) ?? subject.match(/\bPR #(\d+)\b/);
  return m ? Number(m[1]) : null;
}

/** Classification by the repo's commit-message convention. */
const SECTIONS = [
  { key: "feat", title: "Features", prefixes: ["feat", "feature"] },
  { key: "fix", title: "Bug Fixes", prefixes: ["fix", "bugfix"] },
  { key: "other", title: "Other Changes", prefixes: [] }, // always last
];

function classify(subject) {
  const type = subject.toLowerCase().split(":")[0].trim();
  const section = SECTIONS.find((s) => s.prefixes.includes(type));
  return section ? section.key : "other";
}

/** Drop the type prefix + scope for the human-readable bullet. */
function humanize(subject) {
  return subject
    .replace(/^[a-z]+(\([^)]*\))?:\s*/i, "")
    .replace(/\s*\(#\d+\)\s*$/, "");
}

// Changelog scope markers like (android-build) add no value for end users;
// keeping them out makes the notes read product-side.
function formatEntry({ hash, subject }, short) {
  const pr = extractPr(subject);
  const text = humanize(subject);
  const firstChar = text.charAt(0).toUpperCase();
  const capitalized = firstChar + text.slice(1);

  if (short) {
    return capitalized;
  }

  return pr ? `${capitalized} ([#${pr}](https://github.com/kalbapoland/frontend-kalba/pull/${pr}))` : capitalized;
}

function main() {
  const range = resolveRange();
  const commits = readCommits(range);

  if (commits.length === 0) {
    console.log(`No commits in range ${range}.`);
    return;
  }

  const buckets = { feat: [], fix: [], other: [] };
  for (const commit of commits) {
    buckets[classify(commit.subject)].push(commit);
  }

  if (wantJson) {
    process.stdout.write(
      JSON.stringify({ range, commits: buckets }, null, 2) + "\n",
    );
    return;
  }

  const lines = [`## Changes (${range})`, ""];

  if (wantShort) {
    // Google Play "release notes" field has a 500-character cap; keep each
    // bullet to one line, features first.
    const bulletLines = [
      ...buckets.feat.map((c) => `- ${formatEntry(c, true)}`),
      ...buckets.fix.map((c) => `- ${formatEntry(c, true)}`),
    ];
    const joined = [];
    let budget = 480;

    for (const line of bulletLines) {
      if (budget - line.length <= 0) {
        joined.push("- More improvements in the full changelog.");
        break;
      }
      joined.push(line);
      budget -= line.length;
    }

    process.stdout.write(joined.join("\n") + "\n");
    return;
  }

  for (const section of SECTIONS) {
    if (buckets[section.key].length === 0) continue;

    lines.push(`### ${section.title}`, "");
    for (const commit of buckets[section.key]) {
      lines.push(`- ${formatEntry(commit, false)}`);
    }
    lines.push("");
  }

  process.stdout.write(lines.join("\n"));
}

main();