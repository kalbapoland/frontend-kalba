import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sourceScript = join(__dirname, "..", "release-notes.js");

function gitEnvironment(repository: string): NodeJS.ProcessEnv {
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) {
    if (key.startsWith("GIT_")) delete environment[key];
  }

  return {
    ...environment,
    GIT_CONFIG_GLOBAL: join(repository, ".empty-global-gitconfig"),
    GIT_CONFIG_NOSYSTEM: "1",
  };
}

function runGit(repository: string, args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: repository,
    encoding: "utf8",
    env: gitEnvironment(repository),
  });

  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }

  return result.stdout.trim();
}

function createRepository(): string {
  const repository = mkdtempSync(join(tmpdir(), "kalba-release-notes-"));
  mkdirSync(join(repository, "scripts"));
  writeFileSync(join(repository, ".empty-global-gitconfig"), "");
  copyFileSync(sourceScript, join(repository, "scripts", "release-notes.js"));
  runGit(repository, ["init"]);
  runGit(repository, ["checkout", "-b", "main"]);
  runGit(repository, ["config", "user.name", "Release Notes Test"]);
  runGit(repository, ["config", "user.email", "release-notes@example.com"]);
  return repository;
}

function tagRelease(repository: string, tag: string): void {
  runGit(repository, ["tag", "-a", tag, "-m", `Release ${tag}`]);
}

function commit(repository: string, subject: string): void {
  appendFileSync(join(repository, "history.txt"), `${subject}\n`);
  runGit(repository, ["add", "history.txt"]);
  runGit(repository, ["commit", "-m", subject]);
}

function runReleaseNotes(repository: string, args: string[]): string {
  const result = spawnSync(
    process.execPath,
    [join(repository, "scripts", "release-notes.js"), ...args],
    { cwd: repository, encoding: "utf8", env: gitEnvironment(repository) },
  );

  if (result.status !== 0) {
    throw new Error(`release-notes.js failed: ${result.stderr}`);
  }

  return result.stdout;
}

function withRepository(run: (repository: string) => void): void {
  const repository = createRepository();
  try {
    run(repository);
  } finally {
    rmSync(repository, { recursive: true, force: true, maxRetries: 3 });
  }
}

describe("release notes", () => {
  jest.setTimeout(30000);

  test("orders commits by priority between the previous and current release tags", () => {
    withRepository((repository) => {
      commit(repository, "feat: previous release");
      tagRelease(repository, "v0.1.0");
      commit(repository, "feat: add workshop reminders");
      commit(repository, "fix: handle expired sessions");
      commit(repository, "task: prepare tester checklist");
      commit(repository, "chore: update build pipeline");
      commit(repository, "chore: bump version to 0.2.0");
      tagRelease(repository, "v0.2.0");

      const output = runReleaseNotes(repository, ["--commits"]);
      const releaseOutput = runReleaseNotes(repository, [
        "--release",
        "v0.2.0",
        "--commits",
      ]);
      const subjects = [
        "feat: add workshop reminders",
        "task: prepare tester checklist",
        "fix: handle expired sessions",
        "chore: update build pipeline",
      ];
      const positions = subjects.map((subject) => output.indexOf(subject));
      const sections = [
        "### Features",
        "### Tasks",
        "### Bug Fixes",
        "### Other Changes",
      ].map((section) => output.indexOf(section));

      expect(output).toContain("## Commits by priority (v0.1.0..v0.2.0)");
      expect(positions.every((position) => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((left, right) => left - right));
      expect(sections.every((position) => position >= 0)).toBe(true);
      expect(sections).toEqual([...sections].sort((left, right) => left - right));
      for (let i = 0; i < positions.length; i += 1) {
        expect(positions[i]).toBeGreaterThan(sections[i]);
        if (i + 1 < sections.length) {
          expect(positions[i]).toBeLessThan(sections[i + 1]);
        }
      }
      expect(output).not.toContain("chore: bump version to 0.2.0");
      expect(releaseOutput).toContain(
        "## Commits by priority (v0.1.0..v0.2.0)",
      );
    });
  });

  test("uses the latest two release tags even when HEAD has untagged commits", () => {
    withRepository((repository) => {
      commit(repository, "feat: initial release");
      tagRelease(repository, "v0.1.0");
      commit(repository, "feat: add workshop reminders");
      tagRelease(repository, "v0.2.0");
      commit(repository, "task: untagged follow-up");

      const output = runReleaseNotes(repository, ["--commits"]);
      const sinceOutput = runReleaseNotes(repository, [
        "--since",
        "v0.1.0",
        "--commits",
      ]);

      expect(output).toContain("## Commits by priority (v0.1.0..v0.2.0)");
      expect(output).toContain("feat: add workshop reminders");
      expect(output).not.toContain("task: untagged follow-up");
      expect(sinceOutput).toContain("## Commits by priority (v0.1.0..v0.2.0)");
      expect(() =>
        runReleaseNotes(repository, ["v0.1.0..HEAD", "--commits"]),
      ).toThrow("Release notes require a range between two existing vX.Y.Z tags.");
    });
  });

  test("uses the latest two release tags when HEAD only adds a merge commit", () => {
    withRepository((repository) => {
      commit(repository, "feat: previous release");
      tagRelease(repository, "v0.1.0");
      runGit(repository, ["checkout", "-b", "release"]);
      commit(repository, "feat: add workshop reminders");
      commit(repository, "chore: bump version to 0.2.0");
      tagRelease(repository, "v0.2.0");
      runGit(repository, ["checkout", "-b", "main-after-release", "v0.1.0"]);
      runGit(repository, ["merge", "--no-ff", "release", "-m", "Merge release v0.2.0"]);

      const output = runReleaseNotes(repository, ["--commits"]);

      expect(output).toContain("## Commits by priority (v0.1.0..v0.2.0)");
      expect(output).toContain("feat: add workshop reminders");
      expect(output).not.toContain("chore: bump version to 0.2.0");
    });
  });

  test("uses the release tag at HEAD even when a newer tag exists", () => {
    withRepository((repository) => {
      commit(repository, "feat: first release");
      tagRelease(repository, "v0.1.0");
      commit(repository, "feat: middle release");
      tagRelease(repository, "v0.2.0");
      commit(repository, "feat: latest release");
      tagRelease(repository, "v0.3.0");
      runGit(repository, ["checkout", "--detach", "v0.2.0"]);

      const output = runReleaseNotes(repository, ["--commits"]);

      expect(output).toContain("## Commits by priority (v0.1.0..v0.2.0)");
      expect(output).toContain("feat: middle release");
      expect(output).not.toContain("feat: latest release");
    });
  });

  test("renders the default markdown with a cleaned title and PR link", () => {
    withRepository((repository) => {
      commit(repository, "feat: previous release");
      tagRelease(repository, "v0.1.0");
      commit(repository, "feat(android-build): add workshop reminders (#123)");
      tagRelease(repository, "v0.2.0");

      const output = runReleaseNotes(repository, []);

      expect(output).toContain(
        "- Add workshop reminders ([#123](https://github.com/kalbapoland/frontend-kalba/pull/123))",
      );
      expect(output).not.toContain("feat(android-build)");
    });
  });

  test("rejects invalid tag ranges, since tags, and conflicting options", () => {
    withRepository((repository) => {
      commit(repository, "feat: previous release");
      tagRelease(repository, "v0.1.0");
      commit(repository, "feat: current release");
      tagRelease(repository, "v0.2.0");

      expect(() =>
        runReleaseNotes(repository, ["v0.2.0..v0.1.0", "--commits"]),
      ).toThrow("The start release tag must be older than the end release tag.");
      expect(() =>
        runReleaseNotes(repository, ["v0.2.0..v0.2.0", "--commits"]),
      ).toThrow("The start release tag must be older than the end release tag.");
      expect(() =>
        runReleaseNotes(repository, ["--since", "v9.9.9", "--commits"]),
      ).toThrow("--since requires an existing vX.Y.Z release tag.");
      expect(() =>
        runReleaseNotes(repository, ["--release", "v9.9.9", "--commits"]),
      ).toThrow("--release requires an existing vX.Y.Z release tag.");
      expect(() =>
        runReleaseNotes(repository, ["--comits"]),
      ).toThrow("Unknown option: --comits");
      expect(() =>
        runReleaseNotes(repository, ["--short", "--commits"]),
      ).toThrow("Choose only one output mode");
    });
  });

  test("fails clearly with no previous release tag", () => {
    withRepository((repository) => {
      commit(repository, "feat: initial release");
      tagRelease(repository, "v0.1.0");

      expect(() => runReleaseNotes(repository, ["--commits"])).toThrow(
        "Release tag v0.1.0 has no previous version tag.",
      );
    });
  });

  test("rejects a repository with no version tags", () => {
    withRepository((repository) => {
      expect(() => runReleaseNotes(repository, ["--commits"])).toThrow(
        "No version tags found.",
      );
    });
  });

  test("keeps the complete short output within the 500-character limit", () => {
    withRepository((repository) => {
      commit(repository, "feat: previous release");
      tagRelease(repository, "v0.1.0");
      for (let i = 0; i < 12; i += 1) {
        commit(
          repository,
          `feat: improve workshop reminders and session scheduling flow ${i}`,
        );
      }
      tagRelease(repository, "v0.2.0");

      const output = runReleaseNotes(repository, ["--short"]);
      const lines = output.trimEnd().split("\n");

      expect(output.length).toBeLessThanOrEqual(500);
      expect(lines).toHaveLength(8);
      expect(lines[0]).toContain("flow 11");
      expect(lines[6]).toContain("flow 5");
      expect(lines[7]).toBe("- More improvements in the full changelog.");
    });
  });

  test("truncates a first short bullet that cannot fit beside the overflow line", () => {
    withRepository((repository) => {
      commit(repository, "feat: previous release");
      tagRelease(repository, "v0.1.0");
      commit(repository, `feat: ${"x".repeat(600)}`);
      tagRelease(repository, "v0.2.0");

      const output = runReleaseNotes(repository, ["--short"]);
      const lines = output.trimEnd().split("\n");

      expect(output.length).toBeLessThanOrEqual(500);
      expect(lines).toHaveLength(2);
      expect(lines[0].length).toBeGreaterThan(2);
      expect(lines[0].endsWith("…")).toBe(true);
      expect(lines[1]).toBe("- More improvements in the full changelog.");
    });
  });

  test("prints a non-empty fallback when a release has no feature or fix commits", () => {
    withRepository((repository) => {
      commit(repository, "feat: previous release");
      tagRelease(repository, "v0.1.0");
      commit(repository, "task: update tester checklist");
      commit(repository, "chore: update build pipeline");
      tagRelease(repository, "v0.2.0");

      const output = runReleaseNotes(repository, ["--short"]);

      expect(output).toBe("- No feature or bug-fix commits in this release.\n");
      expect(output.length).toBeLessThanOrEqual(500);
    });
  });

  test("short notes include features before fixes and omit tasks and chores", () => {
    withRepository((repository) => {
      commit(repository, "feat: previous release");
      tagRelease(repository, "v0.1.0");
      commit(repository, "chore: internal build setup");
      commit(repository, "fix: repair session handling");
      commit(repository, "task: update test checklist");
      commit(repository, "feat: add workshop reminders");
      tagRelease(repository, "v0.2.0");

      const output = runReleaseNotes(repository, ["--short"]);

      expect(output.indexOf("Add workshop reminders")).toBeLessThan(
        output.indexOf("Repair session handling"),
      );
      expect(output).not.toContain("test checklist");
      expect(output).not.toContain("internal build setup");
    });
  });

  test("returns valid empty JSON and short output when a range only has a bump", () => {
    withRepository((repository) => {
      commit(repository, "feat: previous release");
      tagRelease(repository, "v0.1.0");
      commit(repository, "chore: bump version to 0.2.0");
      tagRelease(repository, "v0.2.0");

      const json = JSON.parse(runReleaseNotes(repository, ["--json"]));
      const short = runReleaseNotes(repository, ["--short"]);

      expect(json).toEqual({
        range: "v0.1.0..v0.2.0",
        commits: { feat: [], task: [], fix: [], other: [] },
      });
      expect(short).toBe("- No feature or bug-fix commits in this release.\n");
    });
  });
});
