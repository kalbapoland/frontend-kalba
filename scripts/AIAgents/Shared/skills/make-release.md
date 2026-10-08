# Kalba Make Release (both platforms, full procedure)

Use this skill when the user wants to **ship a release** — the complete
two-platform procedure: version bump, tag, changelog, store artefacts, iOS
TestFlight submit and the Android Google Play (internal track) submit.

Single entrypoint for the whole flow. Per-step skills stay available for
re-running one stage only:
- `android-make-release-build` (local Gradle APK, production flavour)
- `android-make-test-build` (APK with developer options)
- `android-eas-build` (EAS cloud builds)
- `ios-testflight-build` (iOS build/submit re-entry for an existing tag)

## Source of truth

Full procedure: [docs/BUILDING_WITH_EAS.md §3.0](../../../../docs/BUILDING_WITH_EAS.md).
This skill is the workflow wrapper — the runbook owns the decisions.

## Preconditions

1. Run from `frontend` repo root; **on `main`, clean tree, up to date** with origin.
2. Feature work is fully merged (PRs closed) — never mix a release with WIP.
3. `npx eas-cli whoami` returns the account.
4. EAS environments (`production`) carry: `EXPO_PUBLIC_API_URL_NATIVE`,
   `EXPO_PUBLIC_API_URL_WEB`, `EXPO_PUBLIC_EAS_PROJECT_ID`, Google client IDs,
   `GOOGLE_SERVICES_JSON` (file) for Android.

## Workflow

### Step 1 — Create release branch and bump version

Calculate the target version from `package.json` using SemVer: `patch`
increments the patch component, `minor` increments minor and resets patch to
zero, and `major` increments major and resets both lower components to zero.
For example, `0.2.1` with `minor` becomes `0.3.0`. Follow
[docs/BUILDING_WITH_EAS.md](../../../../docs/BUILDING_WITH_EAS.md) §3.0
steps 1–2 exactly; they guard clean, up-to-date `main`, reject existing
release branches/tags, bump the exact target version, verify the local tag,
push only the release branch, and create the release PR. The tag must remain
local until that PR is merged. Capture the PR URL and stop on any failed
command.

- Synchronises `app.config.js`, `package.json`,
  `android/app/build.gradle` (versionCode **+1**, versionName), and the **iOS
  native project** (`ios/Kalba/Info.plist`,
  `ios/Kalba.xcodeproj/project.pbxproj` — EAS reads the version from native
  code on bare `ios/`; skipping this is the "iOS shows the old version" bug).
- Creates the standalone `chore: bump version to X.Y.Z` commit and the
  **`vX.Y.Z` git tag** (the anchor for release notes).

Push only the release branch, then open a PR from `release/<target-version>`
to `main`. Record the PR URL and wait for it to be merged; do not push directly
to protected `main`. The release tag is pushed only after the merge, in Step 2.
If GitHub CLI cannot open the PR, ask the user to create it and provide its URL.

### Step 2 — Change summaries

Run this after the release PR has been merged. Publish the release tag as
directed in the runbook, fetch tags, then pass the explicit `$targetTag`; the
script resolves its previous version tag and prints the tag-to-tag range. This
procedure is documented in
[docs/BUILDING_WITH_EAS.md](../../../../docs/BUILDING_WITH_EAS.md) §3.0. The
release bump commit is excluded.

**1. Commit list, sorted by priority:**

```powershell
$targetTag = "vX.Y.Z" # substitute the exact tag created in Step 1
$releasePrUrl = "<merged release PR URL>"
$releasePr = gh pr view $releasePrUrl --json state,baseRefName,headRefOid | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Could not verify the release PR." }
$targetCommit = (git rev-parse "${targetTag}^{commit}").Trim()
if ($LASTEXITCODE -ne 0) { throw "Could not resolve $targetTag." }
if ($releasePr.state -ne "MERGED" -or $releasePr.baseRefName -ne "main" -or $releasePr.headRefOid -ne $targetCommit) {
  throw "The release PR must be merged to main with no post-tag commits."
}
git push --no-follow-tags origin $targetTag
if ($LASTEXITCODE -ne 0) { throw "Could not publish $targetTag after PR merge." }
git fetch --tags origin
if ($LASTEXITCODE -ne 0) { throw "Could not fetch release tags." }
npm run release:notes -- --release $targetTag --commits
if ($LASTEXITCODE -ne 0) { throw "Could not generate the commit summary." }
```

The printed previous-tag → `$targetTag` range must match; stop if it does not.
Both endpoints must be version tags; never use `HEAD`. The groups are ordered `Features`
(`feat` / `feature`) → `Tasks` (`task` /
`tasks`) → `Bug Fixes` (`fix` / `bugfix` / `bug`) → `Other Changes` (for
example `chore`, `docs`, `test`, and `ci`). This list preserves the commit
subjects and hashes.

**2. User/tester summary:**

Inspect the changes in that same tag range, using the diffs (not just commit
titles) to decide what users will notice. Present this as a separate, concise
bullet list in the user's language: omit commit types, hashes, PR numbers, and
internal-only work, and include what testers should verify when relevant. Do
not infer behavior that is not supported by the changes. Never include
secrets, credentials, internal URLs/hosts, personal data, or unreleased
information. If there are no user-visible changes, say so explicitly. Keep
this list within 500 characters so it can be reused in Google Play and TestFlight.

Present both summaries under separate headings before starting the builds.

The existing outputs remain available for manual use:

```powershell
npm run release:notes -- --release $targetTag
npm run release:notes:short -- --release $targetTag
```

Ogłoszenie na Discord (wysyłane po distribucji) wymaga webhooka:
`DISCORD_RELEASE_WEBHOOK_URL` w środowisku (`.env.local` — dodaj linię
`DISCORD_RELEASE_WEBHOOK_URL=https://discord.com/api/webhooks/...`; URL
dostępny u właściciela kanału `#releases`). **Bez tej zmiennej ogłoszenie
pominiesz** — powiadom o tym użytkownika i dokończ resztę procesu (to nie
jest błąd release'u).

### Step 3 — Build both platforms (developer options ON)

After the release PR is merged, run the exact remote-tag and clean-worktree
gate in [docs/BUILDING_WITH_EAS.md](../../../../docs/BUILDING_WITH_EAS.md)
§3.0 Step 4a. It verifies the merged PR, pushed tag, clean checkout, and EAS
configuration, then leaves HEAD detached at `$targetTag`. It does not build.
If any check fails, stop; never ask the user to override it.

```powershell
# Step 4b: run both builds once from the detached tag; never build from main.
npx eas-cli build -p android --profile release --non-interactive --no-wait
if ($LASTEXITCODE -ne 0) { throw "Android EAS build failed." }
npx eas-cli build -p ios --profile release --non-interactive --no-wait
if ($LASTEXITCODE -ne 0) { throw "iOS EAS build failed." }
git switch main
if ($LASTEXITCODE -ne 0) { throw "Could not return to main after queueing builds." }
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw "Could not update main after queueing builds." }
```

- Profile `release` = store artefacts (AAB/IPA) **with developer options**
  (`EXPO_PUBLIC_APP_VARIANT=test`) — for the pre-release / testers audience.
- Final store-only build (dev options OFF): `--profile production`.
- Capture both **build IDs** from output; free tier queues — check
  `npx eas-cli build:list` rather than polling logs.

### Step 4 — Distribute

**iOS — TestFlight (after the build reaches FINISHED):**

```powershell
npx eas-cli submit -p ios --id <ios-build-id>
```

After the build is processed, show the user the final summary and ask them to
paste it into App Store Connect's "What to Test" field. Wait for the user to
confirm the saved text before reporting the release complete. Do not pass
free-form summary text as a native command-line argument.

- Apple processes 5–10 min; in TestFlight, add the build to the **Beta
  testers** group (auto-distribution may handle this), and once it is the
  active build, **Expire/Delete** previous builds so testers see one version.

**Android — Google Console (internal track, after the build reaches FINISHED):**

```powershell
npx eas-cli submit -p android --profile release --id <android-build-id> --non-interactive
```

- Key: **Google Service Account Key uploaded to EAS Credentials** — one-time
  setup per
  [expo.fyi/creating-google-service-account](https://expo.fyi/creating-google-service-account);
  if it was not uploaded, submit fails with "Google Service Account key not
  found". In that case ask the user for a manual AAB upload of the
  `expo.dev/artifacts/...aab` artifact in Play Console and do not retry the
  submit automatically.
- The submit lands in **Internal testing ("Testy wewnętrzne")** — track
  `internal` from the `release` profile in eas.json. Version and versionCode
  come from the build; nothing is typed in the Google Console.
- After the submit, ask the user to paste the user/tester summary from this
  procedure into the release notes of the internal testing release (EAS
  Submit does not set release notes) and wait for confirmation it was saved.
- Free tier: queues happen; check `npx eas-cli build:list` rather than
  tailing build logs.

## Done criteria

- Version bumped and committed — **on all 5 files** (config/pkg/gradle/plist/pbxproj).
- Tag `vX.Y.Z` exists and is pushed.
- Both summaries cover the same previous-tag → current-tag range; the
  user/tester summary is used for store and TestFlight notes.
- The user confirms the user/tester summary was saved in the store consoles.
- Google Console: the new version is visible in **Internal testing
  ("Testy wewnętrzne")** (submitted via `eas-cli submit`, track `internal`);
  the user/tester summary is saved in the release notes. TestFlight shows
  the new version with a "What to Test" note.
- **Ogłoszenie na Discord** wysłane na `#releases` (PO wypchnięciu builda
  do obu sklepów) przez `npm run release:notes -- --release $targetTag
  --discord --summary-file <plik-z-podsumowaniem-PL>`; wymaga zmiennej
  środowiskowej `DISCORD_RELEASE_WEBHOOK_URL` (nie commitujemy jej do repo —
  ładowana z `.env.local` / magazynu sekretów).
  **Zasada języka (2026-10-08): ogłoszenie jest W CAŁOŚCI po polsku.**
  Wysyłamy TYLKO treść `--summary-file` (polskie podsumowanie user/tester
  z Kroku 2) — bez dodatkowych sekcji z surowymi angielskimi commitami
  (pomieszanie PL-tytułów z EN-wpisami w jednym embed = błąd formatu).
  Sekcje z commitami to wyłącznie fallback-draft, gdy podsumowania nie ma.
  **Jeśli `DISCORD_RELEASE_WEBHOOK_URL` nie jest ustawione, ogłoszenie NIE
  zostanie wysłane** — poinformuj o tym użytkownika ("brak webhooka Discord,
  pomiń ogłoszenie; ustaw DISCORD_RELEASE_WEBHOOK_URL w `.env.local`, aby
  włączyć") i kontynuuj zakończenie procesu — brak powiadomienia nie jest
  błędem release'u. Skrypt przerywa pracę przy błędzie wysyłki — nie
  powtarzaj w ciemno; sprawdź kanał pod kątem wcześniejszej częściowej
  wysyłki.
- `npm run release:notes` next time will start from the new tag.

## Common failure fixes

- iOS shows the previous version after a release → a bump happened **without**
  the iOS native sync. Do not rerun `version-bump.js` on the existing tag;
  create a new patch release through `/make-release` so the native files,
  version tag, and build all match.
- `versionCode ... has already been used` → EAS remote counter drifted; let
  EAS auto-increment resolve it (do not hand-edit `versionCode`).
- Build stays `NEW` long (free tier queue) → wait, do not cancel; check
  `eas build:list`. If >12 h, cancel and relaunch one platform at a time.