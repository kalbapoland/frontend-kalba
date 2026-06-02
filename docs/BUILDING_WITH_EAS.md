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
- `tester`: `distribution: internal`, Android `buildType: apk`
- `production`: `distribution: store`

Konfiguracja natywna Expo jest w:
- [app.config.js](../app.config.js)

Wazne:
- iOS `buildNumber` jest kontrolowany lokalnie w `app.config.js`.
- Android wlacza Google Services tylko gdy plik jest dostepny:
  - `process.env.GOOGLE_SERVICES_JSON`
  - lokalnie: `./android/app/google-services.json`
  - przy buildzie cloud, jesli `GOOGLE_SERVICES_JSON` wskazuje na plik tymczasowy EAS,
    skrypt Gradle kopiuje go automatycznie do `android/app/google-services.json`
    przed aktywacja pluginu `com.google.gms.google-services`

## 2. Build matrix (co i po co)

| Platform | Typ | Profil EAS | Artefakt | Lokalna instalacja na telefonie |
|---|---|---|---|---|
| iOS | Developerski | `development` | dev client (internal) | Tak (na zarejestrowanym urzadzeniu / dev flow) |
| iOS | Produkcyjny | `production` | store/TestFlight | Przez TestFlight (nie bezposrednio z pliku jak APK) |
| Android | Debug (remote) | `development` | dev client (internal) | Tak |
| Android | Release APK (remote) | `tester` | standalone APK (internal) | Tak |
| Android | Store release (remote) | `production` | AAB (store) | Do sklepu |

## 3. Komendy EAS (podstawowe)

Uruchamiaj z katalogu `frontend`.

### 3.1 iOS developerski

```bash
npx eas-cli build -p ios --profile development
```

### 3.2 iOS produkcyjny (TestFlight)

```bash
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios --latest
```

Uwaga:
- `buildNumber` na iOS musi byc unikalny w App Store Connect dla danej wersji.

### 3.3 Android developerski

```bash
npm run android:eas:debug:remote
```

### 3.4 Android release APK (tester)

```bash
npm run android:eas:release:remote
```

### 3.5 Android store release

```bash
npm run android:eas:store:remote
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
  - Android standalone APK: `android:eas:release:remote`
  - iOS: `development`
- Chcesz wyslac iOS do testerow businessowych:
  - iOS `production` + submit do TestFlight
- Chcesz przygotowac release store:
  - iOS `production`
  - Android `android:eas:store:remote`

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
