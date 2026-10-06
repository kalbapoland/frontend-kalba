# iOS TestFlight Build

Use this skill when the user wants to ship a new iOS build to TestFlight.

## Goal

- Create an EAS iOS **release** build (profile `release`: store distribution, **dev options enabled**).
- EAS auto-increments the build number (remote source) — no local edits.
- Submit it straight to TestFlight in "Ready to Test" state.
- Attach "What to Test" from the release notes tooling.

## Version + release notes (before building)

The release flow is documented in full in
[docs/BUILDING_WITH_EAS.md](../../../docs/BUILDING_WITH_EAS.md) §3.0. Short
version:

```powershell
npm run release:minor            # (or patch/major) — bump + commit + tag vX.Y.Z
npm run release:notes:short      # "What to Test" copy (<=500 chars)
```

`release:*` syncs the **iOS native project** too (`ios/Kalba/Info.plist`,
`ios/Kalba.xcodeproj/project.pbxproj`) — required, because EAS reads the
version from native code (bare `ios/` directory) and ignores the manifest
value. Missing this step makes TestFlight show the OLD version.

## Preconditions

1. Run in `frontend` repository root and verify `eas.json` exists.
   - If `eas.json` is missing, instruct user to `cd frontend` and stop.
2. Verify git working tree is clean and on the intended release branch (usually `main`).
   - If not clean or on a different branch, confirm with the user before building.
3. User is logged into Expo account (`npx eas-cli whoami`).
   - If no user is returned, instruct user to run `npx eas-cli login` in their own terminal and stop.
4. EAS `production` environment contains required variables:
   - `EXPO_PUBLIC_API_URL_NATIVE`
   - `EXPO_PUBLIC_API_URL_WEB`
   - `EXPO_PUBLIC_EAS_PROJECT_ID`
   - Google OAuth client IDs if the app uses Google sign-in.
5. `eas.json` already has:
   - `cli.appVersionSource: "remote"`
   - `build.production.autoIncrement: true`
   - `build.production.distribution: "store"`

   If any of these are missing, set them before running this skill - see the "Initial setup" section below.

## Workflow

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

- Always pass `--id <build-id>` captured in step 1. Use `--latest` only if no build ID was captured.
- "What to Test" from the release notes (preferred):
  ```bash
  npx eas-cli submit -p ios --id <build-id> --what-to-test "$(npm run --silent release:notes:short | tr -d '\n')"
  ```
  Or paste the `--short` output manually when the shell mangles newline handling.
- Keep submit interactive by default (do not force `--non-interactive`) because first-run ASC auth may require prompts.
- ASC Export Compliance is pre-declared via `ITSAppUsesNonExemptEncryption: false` in `app.config.js`, so the build skips "Missing Compliance" and goes straight to "Ready to Test".

3. Report output links.

- Build URL (`expo.dev/accounts/.../builds/...`)
- IPA artifact URL (`expo.dev/artifacts/...ipa`)
- TestFlight URL (`https://appstoreconnect.apple.com/apps/6761315112/testflight/ios`)
- Note expected processing time (Apple usually 5-10 min after submit).

## Common Failure Fixes

1. `Build number N has already been used` (during submit)
- Means EAS's remote counter is behind App Store Connect (e.g. someone uploaded N from another machine, or the seeding value was wrong). Bump the server counter past whatever ASC saw:
  ```bash
  npx eas-cli build:version:set -p ios
  ```
  Enter a value higher than the last used build number, then rebuild and resubmit.

2. `This project is not configured for using remote version source`
- `eas.json` reverted or wasn't updated. Set `cli.appVersionSource: "remote"` and re-run.

3. `No environment variables found for production`
- Add the missing variable:
  ```bash
  npx eas-cli env:create production --name <VAR> --value <VALUE> --visibility plaintext --scope project --force --non-interactive
  ```

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

## Initial setup (one-time, only if eas.json doesn't already have remote + autoIncrement)

1. In `eas.json`, set:
   ```json
   {
     "cli": { "appVersionSource": "remote" },
     "build": {
       "production": {
         "distribution": "store",
         "autoIncrement": true
       }
     }
   }
   ```
2. Seed the EAS server counter to the last build number already on App Store Connect (interactive, must run from user's terminal):
   ```bash
   npx eas-cli build:version:set -p ios
   ```
3. Drop any `ios.buildNumber` set in `app.config.js` - it's ignored with remote source and leaks into the manifest via expo-constants.
4. Ensure `app.config.js` has `ios.infoPlist.ITSAppUsesNonExemptEncryption: false` so submitted builds skip ASC's Missing Compliance flow.

## Done Criteria

- Build finished successfully (EAS reports finished state).
- `eas submit` returned a submission ID and succeeded.
- If release note was provided, it was passed as TestFlight "What to Test".
- User receives direct links (build, IPA, TestFlight) and a note on Apple processing time.
