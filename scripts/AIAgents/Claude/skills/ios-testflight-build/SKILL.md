---
name: ios-testflight-build
description: 'Create an iOS TestFlight build from Windows/macOS with EAS build + EAS submit. Build number is managed automatically by EAS (remote source + autoIncrement). Use when publishing a frontend iOS build to TestFlight in Claude.'
argument-hint: 'optional release note'
user-invocable: true
---

# iOS TestFlight Build

Use this skill when the user wants to ship a new iOS build to TestFlight.

## Goal

- Create an EAS iOS production build (EAS server bumps the build number automatically).
- Submit it straight to TestFlight in "Ready to Test" state.

## Preconditions

1. Run in `frontend` repository root.
2. User is logged into Expo account (`npx eas-cli whoami`).
3. EAS `production` environment contains required variables:
   - `EXPO_PUBLIC_API_URL_NATIVE`
   - `EXPO_PUBLIC_API_URL_WEB`
   - `EXPO_PUBLIC_EAS_PROJECT_ID`
   - Google OAuth client IDs if the app uses Google sign-in.
4. `eas.json` already has:
   - `cli.appVersionSource: "remote"`
   - `build.production.autoIncrement: true`
   - `build.production.distribution: "store"`

   If any of these are missing, set them before running this skill — see the "Initial setup" section below.

## Workflow

1. Build iOS app for store distribution.

```bash
npx eas-cli build -p ios --profile production --non-interactive
```

- EAS reads the iOS buildNumber from its server (remote source), increments, and bakes the new value into the IPA. No source file edits needed.
- Build typically takes 15–30 min. Stream the log link (`expo.dev/accounts/.../builds/<id>`) back to the user.

2. Submit the latest build to TestFlight.

```bash
npx eas-cli submit -p ios --latest
```

- If `--latest` could pick the wrong build (e.g. multiple platforms or a concurrent build), pass `--id <build-id>` explicitly.
- ASC Export Compliance is pre-declared via `ITSAppUsesNonExemptEncryption: false` in `app.config.js`, so the build skips "Missing Compliance" and goes straight to "Ready to Test".
- Submit requires interactive ASC auth on first run from a new machine. If the Bash tool blocks on a prompt, hand the exact command to the user and ask them to run it from their terminal.

3. Report output links.

- Build URL (`expo.dev/accounts/.../builds/...`)
- IPA artifact URL (`expo.dev/artifacts/...ipa`)
- TestFlight URL (`https://appstoreconnect.apple.com/apps/6761315112/testflight/ios`)
- Note expected processing time (Apple usually 5–10 min after submit).

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
- Bash tool cannot answer interactive prompts. Hand the user the command and ask them to run it locally.

5. Submit fails on Apple side
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
3. Drop any `ios.buildNumber` set in `app.config.js` — it's ignored with remote source and leaks into the manifest via expo-constants.
4. Ensure `app.config.js` has `ios.infoPlist.ITSAppUsesNonExemptEncryption: false` so submitted builds skip ASC's Missing Compliance flow.

## Done Criteria

- Build finished successfully (EAS reports finished state).
- `eas submit` returned a submission ID and succeeded.
- User receives direct links (build, IPA, TestFlight) and a note on Apple processing time.
