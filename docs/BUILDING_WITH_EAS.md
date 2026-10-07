# Building With EAS (Source of Truth)

Ten dokument jest glownym punktem odniesienia dla budowania aplikacji przez EAS w projekcie frontend-kalba.

Cel:
- zdefiniowac, jak robic buildy developerskie i produkcyjne na iOS/Android,
- pokazac, co da sie zainstalowac lokalnie na telefonie,
- wskazac skille i dokumenty szczegolowe bez duplikowania tresci.

## 1. Aktualna konfiguracja projektu

Konfiguracja profili build jest w:
- [eas.json](../eas.json)

Aktualnie:
- `development`: `developmentClient: true`, `distribution: internal`
- `tester`: `distribution: internal`, Android `buildType: apk`, iOS `simulator: false`; `EXPO_PUBLIC_APP_VARIANT=test` (DevO widoczne)
- `release`: `distribution: store`, Android `buildType: app-bundle` (AAB), `EXPO_PUBLIC_APP_VARIANT=test` (DevO ON); build number/version podbija EAS dla obu platform; submit Android → **Google Console, track `internal`**
- `production`: `distribution: store`, `EXPO_PUBLIC_APP_VARIANT=production` (DevO NIEISTNIEJE)

Konfiguracja submitow jest w `eas.json` (`submit`):
- `production`: iOS `ascAppId` (App Store Connect) → TestFlight
- `release`: Android `track: internal` (Testy wewnetrzne / Internal testing
  w Google Console)
  - Autoryzacja przez **Google Service Account Key w EAS Credentials**
    (klucz jest przypisany do projektu, nie do profilu builda: wgrywasz go
    raz, np. przez `eas credentials -p android`) — brak pliku w repo;
    `serviceAccountKeyPath` w `eas.json` NIE jest ustawione.
  - Jednorazowa konfiguracja konta uslugi:
    [expo.fyi/creating-google-service-account](https://expo.fyi/creating-google-service-account)
    (klucz JSON wygenerowany lokalnie wgrywa sie wylacznie do EAS;
    Play Console → Users and permissions → prawa `Releases` dla konta uslugi).

Konfiguracja natywna Expo jest w:
- [app.config.js](../app.config.js)

Wazne:
- `cli.appVersionSource: "remote"` — **numery buildow** (Android versionCode, iOS buildNumber) zarzadza **serwer EAS** (auto-increment). Pliki natywne sa synchronizowane przez `npm run release:*` (scripts/version-bump.js), nie recznie.
- **Wersja aplikacji** (marketing version, np. 1.2.0) jest w plikach natywnych; EAS czyta je przy bare `ios/` i `android/`. To wartosc widoczna w systemie i w aplikacji (`expo-application`).
- Android wlacza Google Services tylko gdy plik jest dostepny:
  - `process.env.GOOGLE_SERVICES_JSON`
  - lokalnie: `./android/app/google-services.json`
  - przy buildzie cloud, jesli `GOOGLE_SERVICES_JSON` wskazuje na plik tymczasowy EAS,
    skrypt Gradle kopiuje go automatycznie do `android/app/google-services.json`
    przed aktywacja pluginu `com.google.gms.google-services`

## 2. Build matrix (co i po co)

| Platform | Typ | Profil EAS | Artefakt | DevO w Profilu | Lokalna instalacja |
|---|---|---|---|---|---|
| iOS | Developerski | `development` | dev client (internal) | — | Tak (zarejestrowane urzadzenie) |
| iOS | Release (DevO ON) | `release` | IPA (store) | **TAK** | TestFlight |
| iOS | Sklepowy | `production` | IPA (store) | nie | TestFlight (sklep) |
| Android | Debug (remote) | `development` | dev client (internal) | — | Tak |
| Android | Release APK (tester) | `tester` | standalone APK | **TAK** | Tak (adb/store-internal) |
| Android | Store AAB (DevO ON) | `release` | **AAB** | **TAK** | Do Google Console (auto, track `internal`) |
| Android | Store AAB (produkcja) | `production` | AAB | nie | Do Google Console (manual) |

## 3. Komendy EAS (podstawowe)

Uruchamiaj z katalogu `frontend`.

### 3.0 Release flow (PEŁNA PROCEDURA — wersjonowanie/tagi/opis zmian)

```powershell
# 1. Preflight na czystym main, wylicz wersje i utworz release branch
$workingTree = git status --porcelain
if ($LASTEXITCODE -ne 0) { throw "Could not inspect the working tree." }
if ($workingTree) { throw "Start from a clean working tree." }
$currentBranch = git branch --show-current
if ($LASTEXITCODE -ne 0 -or $currentBranch -ne "main") { throw "Start from main." }
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw "Could not fast-forward main." }
$headCommit = (git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw "Could not resolve local main." }
$originMainCommit = (git rev-parse origin/main).Trim()
if ($LASTEXITCODE -ne 0 -or $headCommit -ne $originMainCommit) {
  throw "Local main must exactly match origin/main before release."
}
$releaseScope = "minor" # set from request: patch | minor | major
$currentVersionText = (node -p "require('./package.json').version").Trim()
if ($LASTEXITCODE -ne 0 -or $currentVersionText -notmatch '^\d+\.\d+\.\d+$') {
  throw "Could not read a valid current package version."
}
$versionParts = @($currentVersionText.Split('.') | ForEach-Object { [int]$_ })
$targetParts = @($versionParts)
switch ($releaseScope) {
  "major" {
    $targetParts[0] = $targetParts[0] + 1
    $targetParts[1] = 0
    $targetParts[2] = 0
  }
  "minor" {
    $targetParts[1] = $targetParts[1] + 1
    $targetParts[2] = 0
  }
  "patch" { $targetParts[2] = $targetParts[2] + 1 }
  default { throw "Release scope must be patch, minor, or major." }
}
$targetVersion = $targetParts -join '.'
$releaseBranch = "release/$targetVersion"
$targetTag = "v$targetVersion"
$localBranches = @(git branch --list $releaseBranch)
if ($LASTEXITCODE -ne 0) { throw "Could not check local branches." }
if ($localBranches) { throw "Release branch already exists; resume it instead of bumping again." }
$remoteBranch = git ls-remote --heads origin "refs/heads/$releaseBranch"
if ($LASTEXITCODE -ne 0) { throw "Could not check remote release branches." }
if ($remoteBranch) { throw "Remote release branch already exists; resume it instead." }
$localTag = @(git tag --list $targetTag)
if ($LASTEXITCODE -ne 0) { throw "Could not check local release tags." }
if ($localTag) { throw "Release tag already exists; do not bump it again." }
$remoteTag = git ls-remote --tags origin "refs/tags/$targetTag"
if ($LASTEXITCODE -ne 0) { throw "Could not check remote release tags." }
if ($remoteTag) { throw "Remote release tag already exists; resume that release instead." }
git switch -c $releaseBranch
if ($LASTEXITCODE -ne 0) { throw "Could not create the release branch." }
node scripts/version-bump.js --set $targetVersion --commit
if ($LASTEXITCODE -ne 0) { throw "Version bump failed." }
$headTags = @(git tag --points-at HEAD)
if ($LASTEXITCODE -ne 0 -or $headTags -notcontains $targetTag) {
  throw "Version bump did not create $targetTag at HEAD."
}
$workingTree = git status --porcelain
if ($LASTEXITCODE -ne 0) { throw "Could not inspect the bumped working tree." }
if ($workingTree) { throw "Version bump left uncommitted changes; stop before pushing." }
# -> commit `chore: bump version to X.Y.Z` + GIT TAG vX.Y.Z
# -> synchronizuje: app.config.js, package.json,
#    android/app/build.gradle (versionCode +1, versionName),
#    ios/Kalba/Info.plist (CFBundleShortVersionString),
#    ios/Kalba.xcodeproj/project.pbxproj (MARKETING_VERSION + CURRENT_PROJECT_VERSION +1)
# -> czytaRemote EAS buildNumber, by lokalny licznik iOS go nie cofnal.
```

```powershell
# 2. Push release branch only and open a PR to main; keep the tag local
$targetVersion = "X.Y.Z" # use the target calculated in step 1
$releaseBranch = "release/$targetVersion"
$targetTag = "v$targetVersion"
git push --set-upstream --no-follow-tags origin $releaseBranch
if ($LASTEXITCODE -ne 0) { throw "Could not push the release branch." }
$releasePrUrl = gh pr create --base main --head $releaseBranch --title "Release $targetTag" --body "Release $targetTag."
if ($LASTEXITCODE -ne 0) { throw "Could not create the release PR." }
```

Zatrzymaj sie po utworzeniu PR. Poczekaj na review i merge do `main`; tag
pozostaje lokalny do tego momentu. Jesli PR zostanie porzucony, nie wypychaj
taga. Po potwierdzeniu porzucenia usun tylko te local refs:

```powershell
$targetVersion = "X.Y.Z" # version of the abandoned release
$releaseBranch = "release/$targetVersion"
$targetTag = "v$targetVersion"
$currentBranch = git branch --show-current
if ($LASTEXITCODE -ne 0 -or $currentBranch -ne $releaseBranch) {
  throw "Switch to the abandoned release branch before cleanup."
}
$workingTree = git status --porcelain
if ($LASTEXITCODE -ne 0) { throw "Could not inspect the abandoned release tree." }
if ($workingTree) { throw "Clean the abandoned release tree before cleanup." }
git switch main
if ($LASTEXITCODE -ne 0) { throw "Could not switch to main before cleanup." }
git push --no-follow-tags origin --delete $releaseBranch
if ($LASTEXITCODE -ne 0) { throw "Could not delete the abandoned remote branch." }
git tag -d $targetTag
if ($LASTEXITCODE -ne 0) { throw "Could not delete the abandoned local tag." }
git branch -D $releaseBranch
if ($LASTEXITCODE -ne 0) { throw "Could not delete the abandoned local branch." }
```

Potem przygotuj release ponownie z czystego `main`.

```powershell
# 3. Po merge: sprawdz PR i wygeneruj oba podsumowania z tych samych tagow
$targetVersion = "X.Y.Z"
$targetTag = "v$targetVersion"
$releasePrUrl = "<release PR URL>"
$prInfo = gh pr view $releasePrUrl --json state,baseRefName,headRefOid | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Could not verify the release PR." }
$targetCommit = (git rev-parse "${targetTag}^{commit}").Trim()
if ($LASTEXITCODE -ne 0) { throw "Could not resolve $targetTag." }
if ($prInfo.state -ne "MERGED" -or $prInfo.baseRefName -ne "main" -or $prInfo.headRefOid -ne $targetCommit) {
  throw "The release PR must be merged to main with no post-tag commits."
}
git push --no-follow-tags origin $targetTag
if ($LASTEXITCODE -ne 0) { throw "Could not publish the release tag after PR merge." }
git fetch --tags origin
if ($LASTEXITCODE -ne 0) { throw "Could not fetch release tags." }
npm run release:notes -- --release $targetTag --commits # feat > task > fix > other
if ($LASTEXITCODE -ne 0) { throw "Could not generate the commit summary." }
npm run release:notes -- --release $targetTag # pelny markdown (PR-linked)
if ($LASTEXITCODE -ne 0) { throw "Could not generate the full changelog." }
npm run release:notes:short -- --release $targetTag # max 500 znakow
if ($LASTEXITCODE -ne 0) { throw "Could not generate the short draft." }
```

```powershell
# 4a. Gate only: verify PR, remote tag, clean tree and EAS config
$targetVersion = "X.Y.Z"
$targetTag = "v$targetVersion"
$releasePrUrl = "<release PR URL>"
$workingTree = git status --porcelain
if ($LASTEXITCODE -ne 0) { throw "Could not inspect the working tree." }
if ($workingTree) { throw "Working tree must be clean before building a release." }
$tagRef = "refs/tags/$targetTag"
$tagRefSpec = "${tagRef}:${tagRef}"
git fetch origin $tagRefSpec
if ($LASTEXITCODE -ne 0) { throw "$targetTag is missing on origin or differs locally." }
$targetCommit = (git rev-parse "${targetTag}^{commit}").Trim()
if ($LASTEXITCODE -ne 0) { throw "Could not resolve $targetTag." }
$prInfo = gh pr view $releasePrUrl --json state,baseRefName,headRefOid | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Could not verify the release PR." }
if ($prInfo.state -ne "MERGED" -or $prInfo.baseRefName -ne "main" -or $prInfo.headRefOid -ne $targetCommit) {
  throw "The release PR must be merged to main with no post-tag commits."
}
git switch --detach $targetTag
if ($LASTEXITCODE -ne 0) { throw "Could not check out $targetTag." }
$headTags = @(git tag --points-at HEAD)
if ($LASTEXITCODE -ne 0 -or $headTags -notcontains $targetTag) {
  throw "HEAD must be exactly the pushed tag $targetTag."
}
$workingTree = git status --porcelain
if ($LASTEXITCODE -ne 0) { throw "Could not inspect the tagged working tree." }
if ($workingTree) { throw "The tagged working tree must be clean." }
if (-not (Test-Path -LiteralPath "eas.json")) {
  throw "eas.json is missing at the target release tag."
}
$easConfig = Get-Content -LiteralPath "eas.json" -Raw | ConvertFrom-Json
if (
  $easConfig.cli.appVersionSource -ne "remote" -or
  $easConfig.build.release.autoIncrement -ne $true -or
  $easConfig.build.release.distribution -ne "store" -or
  $easConfig.build.release.environment -ne "production" -or
  $easConfig.build.release.android.buildType -ne "app-bundle" -or
  $easConfig.build.release.env.EXPO_PUBLIC_APP_VARIANT -ne "test"
) {
  throw "Release EAS configuration is invalid at the target tag. Fix it in a release PR with a new tag."
}
```

Krok 4a tylko weryfikuje release i konczy sie detached HEAD na `$targetTag`;
nie uruchamia buildow. Jesli gate zawiedzie, zatrzymaj sie.

```powershell
# 4b. Build exactly once from the gated release tag
npx eas-cli build -p android --profile release --non-interactive --no-wait
if ($LASTEXITCODE -ne 0) { throw "Android EAS build failed." }
npx eas-cli build -p ios --profile release --non-interactive --no-wait
if ($LASTEXITCODE -ne 0) { throw "iOS EAS build failed." }
git switch main
if ($LASTEXITCODE -ne 0) { throw "Could not return to main after uploading builds." }
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw "Could not update main after uploading builds." }
```

Po kroku 3 skill `/make-release` tworzy tez druga, user/tester-friendly liste:
naturalny jezyk, tylko zmiany widoczne dla uzytkownika i wskazowki co sprawdzic.
Uzywa tego samego zakresu tagow co lista commitow; ten tekst wklej do Google
Play i TestFlight. Przy recznym flow przejrzyj diff w tym zakresie i przygotuj
takie podsumowanie przed publikacja.

Zakres release zawsze sklada sie z dwoch wersjonowanych tagow:
`vPREVIOUS..vCURRENT`. Jesli `HEAD` jest tagiem, skrypt wybiera ten tag i jego
poprzednika; w przeciwnym razie wybiera dwa najnowsze tagi. Zakres jawny i
`--since` rowniez musza wskazywac wersjonowane tagi — `HEAD` nie jest
dozwolonym koncem zakresu. Commit `chore: bump version` jest pomijany.
Uzywaj jawnego `$targetTag` dla obu podsumowan; skrypt dobiera jego poprzedni
tag i nigdy nie uzywa `HEAD` jako konca zakresu.

`release:notes:short` liczy znaki razem z nowymi liniami i fallbackiem; gdy
zakres nie ma commitow `feat`/`fix`, wypisuje jawny komunikat zamiast pustej
notatki. To surowy draft z tematow commitow: przed publikacja sprawdz diff i
przeredaguj tekst wedlug zasad podsumowania user/tester z `/make-release`.
Nigdy nie wklejaj surowego outputu jako notatki sklepowej.

Punkty 1-4 sa obowiazkowe dla kazdego release. Wersja mija automatycznie
(Android versionCode, iOS buildNumber — EAS auto-increment), wersja marketingowa
przyjmuje wartosc z taga przez synchronizowane pliki natywne.

### 3.1 iOS developerski

```bash
npx eas-cli build -p ios --profile development
```

### 3.2 iOS release (TestFlight / sklep) — z dev options

Uruchamiaj ponizsze komendy tylko po gate z kroku 4a §3.0: czysty checkout
dokladnie na wypchnietym release tagu. Nie buduj z aktualnego tipa `main`.

```powershell
npx eas-cli build -p ios --profile release --non-interactive --no-wait
npx eas-cli submit -p ios --id <build-id>
```

Po przetworzeniu buildu popros uzytkownika o wklejenie user/tester-friendly
podsumowania z kroku 3 do pola "What to Test" w App Store Connect; poczekaj na
potwierdzenie, ze tekst zostal zapisany. Nie przekazuj wolnego tekstu jako
argumentu natywnego polecenia.

Uwaga:
- `buildNumber` iOS zarzadza **serwer EAS** (remote source); auto-increment
  przy kazdym buildzie. Nie edytuj `ios.buildNumber` w app.config.js.
- Profil `release` ma DevO wlaczone (`EXPO_PUBLIC_APP_VARIANT=test`).
- Profil `production` ma DevO wylaczone — uzywaj tylko do finalnego sklepu.

### 3.3 Android developerski

```bash
npm run android:eas:debug:remote
```

### 3.4 Android release APK (tester, DevO ON)

```bash
npm run android:eas:release:remote
```

### 3.5 Android store AAB (DevO ON)

Najpierw wykonaj gate z kroku 4a §3.0; build musi isc z czystego checkoutu
dokladnie na wypchnietym release tagu.

```bash
npx eas-cli build -p android --profile release --non-interactive --no-wait
```

- Podobnie jak dla iOS: po **FINISHED** buildzie (sprawdz `npx eas-cli build:list`)
  wgrywasz AAB do Google Console automatycznie:

```bash
npx eas-cli submit -p android --profile release --id <android-build-id> --non-interactive
# Alternatywa: buduj i wgrywaj jednym krokiem przy kolejnych buildach
# npx eas-cli build -p android --profile release --auto-submit --non-interactive --no-wait
```

- Submit uzywa profilu `release` z `eas.json` (`submit.release.android.track=internal`),
  klucza wgranego do **EAS Credentials** (Google Service Account) i laduje
  na **Testy wewnetrzne (Internal testing)** w Google Console. Wersja i
  versionCode pochodza z builda (EAS remote) — nic nie edytujesz w konsoli Google.
- Przy automatyzacji agentowej zawsze podawaj `--id` i `--non-interactive`
  (stdin jest niedostepny w nieinteraktywnych sesjach). Interaktywnie
  (`eas submit -p android` bez flag) mozna uruchamiac z wlasnego terminala —
  wtedy EAS CLI sam zaproponuje wybor buildu i profilu.
- Wymagana jednorazowa konfiguracja: Google Service Account Key wgrany
  do EAS Credentials (patrz §1 wyzej). Bez tego submit odmowi z
  "Google Service Account key not found".
- Release notes (user/tester summary z `/make-release`) po submit wklej
  w Google Console w opisie wydania na **Testach wewnetrznych** i potwierdz,
  ze zostal zapisany (EAS Submit nie ustawia notek wydania).
- Jesli kiedys zechcesz wrzucac AAB takze na inne sciezki (beta/production),
  dodaj w `eas.json` `submit.<profil>.android.track` — bez zmian w buildzie.
- Reczny pozostaje upload na `production` (docelowy sklep) — ten build
  nadal tworzy AAB i wgrywasz go wrecz w Play Console (Production → Releases).

### 3.6 Android store AAB (produkcja, bez DevO)

Najpierw wykonaj gate z kroku 4a §3.0; build musi isc z czystego checkoutu
dokladnie na wypchnietym release tagu.

```bash
npx eas-cli build -p android --profile production --non-interactive --no-wait
```

## 4. Wymagane env vars

Sprawdz zmienne:

```bash
npx eas-cli env:list --environment development
npx eas-cli env:list --environment production
```

Minimalnie utrzymuj:
- `EXPO_PUBLIC_API_URL_NATIVE`
- `EXPO_PUBLIC_API_URL_WEB`
- `EXPO_PUBLIC_EAS_PROJECT_ID`
- Google OAuth client IDs (jesli logowanie Google jest wlaczone)
- `GOOGLE_SERVICES_JSON` (type: file) dla Android cloud builds, jesli chcesz wymusic Firebase/Google Services w EAS

Przyklad dodania pliku Firebase do EAS env:

```bash
npx eas-cli env:create development --name GOOGLE_SERVICES_JSON --type file --value "./android/app/google-services.json" --scope project --visibility secret --force --non-interactive
npx eas-cli env:create production --name GOOGLE_SERVICES_JSON --type file --value "./android/app/google-services.json" --scope project --visibility secret --force --non-interactive
```

Jesli nie ustawisz `GOOGLE_SERVICES_JSON` i nie masz lokalnego pliku,
Android build nadal przejdzie, ale bez Google Services. Funkcje zalezne od
niego musza wtedy byc wylaczone albo dzialac bez niego.

## 5. Kiedy uzyc jakiego flow

- Chcesz testowac appke na telefonie szybko (bez sklepu):
  - Android dev client: `android:eas:debug:remote`
  - Android standalone APK: `android:eas:release:remote` (DevO ON)
  - iOS: `development`
- Chcesz wyslac testerom build z opcjami dev (palety) — **release**:
  - iOS `release` + submit do TestFlight (DevO widoczne)
  - Android `release` AAB -> `eas-cli submit` -> Testy wewnetrzne (Google
    Console, klucz Google Service Account w EAS Credentials)
  - lub Android `tester` APK (adb)
- Chcesz przygotowac finalny sklepowy build (bez DevO):
  - iOS `production`
  - Android `production` AAB
- **Pelny procedure release** (z podbiciem wersji, tagiem i opisem zmian):
  patrz sekcja 3.0 powyzej.

## 5.1 Wersjonowanie i numeracja (kluczowe fakty)

| Pole | Kto zarzadza | Gdzie widoczne |
|---|---|---|
| **App version** (np. `1.2.0`) | `npm run release:*` (scripts/version-bump.js) | Oba systemy (Ustawienia), `expo-application.nativeApplicationVersion`, footery w appce |
| **Android versionCode** | **EAS remote** (auto-increment przy EAS build) + plik `build.gradle` (sync przy release) | Google Console, `nativeBuildVersion` |
| **iOS buildNumber** | **EAS remote** (auto-increment) + `CURRENT_PROJECT_VERSION` w pbxproj (sync przy release) | App Store Connect, `nativeBuildVersion` |
| **Tag** `vX.Y.Z` | `release:*` auto | `git tag`, punkt odniesienia dla release:notes |

**Nigdy nie edytuj numeracji recznie** — pliki synchronizuje version-bump.js, a
liczniki buildow trzyma serwer EAS. Ręczna edycja psuje kolejność.

## 6. Skills i dokumenty szczegolowe

Ten dokument jest Source of Truth, a ponizsze pliki sa szczegolowymi instrukcjami dla konkretnych przypadkow:

### 6.1 Jak "zainstalowac" skille lokalnie (setup.py)

Skille sa utrzymywane w `scripts/AIAgents/...` jako source-of-truth i podpinane linkami do lokalizacji oczekiwanych przez narzedzia agenta.

Uruchom z roota repo `frontend`:

```bash
python scripts/AIAgents/setup.py
```

Co robi setup:
- weryfikuje wymagane pliki (fail-fast),
- tworzy linki do `.github/...` i `.claude/...`,
- jest idempotentny (ponowne uruchomienie jest bezpieczne).

Po uruchomieniu nowe skille (w tym Android/iOS EAS) sa dostepne przez linked sciezki.

- iOS TestFlight skill (Copilot):
  - [scripts/AIAgents/CoPilot/skills/ios-testflight-build/SKILL.md](../scripts/AIAgents/CoPilot/skills/ios-testflight-build/SKILL.md)
- iOS TestFlight skill (Claude):
  - [scripts/AIAgents/Claude/skills/ios-testflight-build/SKILL.md](../scripts/AIAgents/Claude/skills/ios-testflight-build/SKILL.md)
- Android EAS build skill (Copilot):
  - [scripts/AIAgents/CoPilot/skills/android-eas-build/SKILL.md](../scripts/AIAgents/CoPilot/skills/android-eas-build/SKILL.md)
- Android EAS build skill (Claude):
  - [scripts/AIAgents/Claude/skills/android-eas-build/SKILL.md](../scripts/AIAgents/Claude/skills/android-eas-build/SKILL.md)
- iOS push E2E runbook (po buildzie TestFlight):
  - [docs/IOS_PUSH_RUNBOOK.md](IOS_PUSH_RUNBOOK.md)

Zasada: nie kopiujemy 1:1 szczegolowych checklist do tego pliku. Tutaj trzymamy decyzje, matrix i linki do procedur wykonawczych.

## 7. Szybkie debugowanie

1. Build pada na Android z bledem `google-services.json is missing`:
- Sprawdz `GOOGLE_SERVICES_JSON` w EAS env (`development` i `production`).
- Sprawdz `android.googleServicesFile` w `app.config.js`.

2. iOS submit odrzucony przez duplikat build number:
- Nie edytuj `ios.buildNumber` w `app.config.js`; EAS zarzadza nim zdalnie.
- Popros uzytkownika o ustawienie wyzszego licznika przez
  `npx eas-cli build:version:set -p ios`, a potem ponownie uruchom krok 4 z
  tym samym release tagiem.

3. Brak zmiennych w buildzie production:
- Dodaj zmienne przez `eas env:create` dla `production`.

## 8. Wlasnosc i aktualizacja

Wlasciciel dokumentu: frontend team.

Aktualizuj ten plik gdy:
- zmienia sie `eas.json`,
- zmienia sie polityka numeracji iOS buildow,
- dochodza nowe profile build,
- zmienia sie sposob dystrybucji (internal/store/TestFlight).
