# Mobile Automated Tests

This directory is the frontend entrypoint for mobile UI automation.

What lives here:

1. Maestro flows for Android and iOS
2. the implementation plan
3. local wrapper scripts for prepare and smoke runs
4. Android emulator create/destroy helpers for clean local test devices

Backend fixture setup lives in `../../../backend/tests/automated/` because the seed
script depends on backend models and the local database.

## Quick start

### Required environment variables (mandatory)

The local one-shot Android smoke runner requires both variables below:

1. `KALBA_FRONTEND_DIR` - absolute path to the frontend repo root
2. `KALBA_BACKEND_DIR` - absolute path to the backend repo root

If either variable is missing (or points to a non-existent directory),
`python test/automated/run_android_smoke_local.py` exits with an error.

PowerShell examples:

```powershell
$env:KALBA_FRONTEND_DIR = "E:\Projects\Kalba\frontend"
$env:KALBA_BACKEND_DIR = "E:\Projects\Kalba\backend"
```

Persist for future terminals:

```powershell
setx KALBA_FRONTEND_DIR "E:\Projects\Kalba\frontend"
setx KALBA_BACKEND_DIR "E:\Projects\Kalba\backend"
```

1. Clean backend fixtures:

```bash
python test/automated/prepare_mobile_e2e.py
```

The user account is created via UI during smoke. Trainer flow uses login, and
the runner ensures deterministic trainer credentials in backend before tests.

2. Run Android smoke locally in one shot:

```bash
python test/automated/run_android_smoke_local.py
```

Set these environment variables before running it:

1. `KALBA_FRONTEND_DIR` - absolute path to the frontend repo root
2. `KALBA_BACKEND_DIR` - absolute path to the backend repo root

The local runner does not guess paths. If either variable is missing or points
to a non-existent directory, it exits with an error.

The one-shot flow creates a fresh emulator, starts it with the Warsaw timezone,
creates a temporary PostgreSQL container, runs migrations, builds and installs
the release APK, then runs the Maestro smoke flows.

Trainer owner-flow smoke uses login (not signup). The runner ensures the
deterministic trainer account exists in backend before executing trainer flows.

Before the Android smoke flows start, the wrapper temporarily disables the
emulator autofill service so Google Password Manager prompts do not block the
UI after a successful signup.

The wrapper always destroys the emulator, stops the backend, and removes the
temporary database afterwards, even if a test fails.

3. Run iOS smoke on macOS:

```bash
python test/automated/run_ios_smoke.py
```

4. Create or destroy a clean Android simulator:

```bash
python test/automated/create_android_simulator.py
python test/automated/start_android_simulator.py
python test/automated/destroy_android_simulator.py
```

Defaults:

1. AVD name: `kalba-pixel6-api36`
2. device profile: `pixel_6`
3. system image: `system-images;android-36;google_apis;x86_64`

Useful flags:

1. `python test/automated/create_android_simulator.py --name my-avd`
2. `python test/automated/create_android_simulator.py --system-image system-images;android-36;google_apis_playstore;x86_64`
3. `python test/automated/start_android_simulator.py --name my-avd --timezone Europe/Warsaw`
4. `python test/automated/destroy_android_simulator.py --name my-avd`

## Structure

1. `maestro/flows/common/` reusable fragments
2. `maestro/flows/smoke/` smoke suites
3. `artifacts/` local screenshots/logs (gitignored)
4. `tmp/` local temp files (gitignored)

## Conventions

1. Prefer Maestro `id:` selectors backed by React Native `testID`.
2. Keep fixture names deterministic.
3. Keep smoke flows short and composable.
4. Prefer `extendedWaitUntil` over sleeps.
