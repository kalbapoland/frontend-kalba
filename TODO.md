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

- **`trainer_delete_group_smoke`** — Trainer usuwa grupę: nawigacja do grupy → long-press lub przycisk delete → potwierdzenie → weryfikacja że karta grupy znikła z listy. Testuje DELETE /groups/{id} + cascade na warsztatach i uczestnikach.

- **`trainer_create_workshop_date_smoke`** — Trainer tworzy warsztat z datą/godziną: weryfikacja działania date/time pickera, zapis daty w DB, wyświetlenie na szczegółach warsztatu. Testuje najbardziej złożony element formularza tworzenia warsztatu.

- **`user_home_workshops_smoke`** — Użytkownik zapisany na warsztat widzi go na zakładce Home: user loguje się, przechodzi na Home, weryfikuje że lista `home.workshops.list` zawiera warsztat na który się zapisał (zależność od `user_group_subscribe_enroll_smoke`).

### Średni priorytet

- **`trainer_video_join_smoke`** — Trainer dołącza do sesji wideo: tapnięcie "Start session" → token Daily.co zwrócony → ekran wideo załadowany. Weryfikuje integrację z Daily.co (POST /video/workshops/{id}/join jako host).

- **`user_negative_login_smoke`** — Próba logowania złymi danymi: wpisanie błędnego hasła → komunikat błędu widoczny na ekranie. Weryfikuje obsługę błędów auth flow.

### Niski priorytet

- **`trainer_workshop_full_smoke`** — Warsztat zapełniony blokuje zapis: trainer tworzy warsztat z max_participants=1, pierwszy user się zapisuje, drugi user próbuje → widzi komunikat "warsztat pełny". Testuje logikę limitu uczestników.