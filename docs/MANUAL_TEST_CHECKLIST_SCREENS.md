# Manual Test Checklist (Screen-by-Screen)

Cel: lista czynnosci dla testera, aby przejsc ekran po ekranie bez zgadywania kolejnosci.
Zakres: frontend Kalba (Expo), flow dla roli `user` i `trainer`, web + mobile (Android/iOS) tam gdzie zachowanie sie rozni.

## 1. Przygotowanie przed testem

1. Uruchom backend i frontend w srodowisku testowym.
2. Przygotuj 2 konta:
- konto A: rola `user`
- konto B: rola `trainer`
3. Przygotuj przynajmniej 3 warsztaty:
- warsztat z wolnymi miejscami
- warsztat pelny (max uczestnikow osiagniete)
- warsztat utworzony przez konto `trainer`
4. Sprawdz, ze sa dostepne dane do logowania email+haslo i Google OAuth.
5. Dla testow video miej 2 urzadzenia/przegladarki (host + uczestnik).

## 2. Scenariusz E2E: USER (kolejnosc ekranow)

### Ekran 1: Sign In / Sign Up

1. Otworz aplikacje bez aktywnej sesji.
2. Zweryfikuj widok logowania (tryb Login domyslnie).
3. Przelacz na Sign Up i z powrotem na Login.
4. Walidacje formularza:
- puste email/haslo -> komunikat o brakujacych danych
- niepoprawny email -> komunikat walidacji
- bledne dane logowania -> komunikat o blednych danych
5. Zaloguj sie poprawnie przez email+haslo.
6. Wyloguj sie i zaloguj przez Google (happy path).
7. Anuluj Google login (dismiss) i sprawdz, ze app nie wpada w crash.

### Ekran 2: OAuth Redirect

1. Po poprawnym Google login sprawdz ekran ladowania.
2. Zweryfikuj automatyczne przejscie do sekcji chronionej `(tabs)`.
3. Negatywny przypadek: brak tokena po timeout -> powrot do Sign In.

### Ekran 3: Home / Workshops List

1. Sprawdz stan ladowania (spinner).
2. Sprawdz stan bledu (wymus np. brak sieci) i przycisk Retry.
3. Sprawdz liste warsztatow:
- poprawne tytuly, data, godzina, cena, liczba miejsc
- otwarcie detailu po kliknieciu kafelka
4. Pull-to-refresh:
- odswiez dane
- brak duplikatow na liscie
5. Dla roli `user` potwierdz brak przycisku tworzenia (FAB).

### Ekran 4: Workshop Detail

1. Otworz warsztat z listy.
2. Zweryfikuj sekcje:
- tytul, data, godzina
- opis (w tym hashtagi)
- szczegoly: duration, spots, price, timezone
3. Enroll flow:
- kliknij Enroll -> status zmienia sie na Unenroll
- licznik uczestnikow aktualizuje sie
4. Unenroll flow:
- kliknij Unenroll -> powrot do stanu Enroll
5. Full workshop:
- przy pelnym warsztacie przycisk Enroll nieaktywny / stan `Full`
6. Join flow:
- kliknij Join -> przejscie do ekranu Call

### Ekran 5: Workshop Call (user)

1. Sprawdz ekran laczenia (Connecting...).
2. Po dolaczeniu sprawdz:
- widok video (self/remote)
- licznik czasu polaczenia
- liczbe uczestnikow
3. Przyciski dolne:
- mute/unmute mikrofonu
- camera on/off (jesli dozwolone)
- flip camera (mobile)
- leave call
4. Dla kontroli hosta:
- host wysyla `mute all` -> user zostaje wyciszony
- host wysyla `cameras off all` -> user traci video
5. Leave call -> powrot do poprzedniego ekranu bez zawieszenia.

### Ekran 6: My Kalba

1. Otworz zakladke My Kalba.
2. Goal:
- zwieksz/zmniejsz cel przyciskami +/-
- ustaw presety (4 i 8)
- odswiez ekran i sprawdz persystencje
3. Stats:
- zweryfikuj wartosci this week, this month, goal progress
- progress bar odpowiada procentowi
4. Schedule:
- kliknij element harmonogramu -> przejscie do Workshop Detail
5. Notifications:
- filtr Unread vs All
- mark all as read
- mark pojedynczego jako read/unread
- usuniecie pojedynczego powiadomienia

### Ekran 7: Calendar

1. Otworz zakladke Calendar.
2. Sprawdz przelacznik widoku Month / Week / Day.
3. Nawigacja daty:
- poprzedni / nastepny okres
- Today (powrot do aktualnej daty)
4. Zweryfikuj eventy na kalendarzu:
- warsztaty prowadzone (owner)
- warsztaty zapisane (enrolled)
5. Week -> tap dzien -> automatyczne przejscie do Day.
6. Stan bledu i stan pusty.

### Ekran 8: Profile

1. Otworz zakladke Profile.
2. Zweryfikuj dane usera: initials, full name, email, role.
3. Kliknij Sign Out:
- potwierdz modal (mobile) / confirm (web)
- anuluj -> pozostan zalogowany
- potwierdz -> powrot do Sign In

## 3. Scenariusz E2E: TRAINER (kolejnosc ekranow)

### Ekran 1-3: Login + Home

1. Zaloguj konto `trainer`.
2. Na Home zweryfikuj obecny FAB `Create`.
3. Zweryfikuj przycisk `Create a workshop` w stanie pustej listy (jesli wystepuje).

### Ekran 4: Create Workshop

1. Wejdz przez FAB lub CTA.
2. Walidacje:
- pusty title -> blad
- brak daty/godziny -> blad
- duration < 1 -> blad
- max participants < 1 -> blad
- data/godzina w przeszlosci -> blad
3. Harmonogram:
- mobile: DatePicker i TimePicker dzialaja
- web: reczne pola date/time dzialaja
4. Opis z hashtagami:
- dodaj tagi i zweryfikuj limit (do 5)
5. Utworz poprawny warsztat -> powrot do poprzedniego ekranu i widocznosc nowego rekordu.

### Ekran 5: Workshop Detail (trainer-owner)

1. Otworz wlasny warsztat.
2. Zweryfikuj sekcje Manage: Edit + Delete.
3. Edit:
- przejdz do edycji
- zmien title, date/time, duration, price, max participants
- zapisz i potwierdz odswiezone dane na detailu
4. Delete:
- anuluj kasowanie (Cancel) -> warsztat zostaje
- potwierdz kasowanie -> powrot i brak warsztatu na liscie
5. Join jako host -> przejscie do Call.

### Ekran 6: Workshop Call (trainer-host)

1. Dolacz jako host.
2. Sprawdz host controls:
- Mute All / Unmute All
- Cameras Off / Cameras On
3. Zweryfikuj efekt na koncie uczestnika w drugim kliencie.
4. Sprawdz, ze host moze nadal sterowac wlasnym mic/camera.
5. Leave call i poprawny powrot.

## 4. Roznice platformowe (minimum smoke)

### Android / iOS

1. Uprawnienia kamera/mikrofon przy pierwszym wejsciu do call:
- deny obu -> komunikat i wyjscie
- allow -> normalne dolaczenie
2. Modale natywne:
- sign out confirm
- delete workshop confirm
3. DateTimePicker dziala i respektuje minimalna date startu.

### Web

1. Confirm/alert flow dla:
- sign out
- delete workshop
- bledy join/create/edit
2. Call web otwiera iframe Daily i dziala Leave.

## 5. Kryteria zaliczenia rundy manualnej

1. Brak crashy i zawieszen przy przechodzeniu po wszystkich ekranach.
2. Wszystkie glowne akcje CRUD i enrollment dzialaja zgodnie z rola.
3. Join/Call dziala dla hosta i uczestnika oraz reaguje na host controls.
4. Stany loading/error/empty sa obsluzone i czytelne.
5. Sign out zawsze czysci sesje i wraca do Sign In.

## 6. Szybki checklist do odhaczania (1 linia na ekran)

- [ ] Sign In / Sign Up (email + Google, walidacje)
- [ ] OAuth Redirect (przekierowanie + timeout fallback)
- [ ] Home / Workshops List (load/error/refresh/open detail)
- [ ] Workshop Detail (details, enroll/unenroll, join)
- [ ] Call (mic/cam/leave, host controls)
- [ ] My Kalba (goal, stats, schedule, notifications)
- [ ] Calendar (month/week/day, nawigacja, eventy)
- [ ] Profile (dane, sign out)
- [ ] Create Workshop (trainer)
- [ ] Edit Workshop (trainer)
- [ ] Delete Workshop (trainer)
