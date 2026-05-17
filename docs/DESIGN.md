# Kalba — Design & Decisions

> Living document. Captures product/design decisions, current capabilities,
> known limitations, and future improvement ideas for the Kalba app.
>
> **For AI agents and contributors:** consult this file before designing
> new features. Update it whenever a decision is made, a constraint is
> discovered, or a feature ships. Keep entries concise and dated.

Build/release source of truth (EAS): [docs/BUILDING_WITH_EAS.md](BUILDING_WITH_EAS.md)

---

## Conventions for entries

Each feature section follows the same shape so it stays scannable:

- **Status** — `planned` / `in progress` / `shipped` (+ date)
- **Overview** — one paragraph: what it does, who it's for
- **Decisions** — concrete choices with the *why*
- **Current limitations** — what does NOT work today (be honest)
- **Future improvements** — ideas for next iterations, not commitments

---

## Push Notifications

**Status:** shipped (2026-04-25) — Phase 1 complete: backend (token registration, Expo dispatch, reminder scheduler) + frontend (push-token registration, notification handler, deep link navigation).

### Overview

Notify users about time-sensitive events (workshop starting soon, schedule
changes, future participant reminders). Phase 1 covers **trainer reminders**
only — the workshop creator gets a push N minutes before their workshop
starts. Architecture is built so adding participants and other notification
types later requires no rewrite.

**Stack:**
- Frontend: `expo-notifications` (Expo Push Service abstracts APNs/FCM)
- Backend: Expo Push API (`https://exp.host/--/api/v2/push/send`)
- Scheduler: simple in-process polling loop in FastAPI `lifespan`

### Decisions

#### Multi-device support — `push_tokens` table, not `User.push_token` column

A user can have multiple devices (phone + tablet, work + personal). Storing
a single token per user means whoever logged in last wins, and the other
device stops getting notifications. Implementation cost is identical
(one `CREATE TABLE` instead of one `ALTER TABLE`), so we go straight to
a relational model.

Schema:
```
push_tokens
  id            UUID PK
  user_id       FK -> user.id
  token         TEXT UNIQUE       -- ExponentPushToken[...]
  platform      TEXT              -- "ios" | "android"
  created_at    TIMESTAMPTZ
  last_seen_at  TIMESTAMPTZ
```

Token ownership is **per device, not per user**. Reassigning a token to a
new user on the same device is normal (shared tablet, account switch).

#### Reminder lead time — per-workshop, configurable at creation

Trainers choose how many minutes before start they want to be reminded
(e.g., 15 / 30 / 60 / 120 min). Stored as `Workshop.reminder_minutes_before`
(integer ≥ 1; 0 is rejected because it can never match the SELECT window).
A global default in config (`NOTIFICATION_LEAD_MINUTES_DEFAULT = 60`) seeds
the form and is used when the field is missing.

Why per-workshop instead of one global value: trainers running back-to-back
short sessions vs. multi-hour workshops have very different needs.

#### Scheduler — DB polling loop, not APScheduler

Background task started in FastAPI `lifespan`, polls every
`NOTIFICATION_POLL_SECONDS` (default 60s):

```sql
SELECT id FROM workshop
WHERE deleted_at IS NULL
  AND reminder_sent_at IS NULL
  AND start_time > now()
  AND start_time <= now() + make_interval(0,0,0,0,0, reminder_minutes_before)
```

Backed by a partial index (`ix_workshop_due_reminders`) that filters on
`deleted_at IS NULL AND reminder_sent_at IS NULL` so the scan stays small.

**Atomic claim-then-dispatch.** Each due workshop is claimed by a single
`UPDATE workshop SET reminder_sent_at = now() WHERE id = :id AND
reminder_sent_at IS NULL AND deleted_at IS NULL` returning `rowcount`.
Only the winner of that race dispatches. This makes the loop safe against
multiple scheduler instances (Fly multi-machine, blue/green overlap).

**Single-shot semantics.** A workshop is marked sent *before* the push
goes out. If Expo fails partially or fully the workshop is **not** retried
— preferring at-most-once delivery to spam or window-miss. Failure counts
appear in `DispatchResult` logs.

**Re-arming.** `update_workshop` clears `reminder_sent_at` when
`start_time` or `reminder_minutes_before` changes (and the workshop is
not soft-deleted). The next poll picks it up.

**Kill-switch.** `NOTIFICATIONS_ENABLED=false` disables the loop. The
flag is read at process startup only — a runtime toggle would require a
restart.

Why not APScheduler:
- No new dependency, no job-store table to maintain
- Restarts cannot drop scheduled jobs — there are no scheduled jobs, only
  rows with a target time
- Edits to `start_time` clear `reminder_sent_at`; the next poll picks
  it up automatically
- Soft-deletes are filtered by the same query

If we hit volumes where polling becomes expensive (thousands of pending
workshops), revisit (see *Future improvements*).

#### Frontend push-token registration (PR 6, 2026-04-25)

`usePushRegistration` hook (src/hooks/usePushRegistration.ts) runs inside
`app/(app)/_layout.tsx` after the auth gate. On every authenticated launch it:
1. Calls `Notifications.requestPermissionsAsync()` — exits silently if denied.
2. Calls `Notifications.getExpoPushTokenAsync({ projectId })` using
   `EXPO_PUBLIC_EAS_PROJECT_ID` from `app.config.js` → `extra.easProjectId`.
3. Calls `PUT /api/v1/users/me/push-tokens` — idempotent upsert.
4. Stores the token in Zustand (`pushToken` field) for logout cleanup.
On explicit `signOut`, `unregisterPushToken` is called before clearing state.
Web is skipped entirely (Phase 1 — VAPID is a separate flow).

#### Token registration endpoint shape

- `PUT /api/v1/users/me/push-tokens` — body `{ token, platform }`. Idempotent
  upsert keyed on `token`. If the token already exists for another user,
  reassign ownership (device, not user, owns the token).
- `POST /api/v1/users/me/push-tokens/unregister` — called on explicit
  logout; token is sent in the request body (not the URL path) to keep
  it out of access logs. Scoped to current user
  (`AND user_id = :current_user`) to prevent cross-user token deletion.
  Returns 204 even if token is missing (idempotent, no info leakage).

PostgreSQL `INSERT ... ON CONFLICT (token) DO UPDATE` handles concurrent
requests from the same device atomically.

#### Cleanup of dead tokens

Expo returns `DeviceNotRegistered` when an app is uninstalled or token
is revoked. The notification service deletes such tokens from the DB
on the next send attempt. No separate cron job needed for now.

### Current capabilities

- **Trainer reminder delivery (Phase 1).** Trainer receives one push before
  their workshop based on `reminder_minutes_before`.
- **Foreground notification behavior.** Reminder notifications are surfaced
  as alert + sound while app is active.
- **Deep link on notification tap.** Tapping reminder opens
  `/workshop/[id]` via `expo-router`.
- **Cold-start notification routing.** If app is launched from a push,
  last notification response is read and route is opened automatically.
- **Idempotent token lifecycle.** Token is registered on authenticated app
  launches and unregistered on explicit logout.

### iOS Push Smoke Checklist (Release DoD)

Use this short checklist before marking an iOS release as push-ready:

1. Install latest TestFlight build on a physical iPhone.
2. Open app, log in as `TRAINER`, wait 10-20s.
3. Confirm backend logs include token registration:
  - `PUT /api/v1/users/me/push-tokens` -> `204`
  - `Push token upserted for user ... on ios`
4. Create a new workshop with start time `now + 61 min` (default reminder is 60 min).
5. Lock the phone and wait ~1 minute.
6. Confirm backend reminder dispatch:
  - `Reminder fired for workshop ...`
  - `Push dispatch: sent=... failed=0`
7. Confirm push appears on lock screen.

Detailed runbook: `docs/IOS_PUSH_RUNBOOK.md`.

### Current limitations

- **Phase 1 covers trainers only.** Participants do not get reminders yet.
- **iOS requires a physical device** + Apple Developer Account with push
  entitlements (we have the account). Simulator cannot receive pushes.
- **Android emulator** must have Google Play Services to receive pushes.
- **Expo Go does not support push** — development requires a dev build
  via `expo-dev-client` (already in dependencies).
- **No notification preferences UI.** Users cannot mute or choose
  notification types. Logging out is the only way to stop receiving them.
- **No retry beyond Expo's own.** If Expo accepts the message and APNs/FCM
  later drops it, the user simply doesn't see a notification.
- **Polling cadence is 60s.** Reminders may fire up to 60s late. Acceptable
  for a 15+ min lead time; would not be for second-precision use cases.
- **No timezone-aware lead time.** Lead time is in absolute minutes;
  daylight-saving transitions during the lead window are handled by
  Postgres interval arithmetic on UTC `start_time`.

### Future improvements

- **Participant reminders.** Same scheduler, fan out to all enrolled
  users. Likely needs per-user mute setting.
- **Notification types & preferences.** "Workshop changed", "workshop
  cancelled", "your workshop starts soon", "trainer started the call now".
  Per-type opt-in screen in profile.
- **Persistent scheduler.** If polling becomes a bottleneck, migrate to
  APScheduler with `SQLAlchemyJobStore`, or Celery + Redis if we need
  retries, priorities, and worker scaling.
- **Web push** for the web build (separate flow — VAPID keys, service
  worker, no Expo Push).
- **Localization.** Notification copy is currently English-only; tie to
  user `locale` once we add one.
- **Analytics.** Track delivery, open rate, time-to-tap to tune lead time
  and copy.

---

## Native Authentication

**Status:** shipped (2026-04-27) — email/password registration and login now sit alongside the existing Google auth flow.

### Overview

Kalba now supports a native email/password path for users who do not want to
depend on Google sign-in. The backend owns registration, password hashing,
credential verification, and JWT issuance; the frontend presents a single auth
screen that can switch between sign-up and log-in modes.

### Decisions

#### Password storage — Passlib + bcrypt only

Passwords are never stored or returned in plain text. The backend hashes native
credentials with Passlib using the bcrypt scheme and stores only
`User.hashed_password`. API responses continue to expose JWTs and user ids only.

#### Identity model — one user table, optional auth providers

The existing `user` table remains the source of truth. `google_id` is now
nullable and `hashed_password` is optional, which allows:
- Google-only accounts
- native-only accounts
- accounts linked to both methods over time

This avoids splitting profile data across multiple tables while keeping one
stable user id across auth methods.

#### JWT handling — HTTPS transport, secure local storage

JWTs should only be used over HTTPS outside local development. On native
clients, access and refresh tokens are stored in `expo-secure-store`, which is
the preferred storage for session secrets. If a platform lacks secure storage,
an encrypted alternative should be chosen before falling back to plain storage.

### Current limitations

- Native auth currently supports only email + password; there is no password
  reset or email verification flow yet.
- Web still relies on browser storage semantics for development sessions, so
  native SecureStore protections do not apply there.

### Future improvements

- Add password reset and email verification.
- Add explicit account-linking UI for users who want one account to support
  both Google and native credentials.

---

## Hashtags

**Status:** shipped (2026-05-17) — hashtag parsing, persistence, highlighting, and autocomplete are live across create/edit/detail workshop flows.

### Overview

Workshop descriptions support hashtags (for example `#joga`, `#medytacja`) to
improve topic discoverability and guide users while composing content. The
frontend highlights parsed tags and offers autocomplete during typing; the
backend parses and persists canonical tag names, then exposes them in workshop
responses.

### Decisions

#### Parsing parity between backend and frontend

Parsing rules are intentionally mirrored in backend
`app/services/hashtags.py` and frontend `src/lib/hashtags.ts`.
Both sides use the same constraints:
- tag must start with `#` and not be inside a word (`foo#bar` is not a tag)
- allowed chars are Unicode `\\w` (letters, digits, underscore)
- length is 2-30 characters
- max 5 unique tags per workshop

Why: without strict parity, users would see tags in the editor that backend
would silently drop (or vice versa).

#### Canonical storage format

Tag names are NFC-normalized + casefolded before persistence and suggestions.
This means variants like `#Joga`, `#JOGA`, and `#joga` collapse into one
canonical value.

Why: consistent search/autocomplete behavior and no duplicate logical tags in
different letter cases or Unicode forms.

#### Tags are derived from description text

There is no separate "tags" field in workshop create/update payloads. The
backend derives tags from `description` and replaces workshop-tag links on each
description update.

Why: single source of truth (description text) and no risk of description/tag
drift.

#### Suggestion strategy

`GET /api/v1/tags/suggest?q=<prefix>&limit=<n>` returns canonical names for
authenticated users only. Results are prefix-based and sorted by popularity
descending (usage in non-soft-deleted workshops), then alphabetically.

Why: simple, predictable autocomplete with low query cost and good relevance.

### Current limitations

- Only first 5 unique hashtags are persisted and highlighted; additional tags
  in text remain plain text and are ignored by persistence.
- Suggestions are prefix-only (no fuzzy/infix matching).
- Empty prefix intentionally returns no "popular tags overall" list.
- Orphan tags are kept in the `tag` table; there is no cleanup job yet.
- Hashtags are visual and assistive today; there is no dedicated tag browse,
  filter, or search UI.
- `@daily-co/react-native-daily-js` currently requires
  `react-native-background-timer` as a peer/runtime dependency. Replacing or
  removing it is blocked until Daily ships a maintained alternative or we
  migrate/fork the video SDK.

### Future improvements

- Add hashtag-based workshop discovery (tap hashtag -> filtered list view).
- Add optional fuzzy matching for autocomplete while preserving prefix as the
  default ranking signal.
- Add background cleanup for permanently unused tags if table growth becomes a
  concern.
- Add trend analytics (most-used tags over time) for product insights.

---
