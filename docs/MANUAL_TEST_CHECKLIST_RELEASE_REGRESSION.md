# Manual Release Regression Checklist (P0/P1/P2)

Cel: pelna regresja przed release.
Zakres: frontend Kalba (web + mobile), role `user` i `trainer`.

## Jak czytac priorytety

- P0: blocker / krytyczne flow biznesowe. Musi przejsc 100%.
- P1: wazne flow produktowe. Brak P1 fail dla releasu produkcyjnego.
- P2: uzupelniajace i UX-edge case. Moze byc odlozone po decyzji zespolu.

## P0 - Krytyczne

### Auth

- [ ] P0-1: Sign In email+haslo (happy path).
- [ ] P0-2: Sign In Google (happy path).
- [ ] P0-3: Sign Out zawsze czysci sesje i wraca do Sign In.
- [ ] P0-4: Bez tokena nie da sie wejsc do strefy chronionej.
- [ ] P0-4a: Sign Up email+haslo wymaga imienia (Name); puste imie blokuje rejestracje.
- [ ] P0-4b: Reset hasla E2E: Forgot password -> mail z linkiem -> nowe haslo -> stare haslo NIE dziala.

### Workshop Core

- [ ] P0-5: Home lista warsztatow laduje sie poprawnie.
- [ ] P0-6: Otwieranie Workshop Detail dziala.
- [ ] P0-7: User moze Enroll i Unenroll.
- [ ] P0-8: Full workshop blokuje Enroll (stan Full).

### Groups Core

- [ ] P0-9: Groups tab laduje sekcje My Groups i Discover Groups.
- [ ] P0-10: User moze Subscribe i Unsubscribe grupy.
- [ ] P0-11: Group Detail otwiera sie i pokazuje poprawne dane grupy.
- [ ] P0-12: Dla ownera grupy widoczne sa akcje admina (Edit group, Create workshop).

### Video Call

- [ ] P0-13: Join przechodzi do Call i laczy pokoj.
- [ ] P0-14: Leave zawsze dziala i wraca do app.
- [ ] P0-15: Host controls Mute All/Unmute All dzialaja.
- [ ] P0-16: Host controls Cameras Off/On dzialaja.

### Trainer CRUD

- [ ] P0-17: Trainer moze Create group.
- [ ] P0-18: Trainer-owner moze Edit group.
- [ ] P0-19: Trainer-owner moze Create workshop w kontekscie grupy.
- [ ] P0-20: Trainer moze Edit workshop.
- [ ] P0-21: Trainer moze Delete workshop.
- [ ] P0-22: User bez roli trainer nie moze create/edit/delete group/workshop.

## P1 - Wazne

### Auth / Reset hasla / Imie

- [ ] P1-A1: Strona resetu (web) - rozne hasla -> "Passwords don't match.".
- [ ] P1-A2: Token nieprawidlowy / wygasly (>60 min) / uzyty -> komunikat o blednym/wygaslym linku.
- [ ] P1-A3: Forgot password dla nieistniejacego / Google-only konta -> ten sam komunikat, brak maila (bez wycieku informacji).
- [ ] P1-A4: Reset wylogowuje inne sesje (refresh tokeny uniewaznione).
- [ ] P1-A5: Imie wyswietla sie poprawnie (Profile + powitanie na Home); fallback do czesci emaila gdy brak imienia.
- [ ] P1-A6 (znane ryzyko): mail resetu moze trafic do spamu (wysylka z adresu Gmail przez Brevo) - zanotuj gdzie dotarl (Inbox/Spam) i na jakiej skrzynce.

### Error/Loading/Empty States

- [ ] P1-1: Home ma poprawny loading state.
- [ ] P1-2: Home error state + Retry dziala.
- [ ] P1-3: Detail not found / error pokazuje czytelny stan.
- [ ] P1-4: Groups loading/error/empty sa czytelne.
- [ ] P1-5: Group Detail loading/error/empty sa czytelne.
- [ ] P1-6: My Kalba loading/error/empty sa czytelne.
- [ ] P1-7: Calendar loading/error/empty sa czytelne.

### My Kalba

- [ ] P1-8: Zmiana monthly goal (+/- i presety) dziala.
- [ ] P1-9: Stats i progress sa spojne z danymi.
- [ ] P1-10: Schedule item otwiera Workshop Detail.
- [ ] P1-11: Notifications: unread/all, mark read/unread, delete.
- [ ] P1-12: Mark all as read dziala.

### Calendar

- [ ] P1-13: Przelaczanie Month/Week/Day dziala.
- [ ] P1-14: Nawigacja poprzedni/nastepny okres dziala.
- [ ] P1-15: Today resetuje widok do aktualnej daty.
- [ ] P1-16: Eventy owner/enrolled sa widoczne i rozroznialne.

### Group Management

- [ ] P1-17: Remove member przez ownera grupy dziala.
- [ ] P1-18: Nie-owner nie widzi akcji Remove member.

### Platform Specific

- [ ] P1-19: Mobile permissions camera/mic (allow/deny) obsluzone.
- [ ] P1-20: Web call (iframe) dziala i poprawnie wychodzi z meetingu.
- [ ] P1-21: Mobile DateTimePicker dziala poprawnie dla create workshop.

## P2 - Uzupelniajace / Edge Cases

### UX / Copy / Navigation

- [ ] P2-1: Brak przyciec podczas szybkiego przechodzenia miedzy tabami.
- [ ] P2-2: Teksty, etykiety i placeholdery sa spojne jezykowo.
- [ ] P2-3: Przyciski sa disabled podczas pending mutation.
- [ ] P2-4: Pull-to-refresh nie dubluje rekordow (Home i Groups).

### Web Confirm/Alert

- [ ] P2-5: Confirm/alert dla sign out, delete, join errors dziala.

### Accessibility Smoke

- [ ] P2-6: Kluczowe akcje maja sensowne accessibility labels.
- [ ] P2-7: Fokus klawiatury na web nie gubi glownego flow logowania.

## Sugerowana kolejnosc testu release

1. Auth P0 (login/logout).
2. User P0 (home -> groups -> group detail -> workshop detail -> enroll -> call).
3. Trainer P0 (create/edit group -> create/edit/delete workshop -> call host controls).
4. P1 (my kalba, calendar, states, platform-specific).
5. P2 (edge, UX, a11y).

## Decyzja release

- GO: wszystkie P0 i P1 zaliczone, brak krytycznych regresji.
- NO-GO: jakikolwiek fail w P0 lub niezaakceptowany fail P1.
