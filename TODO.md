# TODO

## Bugi

- **Migotanie ekranu podczas logowania OAuth (android:debug:remote)** — Podczas logowania przez Google OAuth na Androidzie, gdy okno OAuth się zamyka i aplikacja wraca na pierwszy plan, przez chwilę widoczny jest niezalogowany ekran (pusty ekran logowania / główne menu) zanim nastąpi przejście do ekranu po zalogowaniu. Prawdopodobna przyczyna: race condition między powrotem z OAuth a zapisaniem/odczytaniem JWT — stan auth przez jeden cykl renderowania wygląda jak niezalogowany, a zamknięcie okna OAuth odsłania poprzedni ekran zanim token dotrze. Naprawa: pokazać overlay z loadingiem w momencie między odebraniem wyniku OAuth a potwierdzeniem stanu auth, żeby ekran logowania nie był widoczny w trakcie przepływu.
- **Brak scrolla na ekranie logowania** — Ekran logowania nie przewija się przy mniejszych wysokościach ekranu / większych ustawieniach czcionki, przez co część treści i przycisk logowania może być ucięta i niedostępna. Naprawa: opakować zawartość w `ScrollView` (lub `KeyboardAwareScrollView`) z odpowiednim `contentContainerStyle` i zachowaniem safe area.
Najlepiej byloby zaprojektowac go tak aby nie trzeba bylo scrollowac.

## Architektura — do zrobienia

- **Migracja błędów API na kody** — Backend powinien zwracać kody błędów (`SCREAMING_SNAKE_CASE`, np. `INVALID_CREDENTIALS`, `USER_ALREADY_EXISTS`, `WORKSHOP_FULL`) zamiast angielskich stringów. Frontend mapuje kody na zlokalizowane teksty przez `t()`. Dotyczy wszystkich endpointów (auth, groups, workshops, video). Zmiany w obu repozytoriach (oba).

- **Zdefiniować zachowanie przy usunięciu grupy** — Obecny `DELETE /groups/{id}` robi tylko soft-delete grupy bez kaskady. Brak zdefiniowanego zachowania dla: workshopów w grupie (duchy w feedzie bo `_caller_group_ids` nie filtruje po `Group.deleted_at`), membershipów, enrollmentów, pokoi Daily.co. PR #87 (frontend: przycisk Delete Group + smoke test) zdraftowany do czasu rozwiązania. Opcje: (a) blokuj usunięcie jeśli grupa ma workshopy `422`; (b) cascade soft-delete workshopów wraz z grupą; (c) blokuj tylko przy przyszłych workshopach. Zmiany w obu repozytoriach (oba).

## Smoke testy — do zaimplementowania

Brakujące przepływy dla lepszego pokrycia E2E (kolejność wg priorytetu):

### Wysoki priorytet

- ~~**`user_delete_account_smoke`**~~ — **GOTOWE** (`flows/smoke/user_delete_account_smoke.yaml`). Rejestracja świeżego konta → profil → podwójne potwierdzenie usunięcia → weryfikacja powrotu do ekranu logowania.

- **`user_edit_profile_name_smoke`** — ⚠️ **WYMAGA IMPLEMENTACJI FUNKCJI NAJPIERW**: Zmiana imienia/nazwy wyświetlanej użytkownika. Brak ekranu edycji profilu i endpointu PATCH /users/me. Kroki do zbudowania: (1) backend: PATCH /users/me z walidacją `full_name`, (2) frontend: przycisk/modal edycji nazwy na ekranie Profil + testID `profile.editname.button`, (3) maestro test: profil → edit → zmiana nazwy → weryfikacja że karta wyświetla nową nazwę.

- **`user_change_password_smoke`** — Zmiana hasła z poziomu profilu. Brak ekranu zmiany hasła w UI. Wymaga: (1) endpointu POST /auth/change-password (backend), (2) ekranu w profilu (frontend), (3) testu Maestro.

- **`trainer_delete_group_smoke`** — Trainer usuwa grupę: nawigacja do grupy → long-press lub przycisk delete → potwierdzenie → weryfikacja że karta grupy znikła z listy. Testuje DELETE /groups/{id} + cascade na warsztatach i uczestnikach. **Zablokowane przez**: nieokreślone zachowanie kasowania grupy (patrz sekcja Architektura).

### Średni priorytet

- ~~**`user_negative_register_smoke`**~~ — **GOTOWE** (`flows/smoke/user_negative_register_smoke.yaml`). Rejestracja z `e2e.user@kalba.dev` (już istnieje) → Alert "Sign Up Failed" / "User already exists".

- **`user_notification_deep_link_smoke`** — Tapnięcie notyfikacji push otwiera właściwy ekran warsztatu (deep link). Wymaga symulacji notyfikacji lub testowego endpointu wyzwalającego notyfikację w urządzeniu.

- **`trainer_video_join_smoke`** — Trainer dołącza do sesji wideo: tapnięcie "Start session" → token Daily.co zwrócony → ekran wideo załadowany. Weryfikuje integrację z Daily.co (POST /video/workshops/{id}/join jako host).

### Niski priorytat / odłożone

- ~~**`user_negative_enroll_full_smoke`**~~ — **GOTOWE** (`flows/smoke/user_negative_enroll_full_smoke.yaml`). Tap na wyłączony przycisk "Full" nie wywołuje enrollmentu — weryfikacja że stan nie zmienia się po tapnięciu.

- **`trainer_workshop_full_smoke`** — Warsztat zapełniony blokuje zapis: trainer tworzy warsztat z max_participants=1, pierwszy user się zapisuje, drugi user próbuje → widzi komunikat "warsztat pełny". Testuje logikę limitu uczestników.

- **`trainer_video_join_smoke`** / **`user_video_join_smoke`** — Flow wideo (Daily.co). Odkładamy do Phase 4 implementacji wideo.

## Smoke testy — infrastruktura

- **Flakiness lokalnego runnera — naprawione** — Per-flow retry (max 2 próby, 5s delay) + `stdout=DEVNULL` na backendzie (koniec ze stallem pętli wielokrotnych runów). `user_register_smoke` celowo bez retry (hardcoded email → 409 przy retry). Zweryfikować stabilność w kolejnych sesjach.