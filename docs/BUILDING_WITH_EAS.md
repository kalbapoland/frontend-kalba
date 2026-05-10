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
- `production`: `distribution: store`

Konfiguracja natywna Expo jest w:
- [app.config.js](../app.config.js)

Wazne:
- iOS `buildNumber` jest kontrolowany lokalnie w `app.config.js`.
- Android `googleServicesFile` wspiera EAS file env var:
  - `process.env.GOOGLE_SERVICES_JSON ?? "./android/app/google-services.json"`

## 2. Build matrix (co i po co)

| Platform | Typ | Profil EAS | Artefakt | Lokalna instalacja na telefonie |
|---|---|---|---|---|
| iOS | Developerski | `development` | dev client (internal) | Tak (na zarejestrowanym urzadzeniu / dev flow) |
| iOS | Produkcyjny | `production` | store/TestFlight | Przez TestFlight (nie bezposrednio z pliku jak APK) |
| Android | Developerski | `development` | internal build | Tak |
| Android | Produkcyjny | `production` | store build (pod publikacje) | Zwykle nie jako prosty sideload; do sklepu |

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
npx eas-cli build -p android --profile development
```

### 3.4 Android produkcyjny

```bash
npx eas-cli build -p android --profile production
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
- `GOOGLE_SERVICES_JSON` (type: file) dla Android cloud builds

Przyklad dodania pliku Firebase do EAS env:

```bash
npx eas-cli env:create development --name GOOGLE_SERVICES_JSON --type file --value "./android/app/google-services.json" --scope project --visibility secret --force --non-interactive
npx eas-cli env:create production --name GOOGLE_SERVICES_JSON --type file --value "./android/app/google-services.json" --scope project --visibility secret --force --non-interactive
```

## 5. Kiedy uzyc jakiego flow

- Chcesz testowac appke na telefonie szybko (bez sklepu):
  - Android: `development`
  - iOS: `development`
- Chcesz wyslac iOS do testerow businessowych:
  - iOS `production` + submit do TestFlight
- Chcesz przygotowac release store:
  - iOS `production`
  - Android `production`

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
