# iOS Push Runbook (TestFlight)

Ten runbook opisuje szybki test end-to-end powiadomien push dla iOS na produkcji.

## Cel

Potwierdzic, ze dziala pelny flow:
- rejestracja tokena iOS,
- wysylka remindera przez backend,
- dostarczenie push na iPhone.

## Warunki wstepne

1. Build TestFlight jest zainstalowany na iPhonie.
2. Uzytkownik ma role TRAINER.
3. Powiadomienia dla aplikacji sa wlaczone w iOS (Lock Screen, Banners, Sounds).
4. Focus / Do Not Disturb jest wylaczony.

## Procedura testowa

1. Otworz aplikacje na iPhonie i zaloguj sie jako TRAINER.
2. Odczekaj 10-20 sekund po starcie aplikacji.
3. W backend logach potwierdz rejestracje tokena:
   - PUT /api/v1/users/me/push-tokens 204
   - Push token upserted for user ... on ios
4. Utworz nowy workshop z czasem startu za 61 minut.
5. Zablokuj telefon i czekaj na reminder (powinien wejsc okolo 1 minuty po utworzeniu workshopa przy domyslnym reminder_minutes_before=60).
6. W backend logach potwierdz wysylke remindera:
   - Reminder fired for workshop ...
   - Push dispatch: sent=... invalidated=... failed=...

## Oczekiwany wynik

1. iPhone pokazuje push reminder na lock screen.
2. W logach backendu widac jednoczesnie event remindera i dispatch bez fail.

## Szybkie debugowanie

1. Brak PUT /users/me/push-tokens:
   - problem po stronie aplikacji (token nie zostal zarejestrowany).
2. Jest PUT, ale brak Reminder fired:
   - workshop nie wszedl jeszcze w okno remindera (sprawdz start_time i reminder_minutes_before).
3. Jest Reminder fired, ale brak push na telefonie:
   - sprawdz ustawienia iOS (alerts/focus/summary) oraz czy user nie ma wielu aktywnych tokenow.
4. Build nie pojawia sie w TestFlight:
   - sprawdz App Encryption Documentation i status Processing w App Store Connect.

## Komenda do logow produkcyjnych

Uzyj tej komendy podczas testu:

```powershell
fly logs --app backend-kalba --no-tail | Select-String -Pattern "\/api\/v1\/users\/me\/push-tokens|Push token upserted|Reminder fired|Push dispatch"
```
