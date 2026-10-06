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
- `release`: `distribution: store`, Android `buildType: app-bundle` (AAB), `EXPO_PUBLIC_APP_VARIANT=test` (DevO ON); build number/version podbija EAS dla obu platform
- `production`: `distribution: store`, `EXPO_PUBLIC_APP_VARIANT=production` (DevO NIEISTNIEJE)

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
| Android | Store AAB (DevO ON) | `release` | **AAB** | **TAK** | Do Google Console |
| Android | Store AAB (produkcja) | `production` | AAB | nie | Do Google Console |

## 3. Komendy EAS (podstawowe)

Uruchamiaj z katalogu `frontend`.

### 3.0 Release flow (PEŁNA PROCEDURA — wersjonowanie/tagi/opis zmian)

```powershell
# 1. (na main, po zmergowaniu feature'ów) Podbicie wersji: minor | major | patch
npm run release:minor
# -> commit `chore: bump version to X.Y.Z` + GIT TAG vX.Y.Z
# -> synchronizuje: app.config.js, package.json,
#    android/app/build.gradle (versionCode +1, versionName),
#    ios/Kalba/Info.plist (CFBundleShortVersionString),
#    ios/Kalba.xcodeproj/project.pbxproj (MARKETING_VERSION + CURRENT_PROJECT_VERSION +1)
# -> czytaRemote EAS buildNumber, by lokalny licznik iOS go nie cofnal.

# 2. Push main + tag
git push origin main --follow-tags

# 3. Zbuduj oba store artefakty (z dev options dla testerow!)
npx eas-cli build -p android --profile release --non-interactive --no-wait
npx eas-cli build -p ios --profile release --non-interactive --no-wait

# 4. Opis zmian (wszystko co zaszlo od poprzedniego taga)
npm run release:notes          # pelny markdown (PR-linked, per section)
npm run release:notes:short    # <= 500 znakow — Google Console release notes
```

Punkty 1-4 sa obowiazkowe dla kazdego release. Wersja mija automatycznie
(Android versionCode, iOS buildNumber — EAS auto-increment), wersja marketingowa
przyjmuje wartosc z taga przez synchronizowane pliki natywne.

### 3.1 iOS developerski

```bash
npx eas-cli build -p ios --profile development
```

### 3.2 iOS release (TestFlight / sklep) — z dev options

```bash
npx eas-cli build -p ios --profile release --non-interactive --no-wait
npx eas-cli submit -p ios --id <build-id> --what-to-test "$(npm run --silent release:notes:short | tr -d '\n')"
```

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

```bash
npx eas-cli build -p android --profile release --non-interactive --no-wait
```

- Artefakt AAB wgrywasz recznie do Google Console (Play App Signing).

### 3.6 Android store AAB (produkcja, bez DevO)

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
  - Android `release` AAB -> Google Console (manual)
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
- Podnies `ios.buildNumber` w `app.config.js` i zrob nowy build.

3. Brak zmiennych w buildzie production:
- Dodaj zmienne przez `eas env:create` dla `production`.

## 8. Wlasnosc i aktualizacja

Wlasciciel dokumentu: frontend team.

Aktualizuj ten plik gdy:
- zmienia sie `eas.json`,
- zmienia sie polityka numeracji iOS buildow,
- dochodza nowe profile build,
- zmienia sie sposob dystrybucji (internal/store/TestFlight).
