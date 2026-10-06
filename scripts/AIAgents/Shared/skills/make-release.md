# Make Release (both platforms, full procedure)

Use this skill when the user wants to **ship a release** — the complete
two-platform procedure: version bump, tag, changelog, store artefacts, iOS
TestFlight submit and the Android AAB hand-off.

Single entrypoint for the whole flow. Per-step skills stay available for
re-running one stage only:
- `android-make-release-build` (local Gradle APK, production flavour)
- `android-make-test-build` (APK with developer options)
- `android-eas-build` (EAS cloud builds)
- `ios-testflight-build` (iOS submit-only re-entry)

## Source of truth

Full procedure: [docs/BUILDING_WITH_EAS.md §3.0](../../../docs/BUILDING_WITH_EAS.md).
This skill is the workflow wrapper — the runbook owns the decisions.

## Preconditions

1. Run from `frontend` repo root; **on `main`, clean tree, up to date** with origin.
2. Feature work is fully merged (PRs closed) — never mix a release with WIP.
3. `npx eas-cli whoami` returns the account.
4. EAS environments (`production`) carry: `EXPO_PUBLIC_API_URL_NATIVE`,
   `EXPO_PUBLIC_API_URL_WEB`, `EXPO_PUBLIC_EAS_PROJECT_ID`, Google client IDs,
   `GOOGLE_SERVICES_JSON` (file) for Android.

## Workflow

### Step 1 — Bump version (commit + tag + iOS native sync)

```powershell
npm run release:patch   # or minor | major
```

- Synchronises `app.config.js`, `package.json`,
  `android/app/build.gradle` (versionCode **+1**, versionName), and the **iOS
  native project** (`ios/Kalba/Info.plist`,
  `ios/Kalba.xcodeproj/project.pbxproj` — EAS reads the version from native
  code on bare `ios/`; skipping this is the "iOS shows the old version" bug).
- Creates the standalone `chore: bump version to X.Y.Z` commit and the
  **`vX.Y.Z` git tag** (the anchor for release notes).

```powershell
git push origin main --follow-tags
```

Do NOT bump inside feature branches — the bump commit rides `main` alone or
with a release PR.

### Step 2 — Changelog

```powershell
npm run release:notes           # markdown: last tag -> HEAD (Features / Bug Fixes / Other)
npm run release:notes:short     # <=500 chars, Google Console budget; also TestFlight "What to Test"
```

### Step 3 — Build both platforms (developer options ON)

```powershell
npx eas-cli build -p android --profile release --non-interactive --no-wait
npx eas-cli build -p ios --profile release --non-interactive --no-wait
```

- Profile `release` = store artefacts (AAB/IPA) **with developer options**
  (`EXPO_PUBLIC_APP_VARIANT=test`) — for the pre-release / testers audience.
- Final store-only build (dev options OFF): `--profile production`.
- Capture both **build IDs** from output; free tier queues — check
  `npx eas-cli build:list` rather than polling logs.

### Step 4 — Distribute

**iOS — TestFlight (after the build reaches FINISHED):**

```powershell
npx eas-cli submit -p ios --id <ios-build-id> --what-to-test "<notes-short>"
```

- Apple processes 5–10 min; in TestFlight, add the build to the **Beta
  testers** group (auto-distribution may handle this), and once it is the
  active build, **Expire/Delete** previous builds so testers see one version.

**Android — Google Console (manual):**

- Download the AAB artifact URL from the build page
  (`expo.dev/artifacts/...aab`).
- Upload in Google Console (Play App Signing); version/versionCode come from
  the build. Paste release notes (`--short`).

## Done criteria

- Version bumped and committed — **on all 5 files** (config/pkg/gradle/plist/pbxproj).
- Tag `vX.Y.Z` exists and is pushed.
- Android AAB uploaded; TestFlight shows the new version with a "What to Test" note.
- `npm run release:notes` next time will start from the new tag.

## Common failure fixes

- iOS shows the previous version after a release → a bump happened **without**
  the iOS native sync (older tooling, or files edited by hand). Re-run
  `node scripts/version-bump.js --set X.Y.Z` to re-sync, then rebuild.
- `versionCode ... has already been used` → EAS remote counter drifted; let
  EAS auto-increment resolve it (do not hand-edit `versionCode`).
- Build stays `NEW` long (free tier queue) → wait, do not cancel; check
  `eas build:list`. If >12 h, cancel and relaunch one platform at a time.