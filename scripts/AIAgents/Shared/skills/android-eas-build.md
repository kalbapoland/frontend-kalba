# Android EAS Build

Use this skill when the user wants to create an Android build with EAS.

## Goal

- Build Android app with the correct EAS profile (`tester`, `development`, or `production`).
- For production: let EAS auto-bump `versionCode` server-side so consecutive store uploads never collide on Play Console.
- Ensure Firebase config works on EAS cloud builds (`GOOGLE_SERVICES_JSON`).
- For production only: apply a single rule for Android remote version counter setup.
- Provide artifact/build links and next step (direct install, dev flow, or store flow).

## Preconditions

1. Verify current directory is `frontend` repository root (must contain `eas.json`).
  - If `eas.json` is missing, instruct user to `cd frontend` and stop.
2. Verify user is logged into Expo account (`npx eas-cli whoami`).
  - If check fails, instruct user to run `npx eas-cli login` and stop.
3. If profile argument is missing or not one of `tester|development|production`, ask user to specify it and stop.
  - Do not assume a default profile.
4. EAS environment has required variables for the selected profile:
   - `EXPO_PUBLIC_API_URL_NATIVE`
   - `EXPO_PUBLIC_API_URL_WEB`
   - `EXPO_PUBLIC_EAS_PROJECT_ID`
   - `GOOGLE_SERVICES_JSON` (type: file)
5. `eas.json` already has:
   - `cli.appVersionSource: "remote"`
   - `build.production.autoIncrement: true`

   If those are missing, set them before continuing - see "Initial setup" below.
6. Production-only remote counter decision rule:
  - Ask user: "Has `npx eas-cli build:version:set -p android` been run at least once for this project?"
  - If user answers no: stop and instruct running it manually in their terminal.
  - If user answers yes or is unsure: continue and treat "No remote versions are configured" as reactive signal from build output.

## Workflow

1. Resolve profile and expected output.

- If profile argument was not provided, ask user to choose one of `tester|development|production`.
- Otherwise, restate selected profile and expected output, then proceed.

- `tester` -> internal standalone APK for direct install/testing on device (no Metro/dev client screen).
- `development` -> development client (requires Metro / Expo dev server).
- `production` -> store-oriented release build (AAB, autoIncremented).

2. Apply production-only remote counter rule.

- If profile is `tester` or `development`, skip this step.
- If profile is `production`, ask user whether `npx eas-cli build:version:set -p android` was run at least once.
- If user confirms no, stop and instruct manual one-time setup.
- If user confirms yes or is unsure, continue with build and handle error #4 reactively if it appears.

3. Build Android app.

```bash
npx eas-cli build -p android --profile <profile> --non-interactive
```

- For `tester`: installable APK for testers; should use deployed backend via selected EAS environment.
- For `development`: development client only, not a standalone app.
- For `production`: EAS reads Android `versionCode` from its server, increments, and bakes it into the AAB.
- For `tester` and `development`: no autoIncrement is needed.
- Build typically takes 10-25 min.
- Return the build URL to the user immediately after submission.
- Do not poll or wait for completion in the same turn; user can check URL or ask for status later.

4. Share build outputs.

- Build page URL (`expo.dev/.../builds/...`)
- Artifact URL (`expo.dev/artifacts/...`)
- For `tester`: explain direct install path on device (e.g. open artifact URL on device or `adb install <path>`).
- For `development`: explain that tester will see a dev client screen and must connect to Metro.
- For `production`: treat as release artifact for Play Console flow.

5. Optional handoff for store submit (only if requested).

```bash
npx eas-cli submit -p android --latest
```

Requires a Google Play service account key configured for the project. If absent, EAS prompts to set one up.

- If running in `--non-interactive` mode and the key is missing, stop and instruct user to configure it via `eas credentials` in their own terminal, then retry submit.

## Common Failure Fixes

1. `google-services.json is missing`
- Use the env-file variable and config fallback:
  - Create `GOOGLE_SERVICES_JSON` in EAS env for profiles used in builds.
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

4. `No remote versions are configured for this project` (production build)
- Remote counter is not armed yet. User must run in their own terminal (interactive):
  ```bash
  npx eas-cli build:version:set -p android
  ```

5. Submit fails with "stdin is not readable"
- The shell cannot answer interactive prompts. Run the command from a terminal that has stdin.

6. Submit fails because Google Play service account key is missing
- In `--non-interactive`, setup prompts cannot be answered.
- Stop and instruct user to configure Play credentials via `eas credentials`, then rerun submit.

7. Build fails with unlisted error (network, quota, Gradle, etc.)
- Share full error output and build URL with the user.
- Ask how they want to proceed instead of retrying automatically.

## Initial setup (one-time, only if eas.json does not already have remote + autoIncrement)

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
3. Drop any `android.versionCode` set in `app.config.js` - it is ignored with remote source and leaks into the manifest via expo-constants.

## Done Criteria

- Android build completed successfully.
- User receives build + artifact links.
- If production build needed remote counter setup, user has completed one-time interactive `build:version:set` step.
- User gets a clear next action:
  - For `tester`: direct install path on a tester device.
  - For `development`: local dev flow (`npx expo start`) and connect to Metro.
  - For `production`: release/store path (and any submit URL if `eas submit` ran).
