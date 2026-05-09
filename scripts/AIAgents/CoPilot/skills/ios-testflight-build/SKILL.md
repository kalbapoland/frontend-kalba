---
name: ios-testflight-build
description: 'Create an iOS TestFlight build from Windows/macOS with explicit build number control, EAS build, and EAS submit. Use when publishing a frontend iOS build to TestFlight.'
argument-hint: 'build-number (e.g. 15) and optional release note'
user-invocable: true
---

# iOS TestFlight Build

Use this skill when the user wants to ship a new iOS build to TestFlight.

## Goal

- Set a specific iOS build number (required by App Store Connect uniqueness rules).
- Create an EAS iOS production build.
- Submit the latest build to TestFlight.

## Preconditions

1. Run in `frontend` repository root.
2. User is logged into Expo account (`npx eas-cli whoami`).
3. EAS `production` environment contains required variables:
   - `EXPO_PUBLIC_API_URL_NATIVE`
   - `EXPO_PUBLIC_API_URL_WEB`
   - `EXPO_PUBLIC_EAS_PROJECT_ID`
   - Google OAuth client IDs if app uses Google sign-in.

## Workflow

1. Set explicit build number in dynamic config.

- In `app.config.js`, set:

```js
ios: {
  ...,
  buildNumber: "<build-number>",
}
```

- In `eas.json`, keep `production.autoIncrement` disabled when user asks for exact build number.

2. Build iOS app for store distribution.

```bash
npx eas-cli build -p ios --profile production
```

- If prompted `iOS app only uses standard/exempt encryption?` -> choose `yes`.
- If prompted about Apple login during build -> `no` is acceptable.

3. Submit the latest build to TestFlight.

```bash
npx eas-cli submit -p ios --latest
```

- If prompted to create App Store Connect API key, choose `yes`.
- For role selection, prefer `APP_MANAGER` (least privilege).

4. Report output links.

- Build URL (`expo.dev/.../builds/...`)
- IPA artifact URL (`expo.dev/artifacts/...ipa`)
- Submission URL (`expo.dev/.../submissions/...`)

## Common Failure Fixes

1. `Build number ... has already been used`
- Increase `ios.buildNumber` in `app.config.js` and rebuild.

2. `No environment variables found for production`
- Add variables via:

```bash
npx eas-cli env:create production --name <VAR> --value <VALUE> --visibility plaintext --scope project --force --non-interactive
```

3. Submit failed on Apple side
- Inspect submission details:

```bash
npx eas-cli submission:view <submission-id>
```

## Done Criteria

- Build finished successfully.
- Submission is scheduled or completed.
- User receives direct links and next expected timing (Apple processing usually 10-30 min).
