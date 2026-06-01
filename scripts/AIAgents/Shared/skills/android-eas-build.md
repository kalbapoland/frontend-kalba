# Android EAS Build

Use this skill when the user wants to create an Android build with EAS.

This skill always runs:
- `android:eas:release:remote` -> EAS profile `tester`

## Goal

- Build Android tester APK over EAS using a single, predictable command.
- Ensure Firebase config works on EAS cloud builds (`GOOGLE_SERVICES_JSON`).
- Provide artifact/build links and next step (direct install on tester device).

## Preconditions

1. Verify current directory is `frontend` repository root (must contain `eas.json`).
  - If `eas.json` is missing, instruct user to `cd frontend` and stop.
2. Verify user is logged into Expo account (`npx eas-cli whoami`).
  - If check fails, instruct user to run `npx eas-cli login` and stop.
3. EAS environment has required variables for the selected variant:
   - `EXPO_PUBLIC_API_URL_NATIVE`
   - `EXPO_PUBLIC_API_URL_WEB`
   - `EXPO_PUBLIC_EAS_PROJECT_ID`
   - `GOOGLE_SERVICES_JSON` (type: file)

## Workflow

1. Build Android app.

```bash
npm run android:eas:release:remote
```

- Produces installable APK for testers; should use deployed backend via selected EAS environment.
- Build typically takes 10-25 min.
- Return the build URL to the user immediately after submission.
- Do not poll or wait for completion in the same turn; user can check URL or ask for status later.

2. Share build outputs.

- Build page URL (`expo.dev/.../builds/...`)
- Artifact URL (`expo.dev/artifacts/...`)
- Explain direct install path on device (e.g. open artifact URL on device or `adb install <path>`).

3. Optional note: if user asks for Play Store build, point them to dedicated store flow.

- This skill intentionally does not run store submit.

## Common Failure Fixes

1. `google-services.json is missing`
- Use the env-file variable and config fallback:
  - Create `GOOGLE_SERVICES_JSON` in EAS env for variants used in builds.
  - Keep `android.googleServicesFile` in `app.config.js` pointing at the env-var fallback.

2. `No environment variables found for <variant>`
- Add missing vars via:
  ```bash
  npx eas-cli env:create --environment <eas-environment> --name <VAR> --value <VALUE> --visibility plaintext --scope project --force --non-interactive
  ```

3. Build fails with unlisted error (network, quota, Gradle, etc.)
- Share full error output and build URL with the user.
- Ask how they want to proceed instead of retrying automatically.

## Done Criteria

- Android build completed successfully.
- User receives build + artifact links.
- User gets a clear next action: direct install path on a tester device.
