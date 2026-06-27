# Manual Test Checklist (Screen-by-Screen)

Cel: lista czynnosci dla testera, aby przejsc ekran po ekranie bez zgadywania kolejnosci.
Zakres: frontend Kalba (Expo), flow dla roli `user` i `trainer`, web + mobile (Android/iOS) tam gdzie zachowanie sie rozni.

> **Pokrycie automatyczne:** Suite 20 testów Maestro (`test/automated/run_android_smoke_local.py`)
> pokrywa happy-path dla: login email/haslo, rejestracja, wylogowanie, usunięcie konta,
> home lista, enroll/unenroll, subscribe/unsubscribe grup, create/edit/delete warsztatów,
> edit grupy, join video call (trainer), My Kalba, Calendar.
> Poniższa lista zawiera wyłącznie kroki NIE pokryte automatycznie.

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

1. Przelacz na Sign Up i z powrotem na Login.
2. W trybie Sign Up sprawdz pole Name:
   - pole Name jest widoczne tylko w Sign Up (nie w Login)
   - puste imie -> komunikat "Please enter your name." (rejestracja zablokowana)
3. Walidacje formularza:
   - puste email/haslo -> komunikat o brakujacych danych
   - niepoprawny email -> komunikat walidacji
   - haslo za slabe (Sign Up) -> komunikat o wymaganiach (min 8 znakow, litery i cyfry)
4. Zaloguj sie przez Google (happy path) -> w apce widac imie z Google.
5. Anuluj Google login (dismiss) i sprawdz, ze app nie wpada w crash.

### Ekran 1b: Forgot Password (tylko konta email+haslo)

1. Walidacja: pusty email -> brak wyslania.
2. Sprawdz skrzynke (UWAGA: maila moze byc w SPAMIE; nadawca kalba.poland@gmail.com, temat "Reset your Kalba password"; szukaj "Kalba").
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
   - lekka haptyka na native przy tapnieciu karty
3a. Naglowek: powitanie wg pory dnia (PL/EN), imie w foncie serif, "oddychajace" kolo w tle.
4. Pull-to-refresh:
   - odswiez dane
   - brak duplikatow na liscie

### Ekran 4: Groups (tab)

1. Sprawdz sekcje My Groups i Discover Groups (stany loading/error/empty).

### Ekran 5: Group Detail (member)

1. Zweryfikuj naglowek grupy: tytul, opis, licznik memberow.
2. Sekcja Members:
   - brak akcji Remove member dla nie-ownera.

### Ekran 6: Workshop Detail

1. Sprawdz licznik uczestnikow — aktualizuje sie po Enroll/Unenroll.

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
4. Dla kontroli hosta (wymaga drugiego klienta jako host):
   - host wysyla `mute all` -> user zostaje wyciszony
   - host wysyla `cameras off all` -> user traci video
5. Orientacja (mobile): obroc telefon w poziom -> ekran przechodzi w landscape i tam zostaje; obroc w pion -> wraca do portrait. Po Leave aplikacja jest z powrotem w portrait.

### Ekran 8: My Kalba

1. Goal:
   - zwieksz/zmniejsz cel przyciskami +/-
   - ustaw presety (4 i 8)
   - odswiez ekran i sprawdz persystencje
2. Stats:
   - zweryfikuj wartosci this week, this month, goal progress
   - progress bar odpowiada procentowi
3. Notifications:
   - filtr Unread vs All
   - mark all as read
   - mark pojedynczego jako read/unread
   - usuniecie pojedynczego powiadomienia

### Ekran 9: Calendar

1. Nawigacja daty: poprzedni / nastepny okres; Today (powrot do aktualnej daty).
2. Week -> tap dzien -> automatyczne przejscie do Day.
3. Stan bledu i stan pusty.

### Ekran 10: Profile

1. Zweryfikuj dane usera: initials, full name (imie), email, role.
   - konto Google: wyswietla sie imie z konta Google
   - konto starsze bez imienia: fallback do czesci emaila przed @ (nigdy pusty/surowy email)
2. Link "Privacy Policy":
   - otwiera strone polityki prywatnosci (po polsku) w przegladarce
3. "Delete account" - negatywny przypadek:
   - anuluj na ktorejkolwiek z dwoch konfirmacji -> konto zostaje
   - (trainer) usuniecie konta usuwa tez jego grupy i warsztaty

## 3. Scenariusz E2E: TRAINER (kolejnosc ekranow)

### Ekran 8: Create Workshop (z Group Detail)

1. Walidacje:
   - pusty title -> blad
   - brak daty/godziny -> blad
   - duration < 1 -> blad
   - max participants < 1 -> blad
   - data/godzina w przeszlosci -> blad
2. Harmonogram:
   - web: reczne pola date/time dzialaja
3. Opis z hashtagami: dodaj tagi i zweryfikuj limit (do 5).

### Ekran 10: Workshop Call (trainer-host)

1. Zweryfikuj efekt host controls na koncie uczestnika w drugim kliencie:
   - Mute All / Unmute All
   - Cameras Off / Cameras On
2. Sprawdz, ze host moze nadal sterowac wlasnym mic/camera.

## 4. Roznice platformowe (minimum smoke)

### Android / iOS

1. Uprawnienia kamera/mikrofon przy pierwszym wejsciu do call:
   - deny obu -> komunikat i wyjscie
   - allow -> normalne dolaczenie

### Web

1. Confirm/alert flow dla:
   - sign out
   - delete workshop
   - bledy join/create/edit
2. Call web otwiera iframe Daily i dziala Leave.

## 5. Kryteria zaliczenia rundy manualnej

1. Brak crashy i zawieszen przy przechodzeniu po wszystkich ekranach.
2. Google login dziala; host controls maja efekt na uczestnikach; email reset hasla dochodzi.
3. Stany loading/error/empty sa obsluzone i czytelne.
4. Platformowe: web call dziala; mobile permissions obsluzone; orientacja po leave wraca do portrait.

## 6. Szybki checklist do odhaczania (tylko przypadki manualne)

- [ ] Google Sign In (imie z Google widoczne w apce)
- [ ] Forgot Password (mail dochodzi, link dziala, reset E2E)
- [ ] Reset Password strona web (walidacje, stary token wygasa)
- [ ] Home loading/error/empty states + haptyka + animacje
- [ ] Workshop Detail — licznik miejsc aktualizuje sie po enroll/unenroll
- [ ] Call user — mic toggle dziala; host controls maja efekt na userze
- [ ] Call trainer — host controls maja efekt na uczestnikach w 2. kliencie
- [ ] My Kalba — notifications (unread/read/delete), goal presets
- [ ] Calendar — nawigacja dat, Today, Week→Day tap
- [ ] Profile — Privacy Policy otwiera strone; Delete Cancel nie usuwa
- [ ] Create Workshop — walidacje formularza; web date/time; hashtag limit
- [ ] Web — confirm/alert dla delete/signout/join errors; web call iframe
- [ ] Permissions — deny camera/mic → graceful exit z call
