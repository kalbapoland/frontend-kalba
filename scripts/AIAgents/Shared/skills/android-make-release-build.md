# Android Make Release Build (production flavour)

Use this skill when the user wants a local Android release APK build without
EAS. Builds a **production-flavour** APK: Profile shows no developer options.
For a TEST build with the developer-options section visible, use
`android-make-test-build` instead — its npm scripts are the ones containing
`:test`.

Use script naming convention `platform:mode:backend` for Android:
- `android:release:local`
- `android:release:remote`

## Version bump (before a real release)

The app version is displayed in-app (Profile footer, sign-in footer, dev
options build row) and read from the **native binary** — so it must be bumped
in the native sources, not just the manifest. One command syncs all three:

```powershell
npm run release:patch   # 1.0.0 -> 1.0.1, versionCode +1
npm run release:minor   # 1.0.0 -> 1.1.0, versionCode +1
npm run release:major   # 1.0.0 -> 2.0.0, versionCode +1
```

`release:*` updates `app.config.js`, `package.json`, and
`android/app/build.gradle` (`versionCode` + `versionName`) and creates a
standalone `chore: bump version to X.Y.Z` commit. Without `--commit`
(direct script call), files are updated only. Never bump inside a feature
PR — the bump commit rides to `main` on its own or with a release PR.

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
