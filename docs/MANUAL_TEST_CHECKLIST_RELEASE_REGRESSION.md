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
- [ ] P0-4c: Usuwanie konta (Profile -> Delete account, podwojne potwierdzenie) usuwa konto i dane oraz wylogowuje; ponowne logowanie tymi danymi NIE dziala.

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
- [ ] P0-16a: Daily budzet — gdy miesieczny limit minut przekroczony, Join zwraca komunikat "video temporarily unavailable" (503) i NIE laczy pokoju (host i uczestnik). Sprawdz GET /api/v1/video/budget: used_minutes blisko cap_minutes.
- [ ] P0-16b: Pokoj Daily jest prywatny — sam URL pokoju (bez tokenu) nie pozwala dolaczyc.

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
- [ ] P1-A7: Link "Privacy Policy" w Profile otwiera strone polityki prywatnosci (po polsku) w przegladarce.
- [ ] P1-A8: Usuwanie konta - "Cancel" na ktorymkolwiek z dwoch potwierdzen NIE usuwa konta; trainer z wlasnymi grupami/warsztatami tez moze usunac konto (jego tresci znikaja).

### Error/Loading/Empty States

- [ ] P1-1: Home ma poprawny loading state (skeleton karty, nie spinner).
- [ ] P1-2: Home error state + Retry dziala (nowy EmptyState z przyciskiem Try again).
- [ ] P1-2a: Home empty state pokazuje CTA "Browse groups" i przenosi do Groups.
- [ ] P1-3: Detail not found / error pokazuje czytelny stan (EmptyState).
- [ ] P1-4: Groups loading/error/empty sa czytelne (skeleton przy ladowaniu).
- [ ] P1-5: Group Detail loading/error/empty sa czytelne (skeleton, EmptyState z Go back).
- [ ] P1-6: My Kalba loading/error/empty sa czytelne (skeleton przy ladowaniu).
- [ ] P1-7: Calendar loading/error/empty sa czytelne.

### Redesign UI/UX (2026-06)

- [ ] P1-R1: Fonty Fraunces (naglowki) i Inter (tekst) laduja sie na iOS, Android i web; brak fallbacku systemowego.
- [ ] P1-R2: Karty warsztatu na Home pokazuja blok daty (dzien tygodnia + numer dnia), czas, czas trwania, miejsca i cene jako badge ("Free" z zielonym tlem).
- [ ] P1-R3: Tab bar: wskaznik aktywnej zakladki przesuwa sie plynnie miedzy ikonami; ikona aktywna lekko powiekszona.
- [ ] P1-R4: Haptyka (native): lekki impuls przy zmianie taba i tapnieciu karty; wibracja sukcesu po enroll/subscribe/zapisie formularza; brak crasha na web.
- [ ] P1-R5: Animacje wejscia kart (fade+slide) na Home, Groups, My Kalba i Profile; brak laga przy dlugiej liscie.
- [ ] P1-R6: Naglowek Home: powitanie zalezne od pory dnia (przetlumaczone PL/EN) + imie w foncie serif + dekoracyjne "oddychajace" kolo.
- [ ] P1-R7: Reduce Motion w systemie wylacza animacje wejscia, oddychania i skeleton pulse (brak ruchu).
- [ ] P1-R8: Profile: dialogi Sign Out / Delete account sa przetlumaczone (PL/EN); Sign Out jako przycisk z ikona.

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
- [ ] P1-22: Ekran Call obraca sie z telefonem - poziomo daje widok landscape, pionowo wraca do portrait (obraz kamery nie wraca samoczynnie do pionu).
- [ ] P1-23: Po wyjsciu z Call (leave / back / blad) aplikacja wraca do orientacji portrait.
- [ ] P1-24: Pozostale ekrany (Home, Groups, Workshop detail, Profile) NIE obracaja sie - zostaja w portrait mimo obracania telefonu.

## P2 - Uzupelniajace / Edge Cases

### UX / Copy / Navigation

- [ ] P2-1: Brak przyciec podczas szybkiego przechodzenia miedzy tabami.
- [ ] P2-2: Teksty, etykiety i placeholdery sa spojne jezykowo.
- [ ] P2-3: Przyciski sa disabled podczas pending mutation.
- [ ] P2-4: Pull-to-refresh nie dubluje rekordow (Home i Groups).
- [ ] P2-4a: Typografia spojna na wszystkich ekranach (serif naglowki, Inter tekst); brak ekranow ze starym systemowym fontem.
- [ ] P2-4b: Karty grup pokazuja awatar z inicjalem grupy; badge Admin widoczny dla ownera.

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
