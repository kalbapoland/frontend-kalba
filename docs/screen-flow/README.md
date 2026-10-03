# Kalba — screen flow (Android)

Zrzuty pokazują rzeczywisty render aplikacji uruchomionej na emulatorze
Androida, a nie makiety.

- Data: 2026-10-03
- Emulator: AVD na profilu Pixel 6, Android API 36, 1080 × 2400
- Dane: syntetyczne fixtures E2E w tymczasowej, odizolowanej bazie
- Backend: lokalny; bez używania produkcyjnego API i danych użytkowników

## Przepływ ekranów

```mermaid
flowchart TD
  SI[Sign In] --> SU[Sign Up]
  SI --> FP[Forgot Password] --> RP[Reset Password]
  SI --> OR[OAuth Redirect] --> H[Home]

  H --> G[Groups — member]
  G --> GD[Group Detail — member]
  H --> WD[Workshop Detail — member]
  H --> MK[My Kalba]
  H --> CAL[Calendar: month / week / day]
  H --> PR[Profile]

  G --> TG[Groups — trainer]
  TG --> CG[Create Group]
  TG --> GTD[Group Detail — trainer]
  GTD --> EG[Edit Group]
  GTD --> CW[Create Workshop]
  GTD --> WTD[Workshop Detail — trainer]
  WTD --> EW[Edit Workshop]
  WTD --> CALL[Workshop Call — connecting preview]
```

## Zrzuty

Zestaw bazowy znajduje się w `DEFAULT/`. Kolejne eksperymenty wizualne
zapisuj jako osobne zestawy, nie nadpisując `DEFAULT`.

| # | Ekran | Kontekst | Screenshot |
|---:|---|---|---|
| 01 | Sign In | Logowanie | [01-sign-in.png](./DEFAULT/01-sign-in.png) |
| 02 | Sign Up | Rejestracja | [02-sign-up.png](./DEFAULT/02-sign-up.png) |
| 03 | Forgot Password | Odzyskiwanie hasła | [03-forgot-password.png](./DEFAULT/03-forgot-password.png) |
| 04 | Reset Password | Formularz z testowym, nieużytym tokenem | [04-reset-password.png](./DEFAULT/04-reset-password.png) |
| 05 | OAuth Redirect | Przejściowy ekran ładowania | [05-oauth-redirect.png](./DEFAULT/05-oauth-redirect.png) |
| 06 | Home | Użytkownik | [06-home-user.png](./DEFAULT/06-home-user.png) |
| 07 | Groups | Użytkownik | [07-groups-user.png](./DEFAULT/07-groups-user.png) |
| 08 | Group Detail | Członek grupy | [08-group-detail-member.png](./DEFAULT/08-group-detail-member.png) |
| 09 | Workshop Detail | Zapisany uczestnik | [09-workshop-detail-member.png](./DEFAULT/09-workshop-detail-member.png) |
| 10 | My Kalba | Cel, statystyki, harmonogram i powiadomienia | [10-my-kalba.png](./DEFAULT/10-my-kalba.png) |
| 11 | Calendar — month | Widok miesięczny | [11-calendar-month.png](./DEFAULT/11-calendar-month.png) |
| 12 | Calendar — week | Widok tygodniowy | [12-calendar-week.png](./DEFAULT/12-calendar-week.png) |
| 13 | Calendar — day | Widok dzienny | [13-calendar-day.png](./DEFAULT/13-calendar-day.png) |
| 14 | Profile | Użytkownik | [14-profile-user.png](./DEFAULT/14-profile-user.png) |
| 15 | Groups | Trener | [15-groups-trainer.png](./DEFAULT/15-groups-trainer.png) |
| 16 | Create Group | Trener | [16-create-group.png](./DEFAULT/16-create-group.png) |
| 17 | Group Detail | Właściciel grupy / trener | [17-group-detail-trainer.png](./DEFAULT/17-group-detail-trainer.png) |
| 18 | Edit Group | Trener | [18-edit-group.png](./DEFAULT/18-edit-group.png) |
| 19 | Create Workshop | Trener | [19-create-workshop.png](./DEFAULT/19-create-workshop.png) |
| 20 | Workshop Detail | Właściciel warsztatu / trener | [20-workshop-detail-trainer.png](./DEFAULT/20-workshop-detail-trainer.png) |
| 21 | Edit Workshop | Trener | [21-edit-workshop.png](./DEFAULT/21-edit-workshop.png) |
| 22 | Workshop Call | Ekran „Connecting…” | [22-workshop-call-placeholder.png](./DEFAULT/22-workshop-call-placeholder.png) |

## Zbiorczy podgląd

![Kontakt sheet wszystkich 22 zrzutów](./DEFAULT/overview.png)

## Jak wygenerować ponownie

1. Uruchom lokalny backend i tymczasową bazę (patrz `backend` — skill
   `start-local-backend`), a następnie zaseeduj fixtures:

   ```powershell
   python test/automated/prepare_mobile_e2e.py
   ```

2. Zbuduj i zainstaluj release build na emulatorze:

   ```powershell
   npm run android:release:local
   ```

3. Uruchom flows, wskazując katalog wyjściowy Maestro:

   ```powershell
   maestro --device emulator-5554 test `
     --test-output-dir docs/screen-flow/<ZESTAW> `
     test/automated/maestro/flows/screen-flow/capture_user.yaml
   ```

   Powtórz dla `capture_trainer.yaml` i `capture_call_placeholder.yaml`.

4. Maestro zapisuje PNG w podkatalogu `screenshots/` wewnątrz katalogu
   wyjściowego. Przenieś je do katalogu zestawu i usuń katalogi debugowe
   z datami — dopiero wtedy pliki trafiają do `DEFAULT/` lub nowego zestawu.

Zestaw `DEFAULT` odtwarzaj tylko wtedy, gdy chcesz świadomie zmienić
baseline. Nowe eksperymenty zapisuj w osobnym katalogu.

## Uwagi

- Ekrany Sign Up, Reset Password i OAuth Redirect to stany tego samego
  przepływu uwierzytelniania; Reset Password pokazuje formularz, ale nie
  wysyła żądania zmiany hasła.
- Ekran rozmowy został otwarty z testowym tokenem i zarezerwowanym adresem
  `example.invalid`. Pokazuje widok łączenia, nie aktywne połączenie Daily
  ani kontrolki rozmowy. Nie używałem skonfigurowanych poświadczeń Daily
  ani kamery/mikrofonu hosta.
- To zrzuty Androida. iOS Simulator wymaga macOS; osobny render webowy nie
  jest częścią tej galerii.
- Odtwarzalne flows Maestro:
  [użytkownik](../../test/automated/maestro/flows/screen-flow/capture_user.yaml),
  [trener](../../test/automated/maestro/flows/screen-flow/capture_trainer.yaml),
  [podgląd połączenia](../../test/automated/maestro/flows/screen-flow/capture_call_placeholder.yaml).
