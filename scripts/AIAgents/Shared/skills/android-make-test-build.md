# Android Make Test Build (dev options visible)

Use this skill when the user wants an Android **TEST build** — an APK with the
Profile **Developer options** section visible (runtime palette override).
Test builds are for QA device testing, screen-flow captures and manual visual
review. Production never exposes developer options.

Naming convention: the word "test" must appear in the skill name and npm
script, so it is always clear which build carries dev options.

## Goal

- Build an installable Android release APK with `EXPO_PUBLIC_APP_VARIANT=test`
  inlined (developer options visible in Profile).
- Choose the backend variant (`local` or `remote`) like any other build.
- Optionally pin a theme (`default` / `warm-deep` / `night` / `system`); the
  default is `system` (runtime switching unlocked).

## Preconditions

Same as `android-make-release-build` (repo root, Java 17+, SDK, deps,
`.env.dev` for remote).

## Workflow

1. Pick the npm script (**all test-build scripts contain `test`**):

| Script | Theme | Dev options | Use for |
|---|---|---|---|
| `android:release:local:test` | system (unlocked) | yes | QA device runs, screen-flow capture with runtime switching |
| `android:release:remote:test` | system (unlocked) | yes | QA against dev backend |
| `android:debug:local:test` | system (unlocked) | yes | dev-client smoke of the dev options UI |
| `android:release:local[:warm-deep\|:night]` | **locked** | **no** (production flavour) | deterministic gallery capture only |

Note the last row: the locked palette scripts build the **production**
flavour — dev options are NOT visible there, and those scripts are outside
this skill's scope (use `android-make-release-build` for them). To capture a
locked palette WITH dev options visible, pass the flavour explicitly:
`node scripts/android-build.js release local warm-deep test`.

2. Build:

```powershell
npm run android:release:local:test
```

3. Return artifact path and install command:

- APK: `android/app/build/outputs/apk/release/kalba-release-local-test-<date>.apk`
- Install: `adb install -r android/app/build/outputs/apk/release/kalba-release-local-test-<date>.apk`

4. Point the tester at the dev section: **Profile → Opcje deweloperskie /
   Developer options** — choose a palette; it overrides system-following until
   cleared ("Domyślna (bez nadpisania)").

## How it differs from a production build

- `EXPO_PUBLIC_APP_VARIANT=test` is inlined; `src/lib/buildVariant.ts` reads
  it and Profile renders the **Developer options** section only when true.
- Production builds (no flavour arg) keep the section out of the bundle —
  the flag is Metro-inlined and unreachable at runtime.
- APK filename gains the `-test` suffix so test and production artifacts
  never collide on the device or in CI.

## Common Failure Fixes

See `android-make-release-build` — the toolchain and env plumbing are
identical. Theme-resolution failures (unknown `EXPO_PUBLIC_THEME`) fail the
build before Gradle.

## Done Criteria

- Build succeeds and the APK filename contains `-test`.
- On the device, Profile shows **Developer options** (test build) or does
  not (production build).
- Switching a palette in dev options recolours the running app without a
  restart.