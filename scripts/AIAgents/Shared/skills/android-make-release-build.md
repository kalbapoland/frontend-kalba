# Android Make Release Build (production flavour)

Use this skill when the user wants a local Android release APK build without
EAS. Builds a **production-flavour** APK: Profile shows no developer options.
For a TEST build with the developer-options section visible, use
`android-make-test-build` instead — its npm scripts are the ones containing
`:test`.

The APK reflects the current local branch and is not a tag-pinned store build.
Do not upload it as a store release; use `/make-release` for tagged store
artifacts.

Use script naming convention `platform:mode:backend` for Android:
- `android:release:local`
- `android:release:remote`

## Version bump

This skill only builds an APK from an existing release and never bumps versions
or creates tags. For a real release, use `/make-release` and
[docs/BUILDING_WITH_EAS.md](../../../../docs/BUILDING_WITH_EAS.md) §3.0. Only
that release flow may run `version-bump.js`, on the guarded
`release/<version>` branch with a PR to `main`.

## Release notes (what changed since the last release)

```powershell
$targetTag = "vX.Y.Z" # exact release tag from the runbook
npm run release:notes -- --release $targetTag --commits # priority-sorted list
npm run release:notes -- --release $targetTag           # PR-linked markdown
npm run release:notes:short -- --release $targetTag     # max 500 chars
node scripts/release-notes.js --release $targetTag --json # machine-readable
```

Release notes always compare two version tags, never `HEAD`. Calculate
`$targetTag` as in [docs/BUILDING_WITH_EAS.md](../../../../docs/BUILDING_WITH_EAS.md)
§3.0; the script resolves its previous tag. Check the range in the
`--commits` heading or stderr (the `--short` body has no header). `--short`
includes feature and bug-fix commits only and reports
explicitly if neither exists. This local APK skill does not publish store
notes. If the build is part of a later store release, use the user/tester
summary from `/make-release`; `--short` is raw commit text and must be reviewed
and rewritten under the public-summary rules before sharing. Full markdown is
suitable for the PR description.

## Goal

- Build an installable release APK locally with Gradle.
- Use selected backend variant for the build (`local` or `remote`).
- Return the final APK path and quick install command for a tester device.

## Preconditions

1. Run from frontend repository root (must contain `package.json` and `android/`).
  - If not in repo root, stop and ask user to switch directory.
2. Ensure Android toolchain is available:
  - Java 17+ (`java -version`)
  - Android SDK and Gradle wrapper (`android/gradlew.bat` exists)
3. Ensure dependencies are installed.
  - If `node_modules/` is missing, run `npm install` first.
4. If `remote` variant is selected, ensure `.env.dev` exists.
  - Remote build flow uses `.env.dev` as the source for backend URLs.

## Workflow

1. Select variant.

- If user asks for remote backend: run `android:release:remote`.
- If user asks for local backend: run `android:release:local`.

2. Build selected release variant.

```bash
npm run android:release:remote
```

or

```bash
npm run android:release:local
```

3. Return artifact path and quick install command.

- APK path:
  - `android/app/build/outputs/apk/release/app-release.apk`
- Optional install (USB-connected device with ADB):
  - `adb install -r android/app/build/outputs/apk/release/app-release.apk`

## Common Failure Fixes

1. `SDK location not found`
- Set Android SDK path in `android/local.properties`:
  - `sdk.dir=C:\\Users\\<user>\\AppData\\Local\\Android\\Sdk`

2. `JAVA_HOME is not set` or wrong Java version
- Set `JAVA_HOME` to JDK 17 and reopen terminal.

3. Gradle daemon or cache corruption
- Run:
  - `cd android`
  - `.\gradlew.bat clean`
  - `.\gradlew.bat :app:assembleRelease`

4. Build succeeds but app still talks to local backend
- Re-run `npm run android:release:remote` to re-apply remote env and rebuild.

5. `google-services.json` missing
- Ensure `android/app/google-services.json` exists or `GOOGLE_SERVICES_JSON` env points to a valid file path used by `app.config.js`.

## Done Criteria

- `:app:assembleRelease` finished successfully.
- APK exists at `android/app/build/outputs/apk/release/app-release.apk`.
- Confirmed build used chosen backend variant (`local` or `remote`).
