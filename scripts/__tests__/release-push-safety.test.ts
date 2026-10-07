import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function gitEnvironment(globalConfig: string): NodeJS.ProcessEnv {
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) {
    if (key.startsWith("GIT_")) delete environment[key];
  }

  return {
    ...environment,
    GIT_CONFIG_GLOBAL: globalConfig,
    GIT_CONFIG_NOSYSTEM: "1",
  };
}

function runGit(repository: string, args: string[], globalConfig: string): string {
  const result = spawnSync("git", args, {
    cwd: repository,
    encoding: "utf8",
    env: gitEnvironment(globalConfig),
  });

  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }

  return result.stdout.trim();
}

function documentedPushArgs(
  document: string,
  command: string,
  variables: Record<string, string>,
): string[] {
  const documentedCommand = document
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line === command);
  if (!documentedCommand) {
    throw new Error(`Could not find documented command: ${command}`);
  }

  return documentedCommand
    .replace(/^git\s+/, "")
    .split(/\s+/)
    .map((argument) => {
      const variable = /^\$(\w+)$/.exec(argument);
      if (!variable) return argument;

      const value = variables[variable[1]];
      if (!value) throw new Error(`Missing value for $${variable[1]}`);
      return value;
    });
}

describe("release tag push safety", () => {
  jest.setTimeout(30000);

  test("documented pushes do not follow other tags when push.followTags is enabled", () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "kalba-release-push-safety-"),
    );
    const repository = join(temporaryDirectory, "repository");
    const remote = join(temporaryDirectory, "origin.git");
    const globalConfig = join(temporaryDirectory, "empty-global-gitconfig");
    const releaseBranch = "release/0.2.0";
    const targetTag = "v0.3.0";
    const variables = { releaseBranch, targetTag };
    const runbook = readFileSync(
      join(__dirname, "..", "..", "docs", "BUILDING_WITH_EAS.md"),
      "utf8",
    );
    const skill = readFileSync(
      join(__dirname, "..", "AIAgents", "Shared", "skills", "make-release.md"),
      "utf8",
    );

    mkdirSync(repository);
    writeFileSync(globalConfig, "");

    try {
      runGit(temporaryDirectory, ["init", "--bare", remote], globalConfig);
      runGit(repository, ["init"], globalConfig);
      runGit(repository, ["checkout", "-b", "main"], globalConfig);
      runGit(repository, ["config", "user.name", "Release Push Test"], globalConfig);
      runGit(
        repository,
        ["config", "user.email", "release-push@example.com"],
        globalConfig,
      );
      runGit(repository, ["config", "push.followTags", "true"], globalConfig);
      runGit(repository, ["remote", "add", "origin", remote], globalConfig);
      runGit(repository, ["checkout", "-b", releaseBranch], globalConfig);
      writeFileSync(join(repository, "history.txt"), "release\n");
      runGit(repository, ["add", "history.txt"], globalConfig);
      runGit(repository, ["commit", "-m", "chore: prepare release"], globalConfig);
      runGit(repository, ["tag", "-a", "v0.2.0", "-m", "Abandoned release"], globalConfig);

      runGit(
        repository,
        documentedPushArgs(
          runbook,
          "git push --set-upstream --no-follow-tags origin $releaseBranch",
          variables,
        ),
        globalConfig,
      );
      expect(runGit(repository, ["ls-remote", "--tags", "--refs", "origin"], globalConfig))
        .toBe("");

      runGit(
        repository,
        documentedPushArgs(
          runbook,
          "git push --no-follow-tags origin --delete $releaseBranch",
          variables,
        ),
        globalConfig,
      );
      expect(
        runGit(
          repository,
          ["ls-remote", "--heads", "--tags", "--refs", "origin"],
          globalConfig,
        ),
      ).toBe("");

      runGit(repository, ["tag", "-a", "v0.2.1", "-m", "Unverified tag"], globalConfig);
      runGit(repository, ["tag", "-a", targetTag, "-m", "Verified target"], globalConfig);
      runGit(
        repository,
        documentedPushArgs(
          runbook,
          "git push --no-follow-tags origin $targetTag",
          variables,
        ),
        globalConfig,
      );

      const remoteTags = runGit(
        repository,
        ["ls-remote", "--tags", "--refs", "origin"],
        globalConfig,
      )
        .split("\n")
        .map((line) => line.split("\t")[1])
        .sort();
      expect(remoteTags).toEqual([`refs/tags/${targetTag}`]);
      expect(skill).toContain("git push --no-follow-tags origin $targetTag");
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true, maxRetries: 3 });
    }
  });
});
