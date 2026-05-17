# Android OAuth Debug - 5 minute checklist

Purpose:
Quickly diagnose why Google OAuth fails on Android after redeploy or new build.

Scope:
- Frontend: EAS env and app build inputs
- Backend: allowed Google audiences for token validation
- Google Cloud: Android OAuth client package and SHA fingerprints

## 1. Confirm app uses expected Android client ID

Check frontend env used for remote backend:
- EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
- EXPO_PUBLIC_GOOGLE_CLIENT_ID
- EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID

Expected:
- Android flow uses EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
- Value matches the Android OAuth client in Google Cloud

Project reference:
- AuthScreen reads androidClientId from EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID

## 2. Confirm EAS environment values (development and production)

Run:
- npx eas-cli env:list --environment development
- npx eas-cli env:list --environment production

Verify these keys exist with correct values:
- EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
- EXPO_PUBLIC_GOOGLE_CLIENT_ID
- EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
- EXPO_PUBLIC_API_URL_NATIVE
- EXPO_PUBLIC_API_URL_WEB

If values were changed recently, rebuild Android app after env update.

## 3. Confirm backend allows Android audience

Backend validation compares Google token aud against:
- GOOGLE_CLIENT_ID
- GOOGLE_IOS_CLIENT_ID
- GOOGLE_ANDROID_CLIENT_ID

On deployed backend, verify secrets:
- fly secrets list --app backend-kalba

If GOOGLE_ANDROID_CLIENT_ID is missing, add it:
- fly secrets set GOOGLE_ANDROID_CLIENT_ID=<android-client-id> --app backend-kalba

Then restart machine or redeploy so process reloads env.

## 4. Confirm Google Cloud Android OAuth client is bound to correct signing

In Google Cloud Console credentials:
- Open Android OAuth client used by EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
- Verify package name is com.kalba.app
- Verify SHA-1 (and SHA-256 if used) matches signing key of current build

Common root cause after new build machine or pipeline change:
- Build is signed with different keystore fingerprint than the one configured in Google OAuth client.

## 5. Quick smoke test path

1) Open Android app and start Google login.
2) If Google dialog succeeds but app gets 401 on /auth/google:
   - Most likely aud mismatch on backend (step 3)
3) If Google rejects before returning token:
   - Most likely package/SHA mismatch in Google Cloud (step 4)

## 6. Error to cause mapping

- HTTP 401 with detail similar to "Token was not issued for this application"
  Cause: backend allowed client IDs do not include token aud.

- HTTP 401 with detail similar to "Invalid Google ID token"
  Cause: token expired/invalid or Google token endpoint validation failed.

- Google UI error before backend call (invalid_request / unauthorized client)
  Cause: wrong Android OAuth config (package/SHA/client ID mismatch).

## 7. One-line fix summary for this repo

Most likely fix:
- Ensure deployed backend has GOOGLE_ANDROID_CLIENT_ID set to the same value as frontend EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID used in Android build.

In local repo files this value currently appears in:
- frontend/.env.dev (this repository)
- frontend/.env.local (this repository)
- ../backend/.env.local (backend sibling repository)

Note:
- ../backend/.env.dev may miss GOOGLE_ANDROID_CLIENT_ID, so deployed secrets must be checked explicitly.
