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

### Workshop Core

- [ ] P0-5: Home lista warsztatow laduje sie poprawnie.
- [ ] P0-6: Otwieranie Workshop Detail dziala.
- [ ] P0-7: User moze Enroll i Unenroll.
- [ ] P0-8: Full workshop blokuje Enroll (stan Full).

### Video Call

- [ ] P0-9: Join przechodzi do Call i laczy pokoj.
- [ ] P0-10: Leave zawsze dziala i wraca do app.
- [ ] P0-11: Host controls Mute All/Unmute All dzialaja.
- [ ] P0-12: Host controls Cameras Off/On dzialaja.

### Trainer CRUD

- [ ] P0-13: Trainer moze Create workshop.
- [ ] P0-14: Trainer moze Edit workshop.
- [ ] P0-15: Trainer moze Delete workshop.
- [ ] P0-16: User bez roli trainer nie moze create/edit/delete.

## P1 - Wazne

### Error/Loading/Empty States

- [ ] P1-1: Home ma poprawny loading state.
- [ ] P1-2: Home error state + Retry dziala.
- [ ] P1-3: Detail not found / error pokazuje czytelny stan.
- [ ] P1-4: My Kalba loading/error/empty sa czytelne.
- [ ] P1-5: Calendar loading/error/empty sa czytelne.

### My Kalba

- [ ] P1-6: Zmiana monthly goal (+/- i presety) dziala.
- [ ] P1-7: Stats i progress sa spojne z danymi.
- [ ] P1-8: Schedule item otwiera Workshop Detail.
- [ ] P1-9: Notifications: unread/all, mark read/unread, delete.
- [ ] P1-10: Mark all as read dziala.

### Calendar

- [ ] P1-11: Przelaczanie Month/Week/Day dziala.
- [ ] P1-12: Nawigacja poprzedni/nastepny okres dziala.
- [ ] P1-13: Today resetuje widok do aktualnej daty.
- [ ] P1-14: Eventy owner/enrolled sa widoczne i rozroznialne.

### Platform Specific

- [ ] P1-15: Mobile permissions camera/mic (allow/deny) obsluzone.
- [ ] P1-16: Web call (iframe) dziala i poprawnie wychodzi z meetingu.
- [ ] P1-17: Mobile DateTimePicker dziala poprawnie dla create.

## P2 - Uzupelniajace / Edge Cases

### UX / Copy / Navigation

- [ ] P2-1: Brak przyciec podczas szybkiego przechodzenia miedzy tabami.
- [ ] P2-2: Teksty, etykiety i placeholdery sa spojne jezykowo.
- [ ] P2-3: Przyciski sa disabled podczas pending mutation.
- [ ] P2-4: Pull-to-refresh nie dubluje rekordow.

### Web Confirm/Alert

- [ ] P2-5: Confirm/alert dla sign out, delete, join errors dziala.

### Accessibility Smoke

- [ ] P2-6: Kluczowe akcje maja sensowne accessibility labels.
- [ ] P2-7: Fokus klawiatury na web nie gubi glownego flow logowania.

## Sugerowana kolejnosc testu release

1. Auth P0 (login/logout).
2. User P0 (home -> detail -> enroll -> call).
3. Trainer P0 (create -> edit -> delete -> call host controls).
4. P1 (my kalba, calendar, states, platform-specific).
5. P2 (edge, UX, a11y).

## Decyzja release

- GO: wszystkie P0 i P1 zaliczone, brak krytycznych regresji.
- NO-GO: jakikolwiek fail w P0 lub niezaakceptowany fail P1.
