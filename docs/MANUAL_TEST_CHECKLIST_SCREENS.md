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
4. W trybie Sign Up sprawdz pole Name:
- pole Name jest widoczne tylko w Sign Up (nie w Login)
- puste imie -> komunikat "Please enter your name." (rejestracja zablokowana)
5. Walidacje formularza:
- puste email/haslo -> komunikat o brakujacych danych
- niepoprawny email -> komunikat walidacji
- haslo za slabe (Sign Up) -> komunikat o wymaganiach (min 8 znakow, litery i cyfry)
- bledne dane logowania -> komunikat o blednych danych
6. Zarejestruj nowe konto email+haslo z podanym imieniem (happy path).
7. Zaloguj sie poprawnie przez email+haslo.
8. Wyloguj sie i zaloguj przez Google (happy path) -> w apce widac imie z Google.
9. Anuluj Google login (dismiss) i sprawdz, ze app nie wpada w crash.
10. W trybie Login jest widoczny link "Forgot password?" (patrz Ekran 1b).

### Ekran 1b: Forgot Password (tylko konta email+haslo)

1. Z ekranu Login kliknij "Forgot password?".
2. Walidacja: pusty email -> brak wyslania.
3. Podaj email istniejacego konta email+haslo -> "Send reset link".
4. Zweryfikuj komunikat potwierdzenia (zawsze taki sam, niezaleznie czy konto istnieje).
5. Kliknij "Back to Log In" -> powrot do ekranu logowania.
6. Sprawdz skrzynke (UWAGA: maila moze byc w SPAMIE; nadawca kalba.poland@gmail.com, temat "Reset your Kalba password"; szukaj "Kalba").
   - Konto Google (bez hasla) NIE dostaje maila -> to oczekiwane.

### Ekran 1c: Reset Password (strona w przegladarce)

1. Otworz link "Reset password" z maila (link prowadzi do backend-kalba.fly.dev/reset-password).
2. Walidacje:
- haslo i potwierdzenie rozne -> "Passwords don't match."
- haslo za slabe -> komunikat bledu z backendu
3. Ustaw nowe poprawne haslo -> komunikat o sukcesie.
4. Negatywne przypadki:
- link bez tokena / zepsuty token -> komunikat "invalid or has expired"
- link uzyty drugi raz -> "invalid or has expired"
- link starszy niz 60 min -> "invalid or has expired"
5. Wroc do apki i zaloguj sie NOWYM haslem; potwierdz, ze STARE haslo juz nie dziala.

### Ekran 2: OAuth Redirect

1. Po poprawnym Google login sprawdz ekran ladowania.
2. Zweryfikuj automatyczne przejscie do sekcji chronionej `(tabs)`.
3. Negatywny przypadek: brak tokena po timeout -> powrot do Sign In.

### Ekran 3: Home / Workshops List

1. Sprawdz stan ladowania (skeleton karty z pulsem, nie spinner).
2. Sprawdz stan bledu (wymus np. brak sieci) i przycisk Try again (EmptyState z ikonami i kolami).
3. Sprawdz liste warsztatow:
- poprawne tytuly (font serif), blok daty (dzien tygodnia + numer), godzina, czas trwania, miejsca
- cena jako badge; "Free" z zielonym tlem
- karty pojawiaja sie z animacja fade+slide (stagger)
- otwarcie detailu po kliknieciu kafelka (lekka haptyka na native)
3a. Naglowek: powitanie wg pory dnia (PL/EN), imie w foncie serif, "oddychajace" kolo w tle.
4. Pull-to-refresh:
- odswiez dane
- brak duplikatow na liscie
5. Dla roli `user` potwierdz brak akcji administracyjnych (create/edit/delete workshop).

### Ekran 4: Groups (tab)

1. Otworz zakladke Groups.
2. Sprawdz sekcje:
- My Groups
- Discover Groups
3. Subscribe flow:
- kliknij Subscribe w Discover
- grupa znika z Discover i pojawia sie w My Groups
4. Otworz Group Detail po kliknieciu kafelka grupy.

### Ekran 5: Group Detail (member)

1. Zweryfikuj naglowek grupy: tytul, opis, licznik memberow.
2. Sprawdz akcje dla czlonka:
- Unsubscribe jest dostepny
- Edit group nie jest dostepny (dla nie-ownera)
3. Sekcja Workshops:
- po byciu czlonkiem widac liste warsztatow grupy
- klik warsztatu przechodzi do Workshop Detail
4. Sekcja Members:
- widoczni sa czlonkowie
- brak akcji Remove member dla nie-ownera

### Ekran 6: Workshop Detail

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

### Ekran 7: Workshop Call (user)

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

### Ekran 8: My Kalba

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

### Ekran 9: Calendar

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

### Ekran 10: Profile

1. Otworz zakladke Profile.
2. Zweryfikuj dane usera: initials, full name (imie), email, role.
- konto email+haslo: wyswietla sie podane przy rejestracji imie
- konto Google: wyswietla sie imie z konta Google
- konto starsze bez imienia: fallback do czesci emaila przed @ (nigdy pusty/surowy email w miejscu imienia)
3. Kliknij Sign Out (przycisk z ikona, tekst przetlumaczony PL/EN):
- potwierdz modal (mobile) / confirm (web); tresc dialogu przetlumaczona
- anuluj -> pozostan zalogowany
- potwierdz -> powrot do Sign In
4. Link "Privacy Policy":
- otwiera strone polityki prywatnosci (po polsku) w przegladarce
5. "Delete account" (usuwanie konta, nieodwracalne):
- podwojne potwierdzenie (dwa modale/confirm); anuluj na ktorejkolwiek -> konto zostaje
- po potwierdzeniu obu: konto usuniete, automatyczne wylogowanie i powrot do Sign In
- proba ponownego logowania tymi danymi -> blad (konto nie istnieje)
- (trainer) usuniecie konta usuwa tez jego grupy i warsztaty

## 3. Scenariusz E2E: TRAINER (kolejnosc ekranow)

### Ekran 1-4: Login + Home + Groups

1. Zaloguj konto `trainer`.
2. Na Home zweryfikuj brak bezposredniego tworzenia warsztatu.
3. Przejdz do zakladki Groups.
4. Zweryfikuj obecny FAB dodawania grupy.

### Ekran 5: Create Group

1. Wejdz przez FAB z zakladki Groups.
2. Walidacje:
- pusty title -> blad
- title + opcjonalny description -> poprawny submit
3. Utworz grupe i sprawdz automatyczne przejscie do Group Detail nowej grupy.

### Ekran 6: Group Detail (trainer-owner)

1. Zweryfikuj badge/stan ownera.
2. Zweryfikuj sekcje owner actions:
- Edit group
- Remove member (dla innych czlonkow)
3. Subscribe/Unsubscribe nie powinno byc pokazane dla ownera.
4. Zweryfikuj przycisk `Create workshop` w sekcji Workshops.

### Ekran 7: Edit Group (trainer-owner)

1. Z Group Detail kliknij `Edit group`.
2. Walidacje:
- wyczysc title -> blad walidacji
- description moze byc puste
3. Zmien title i description, zapisz zmiany.
4. Po zapisie sprawdz powrot do Group Detail i odswiezone dane grupy.

### Ekran 8: Create Workshop (z Group Detail)

1. Wejdz przez `Create workshop` z Group Detail.
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

### Ekran 9: Workshop Detail (trainer-owner)

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

### Ekran 10: Workshop Call (trainer-host)

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
6. Flow Groups (create/edit/subscribe/unsubscribe/member list) dziala zgodnie z rola.

## 6. Szybki checklist do odhaczania (1 linia na ekran)

- [ ] Sign In / Sign Up (email + Google, walidacje, pole Name w Sign Up)
- [ ] Forgot Password (link, komunikat, mail / sprawdz spam)
- [ ] Reset Password (strona web, walidacje, nowe haslo dziala, stare nie)
- [ ] OAuth Redirect (przekierowanie + timeout fallback)
- [ ] Home / Workshops List (load/error/refresh/open detail)
- [ ] Groups tab (my/discover, subscribe, open detail)
- [ ] Group Detail (workshops, members, role-based actions)
- [ ] Workshop Detail (details, enroll/unenroll, join)
- [ ] Call (mic/cam/leave, host controls)
- [ ] My Kalba (goal, stats, schedule, notifications)
- [ ] Calendar (month/week/day, nawigacja, eventy)
- [ ] Profile (dane, sign out, privacy policy, delete account)
- [ ] Create Group (trainer)
- [ ] Edit Group (trainer-owner)
- [ ] Create Workshop from Group Detail (trainer-owner)
- [ ] Edit Workshop (trainer)
- [ ] Delete Workshop (trainer)
