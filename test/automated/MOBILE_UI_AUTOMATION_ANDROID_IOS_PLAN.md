# Mobile UI Automation Plan (Android + iOS, no Web)

This plan defines a practical, incremental path to automate current manual UI checklists for mobile only.
Scope is Android (Windows + macOS) and iOS (macOS).

## 1. Goal

One command should run smoke UI checks end-to-end with deterministic test data:

1. prepare local backend data (user + trainer + groups + workshops)
2. run app on emulator/simulator
3. execute UI flows mapped from manual checklist
4. export pass/fail report and screenshots

## 2. Target Stack

1. UI runner: Maestro (single framework for Android + iOS)
2. Data setup: backend seed/reset script (deterministic fixtures)
3. Orchestration: script commands per platform (PowerShell/Bash)
4. CI:
- Android on Linux/macOS runner
- iOS on macOS runner

## 3. Phase Plan

### Phase 0: Foundations (1-2 days)

1. Add stable `testID` to critical controls in smoke paths.
2. Freeze deterministic fixture data contract (emails, workshop titles, group names).
3. Add one backend entrypoint script for fixture reset + seed.

### Phase 1: Android Smoke (2-4 days)

1. Implement Android smoke flows in Maestro.
2. Cover USER + TRAINER critical paths from smoke checklist.
3. Run locally on Windows and macOS with emulator.
4. Store screenshots on failure.

### Phase 2: iOS Smoke (1-2 days)

1. Reuse same flows on iOS simulator with platform branches where needed.
2. Validate local run on macOS.
3. Add iOS smoke run in CI macOS.

### Phase 3: Full P0 Regression (3-5 days)

1. Extend smoke to P0 release checklist.
2. Add role-based negative checks (non-trainer restrictions).
3. Add resilient waits and flaky-step hardening.

### Phase 4: Video and Permissions (optional)

1. Add call enter/leave smoke as default.
2. Move full media/host-controls to dedicated nightly suite.
3. Add explicit permission-allow/deny scenarios.

## 4. Data Contract For E2E Fixtures

Use constant test accounts:

1. `e2e.user@kalba.local` / `Pass1234`
2. `e2e.trainer@kalba.local` / `Pass1234`

Use constant entities:

1. group discover: `E2E Discover Group`
2. group owned by trainer: `E2E Trainer Group`
3. workshop free spots: `E2E Workshop Free`
4. workshop full: `E2E Workshop Full`
5. workshop owned by trainer: `E2E Workshop Trainer`

Rules:

1. seed is idempotent
2. fixture reset runs before each suite
3. titles/emails never randomized in smoke
4. `e2e.user@kalba.local` starts as a member of `E2E Trainer Group`, so Home has visible workshops immediately after login
5. `E2E Discover Group` stays unsubscribed for the seeded user, so Discover/Subscribe stays deterministic

Backend fixture script:

1. `../../../backend/tests/automated/seed_mobile_e2e_fixtures.py`

## 5. Mapping To Existing Manual Checklists

Primary source files:

1. `docs/MANUAL_TEST_CHECKLIST_SMOKE.md`
2. `docs/MANUAL_TEST_CHECKLIST_RELEASE_REGRESSION.md`
3. `docs/MANUAL_TEST_CHECKLIST_SCREENS.md`

MVP coverage target:

1. Sign in/out (email + password only in automated smoke)
2. Home list -> workshop detail
3. Groups discover/my groups subscribe/unsubscribe
4. Enroll/unenroll workshop
5. Trainer create/edit/delete workshop
6. Trainer create/edit group

Deferred after MVP:

1. Google login
2. full video host-controls
3. long-edge UX scenarios

## 6. Minimal TestID Contract (must-have)

Add/verify the following IDs in critical screens:

1. `signin.email.input`
2. `signin.password.input`
3. `signin.submit.button`
4. `home.workshops.list`
5. `home.workshop.card.<slug>`
6. `group.subscribe.button.<slug>`
7. `group.unsubscribe.button.<slug>`
8. `workshop.enroll.button`
9. `workshop.unenroll.button`
10. `profile.signout.button`
11. `trainer.create.group.button`
12. `trainer.create.workshop.button`
13. `trainer.edit.workshop.button`
14. `trainer.delete.workshop.button`

Note: use deterministic slug values derived from fixture titles.

## 7. Run Matrix

### Local Windows

1. Android emulator only
2. command: `maestro test test/automated/maestro/flows/smoke/android_smoke.yaml`

### Local macOS

1. Android emulator: same as Windows
2. iOS simulator: `maestro test test/automated/maestro/flows/smoke/ios_smoke.yaml`

### CI

1. PR required: Android smoke
2. nightly: Android smoke + iOS smoke

## 8. Orchestrator Command Shape

Recommended command targets:

1. `e2e:mobile:prepare`
- start backend deps
- run migrations
- reset/seed fixtures

2. `e2e:android:smoke`
- ensure Android emulator/app ready
- run Maestro android smoke

3. `e2e:ios:smoke`
- ensure iOS simulator/app ready (macOS)
- run Maestro ios smoke

4. `e2e:mobile:smoke`
- run android then ios (ios only on macOS)

## 9. Acceptance Criteria (v1)

1. Android smoke passes locally on Windows and macOS.
2. iOS smoke passes locally on macOS.
3. suite start requires zero manual data setup.
4. each failed step includes screenshot artifact.
5. each automated step maps to checklist item.

## 10. Implementation Backlog (ordered)

1. Add backend fixture reset/seed script.
2. Add missing testID in critical UI elements.
3. Implement shared login flows in Maestro.
4. Implement Android smoke scenario USER.
5. Implement Android smoke scenario TRAINER.
6. Add iOS flow and platform gates.
7. Add run scripts and CI integration.
8. Stabilize flaky steps and add retries selectively.
