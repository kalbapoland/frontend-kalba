# Mobile Automated Tests

This directory is the frontend entrypoint for mobile UI automation.

What lives here:

1. Maestro flows for Android and iOS
2. the implementation plan
3. local wrapper scripts for prepare and smoke runs

Backend fixture setup lives in `../../../backend/tests/automated/` because the seed
script depends on backend models and the local database.

## Quick start

1. Clean backend fixtures:

```bash
python test/automated/prepare_mobile_e2e.py
```

The smoke flows create the trainer and user accounts through the UI, so the
prepare step only clears any stale deterministic data before the run.

2. Run Android smoke:

```bash
python test/automated/run_android_smoke.py
```

The Android wrapper installs a fresh local release build before the Maestro
flows start, so the emulator runs the current workspace code instead of a stale
previous install.

The smoke wrappers always clean the emulator app state and seeded backend
fixtures afterwards, even if a test fails.

3. Run iOS smoke on macOS:

```bash
python test/automated/run_ios_smoke.py
```

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
