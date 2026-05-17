---
name: android-eas-build
description: 'Create Android EAS builds for development or production. Version code is managed automatically by EAS (remote source + autoIncrement on production). Use when shipping an Android build to Play Console or installing locally on a device.'
argument-hint: 'profile (development|production) and optional note about local install vs store release'
user-invocable: true
---

# Android EAS Build

Use this skill when the user wants to create an Android build with EAS.

## Goal

- Build Android app with the correct EAS profile (`development` or `production`).
- For production: let EAS auto-bump `versionCode` server-side so consecutive store uploads never collide on Play Console.
- Ensure Firebase config works on EAS cloud builds (`GOOGLE_SERVICES_JSON`).
- Ensure Android remote version counter is armed once before production submissions.
- Provide artifact/build links and next step (local install or store flow).

## Preconditions

1. Run in `frontend` repository root.
2. User is logged into Expo account (`npx eas-cli whoami`).
3. EAS environment has required variables for the selected profile:
   - `EXPO_PUBLIC_API_URL_NATIVE`
   - `EXPO_PUBLIC_API_URL_WEB`
   - `EXPO_PUBLIC_EAS_PROJECT_ID`
   - `GOOGLE_SERVICES_JSON` (type: file)
4. `eas.json` already has:
   - `cli.appVersionSource: "remote"`
   - `build.production.autoIncrement: true`

   If those are missing, set them before continuing — see "Initial setup" below.
5. If Android remote counter is not armed yet, user must run once in their own terminal:
  - `npx eas-cli build:version:set -p android` (interactive)

## Workflow

1. Confirm selected profile and expected output.

- `development` → internal build for direct install/testing on device.
- `production` → store-oriented release build (AAB, autoIncremented).

2. Confirm remote counter state for Android.

- If unarmed / unknown, stop and instruct user to run once manually:
  - `npx eas-cli build:version:set -p android`
- This is interactive and should be done in the user's terminal.
- After this one-time step, continue with normal builds.

3. Build Android app.

```bash
npx eas-cli build -p android --profile <profile> --non-interactive
```

- For `production`: EAS reads Android `versionCode` from its server, increments, and bakes it into the AAB. No source edits required.
- For `development`: the build profile doesn't enable autoIncrement; nothing to manage version-wise.
- Build typically takes 10–25 min. Stream the build log URL back to the user.

4. Share build outputs.

- Build page URL (`expo.dev/.../builds/...`)
- Artifact URL (`expo.dev/artifacts/...`)
- For `development`: tell the user the APK can be installed directly on a connected device (e.g. drag onto emulator, `adb install <path>`, or open the URL on the device).
- For `production`: treat as release artifact for the Play Console flow.

5. Optional handoff for store submit (only if requested).

```bash
npx eas-cli submit -p android --latest
```

Requires a Google Play service account key configured for the project. If absent, EAS prompts to set one up.

## Common Failure Fixes

1. `google-services.json is missing`
- Use the env-file variable and config fallback:
  - Create `GOOGLE_SERVICES_JSON` in EAS env for both `development` and `production`.
  - Keep `android.googleServicesFile` in `app.config.js` pointing at the env-var fallback.

2. `No environment variables found for <profile>`
- Add missing vars via:
  ```bash
  npx eas-cli env:create --environment <profile> --name <VAR> --value <VALUE> --visibility plaintext --scope project --force --non-interactive
  ```

3. `Version code N has already been used` (on Play Console submit)
- EAS's remote counter is behind Play Console. Bump it past whatever Play has seen:
  ```bash
  npx eas-cli build:version:set -p android
  ```
  Enter a value higher than the last used `versionCode`, then rebuild and resubmit.

4. `No remote versions are configured for this project` (first production build after switching to remote)
- Remote counter is not armed yet. User must run in their own terminal (interactive):
  ```bash
  npx eas-cli build:version:set -p android
  ```

5. `Remote version counter is not configured / not armed` (team confirmation)
- Treat this as one-time setup blocker.
- Do not keep retrying production build until user runs:
  ```bash
  npx eas-cli build:version:set -p android
  ```

6. Submit fails with "stdin is not readable"
- The shell cannot answer interactive prompts. Run the command from a terminal that has stdin.

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
2. Seed the EAS server counter to the last `versionCode` already shipped (interactive):
   ```bash
   npx eas-cli build:version:set -p android
   ```
  This command is intentionally run manually by the user in their own terminal.
3. Drop any `android.versionCode` set in `app.config.js` — it's ignored with remote source and leaks into the manifest via expo-constants.

## Done Criteria

- Android build completed successfully.
- User receives build + artifact links.
- If remote counter was unarmed, user has completed one-time interactive `build:version:set` step.
- User gets a clear next action:
  - For `development`: local install path on a device.
  - For `production`: release/store path (and any submit URL if `eas submit` ran).
