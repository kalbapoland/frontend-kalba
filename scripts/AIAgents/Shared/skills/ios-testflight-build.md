# iOS TestFlight Build

Use this skill when the user wants to ship a new iOS build to TestFlight.

## Goal

- Create an EAS iOS **release** build (profile `release`: store distribution, **dev options enabled**).
- EAS auto-increments the build number (remote source) — no local edits.
- Submit it straight to TestFlight in "Ready to Test" state.
- Prefer the user/tester summary from `/make-release` for "What to Test";
  `release:notes:short` is only a raw draft and must be reviewed and rewritten
  under the public-summary rules before sharing.

## Version + release notes (before building)

This skill is build/submit-only. For a new release, use `/make-release` or
follow [docs/BUILDING_WITH_EAS.md](../../../../docs/BUILDING_WITH_EAS.md) §3.0
through the version bump, release-branch push, and release-PR merge; the tag
is pushed only after merge. Never run
`version-bump.js` or create tags here. On a re-entry, use the existing pushed
tag and release PR URL, and skip all version-changing steps. If either is
unknown, ask the user; do not guess.

## Preconditions

1. Run in the `frontend` repository root.
2. The worktree must be clean. Workflow step 0 fetches the target tag from
   `origin` and switches to its detached commit. If any check fails, stop; do
   not ask the user to override it.
3. User is logged into Expo account (`npx eas-cli whoami`).
   - If no user is returned, instruct user to run `npx eas-cli login` in their own terminal and stop.
4. EAS `production` environment contains required variables:
   - `EXPO_PUBLIC_API_URL_NATIVE`
   - `EXPO_PUBLIC_API_URL_WEB`
   - `EXPO_PUBLIC_EAS_PROJECT_ID`
   - Google OAuth client IDs if the app uses Google sign-in.
## Workflow

0. Use the already released `$targetTag` and merged `$releasePrUrl`. If either
   is unavailable, ask the user instead of bumping another version. Execute
   the gate-only procedure in [docs/BUILDING_WITH_EAS.md](../../../../docs/BUILDING_WITH_EAS.md)
   §3.0 step 4a; it verifies origin, PR state, clean checkout and EAS release
   configuration, then leaves HEAD detached at the tag. Do not copy a second
   gate implementation here.

```powershell
npm run release:notes -- --release $targetTag --commits
npm run release:notes:short -- --release $targetTag
```

Verify the printed range is previous-tag → `$targetTag`. Inspect and rewrite the
`--short` raw draft under the public-summary rules before showing it to the
user; never publish commit subjects as-is.

1. Build iOS app for store distribution (dev options enabled).

```bash
npx eas-cli build -p ios --profile release --non-interactive --no-wait
```

- Profile `release` = store distribution + `EXPO_PUBLIC_APP_VARIANT=test`.
- ONLY for the final store release (dev options OFF) use `--profile production`.
- EAS reads the iOS buildNumber from its server (remote source), increments, and bakes the new value into the IPA. No source file edits needed.
- Build typically takes 15-30 min. Print the build URL to the user immediately after the command returns; do not tail logs.
- Capture the build ID from build output for submit step.
- If build status is `errored` or `canceled`, do NOT proceed to submit. Print the build URL and error excerpt, then ask the user how to proceed.

2. Submit the built artifact to TestFlight.

```bash
npx eas-cli submit -p ios --id <build-id>
```

- Always pass the explicit `--id <build-id>` captured for this tagged build.
  Never use `--latest`. If the ID is missing, run
  `npx eas-cli build:list -p ios --limit 5`, match the build's commit/version
  to `$targetTag`, and ask the user if the match is ambiguous.
- After processing, paste the user/tester summary from `/make-release` into
  App Store Connect's "What to Test" field and ask the user to confirm it was
  saved. If using this skill alone, review and rewrite `--short` under the
  public-summary rules before asking the user to paste it. Never publish raw
  commit subjects. Do not pass free-form summary text as a native command-line
  argument.
- Keep submit interactive by default (do not force `--non-interactive`) because first-run ASC auth may require prompts.
- ASC Export Compliance is pre-declared via `ITSAppUsesNonExemptEncryption: false` in `app.config.js`, so the build skips "Missing Compliance" and goes straight to "Ready to Test".

3. Report output links.

- Build URL (`expo.dev/accounts/.../builds/...`)
- IPA artifact URL (`expo.dev/artifacts/...ipa`)
- TestFlight URL (`https://appstoreconnect.apple.com/apps/6761315112/testflight/ios`)
- Note expected processing time (Apple usually 5-10 min after submit).

## Common Failure Fixes

Restart from workflow step 0 before every new build. Never resume a failed build
by editing or building from the tagged checkout.

1. `Build number N has already been used` (during submit)
- Means EAS's remote counter is behind App Store Connect (e.g. someone uploaded N from another machine, or the seeding value was wrong). Bump the server counter past whatever ASC saw:
  ```bash
  npx eas-cli build:version:set -p ios
  ```
  Ask the user to enter a value higher than the last used build number. This
  changes only EAS's remote counter. Restart from workflow step 0, rebuild, and
  submit the new build ID.

2. `This project is not configured for using remote version source`
- Stop. Do not edit `eas.json` or rebuild from the current tag. Fix
  `cli.appVersionSource: "remote"` in a release PR, create and push a new
  release tag through `/make-release`, then restart this skill from step 0.

3. `No environment variables found for production`
- Stop the build and ask the user to add the missing variable in the EAS
  dashboard with the appropriate visibility. Never put secret values in
  command lines or logs, and do not overwrite variables with `--force`.
  Restart from workflow step 0 before building again.

4. Submit fails with "Apple ID prompt: Input is required, but stdin is not readable"
- The shell cannot answer interactive prompts. Run the command from a local terminal that has stdin.

5. Missing or expired Apple credentials (certificate/provisioning profile)
- Run credentials setup interactively from user terminal:
  ```bash
  npx eas-cli credentials -p ios
  ```

6. Submit fails on Apple side
- Inspect submission details:
  ```bash
  npx eas-cli submission:view <submission-id>
  ```

## Release configuration

This build/submit-only skill never edits `eas.json`, `app.config.js`, or the
native iOS project. If release configuration is missing, stop and fix it in a
release PR; create and push a new release tag before building.

## Done Criteria

- Build finished successfully (EAS reports finished state).
- `eas submit` returned a submission ID and succeeded.
- User confirmed the final text was saved in TestFlight "What to Test".
- User receives direct links (build, IPA, TestFlight) and a note on Apple processing time.
