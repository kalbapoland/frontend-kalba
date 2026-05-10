---
name: android-eas-build
description: 'Create Android EAS builds for development or production, with local install guidance and optional store-submit handoff in Claude.'
argument-hint: 'profile (development|production) and optional note about local install vs store release'
user-invocable: true
---

# Android EAS Build

Use this skill when the user wants to create an Android build with EAS.

## Goal

- Build Android app with the correct EAS profile (`development` or `production`).
- Ensure Firebase config works on EAS cloud builds (`GOOGLE_SERVICES_JSON`).
- Provide artifact/build links and next step (local install or store flow).

## Preconditions

1. Run in `frontend` repository root.
2. User is logged into Expo account (`npx eas-cli whoami`).
3. EAS environment has required variables for selected profile:
   - `EXPO_PUBLIC_API_URL_NATIVE`
   - `EXPO_PUBLIC_API_URL_WEB`
   - `EXPO_PUBLIC_EAS_PROJECT_ID`
   - `GOOGLE_SERVICES_JSON` (type: file)

## Workflow

1. Confirm selected profile and expected output.

- `development` -> internal build for direct install/testing.
- `production` -> store-oriented build for release flow.

2. Build Android app.

```bash
npx eas-cli build -p android --profile <profile>
```

3. Share build outputs.

- Build page URL (`expo.dev/.../builds/...`)
- Artifact URL (`expo.dev/artifacts/...`)
- If `development`: tell user artifact can be installed locally on device.
- If `production`: treat as release artifact for store pipeline.

4. Optional handoff for store submit (only if requested).

```bash
npx eas-cli submit -p android --latest
```

## Common Failure Fixes

1. `google-services.json is missing`
- Use env file variable and config fallback:
  - create `GOOGLE_SERVICES_JSON` in EAS env for both `development` and `production`
  - keep `android.googleServicesFile` in `app.config.js` pointing to env var fallback

2. `No environment variables found for <profile>`
- Add missing vars via:

```bash
npx eas-cli env:create <profile> --name <VAR> --value <VALUE> --visibility plaintext --scope project --force --non-interactive
```

3. `Version code has already been used`
- Increase `android.versionCode` in `app.config.js` (or enable auto-increment policy for Android release flow).

## Done Criteria

- Android build completed successfully.
- User receives build + artifact links.
- User gets clear next action:
  - local install path for `development`, or
  - release/store path for `production`.
