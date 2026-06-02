# Manual Smoke Checklist (20-30 min)

Cel: szybki check przed daily/demo lub po wiekszym merge.
Czas: okolo 20-30 minut.
Zakres: najwazniejsze flow end-to-end (user + trainer).

## 0. Setup

1. Upewnij sie, ze backend i frontend dzialaja.
2. Miej 2 konta testowe:
- `user`
- `trainer`
3. Miej co najmniej 1 warsztat aktywny.
4. Miej przygotowane dane Groups:
- co najmniej 1 grupa w sekcji Discover dla konta `user`
- co najmniej 1 grupa ownerowana przez konto `trainer`

## 1. Smoke USER

### 1.1 Sign In

- [ ] Login email+haslo dziala (happy path).
- [ ] Google login dziala (happy path).
- [ ] Niepoprawne dane pokazuja blad (bez crasha).
- [ ] Sign Up email+haslo wymaga pola Name (puste imie -> blad).
- [ ] Po Google login w apce widac imie z konta Google (nie email).

### 1.1b Reset hasla (tylko konta email+haslo)

- [ ] Na ekranie Login jest link "Forgot password?".
- [ ] Po podaniu emaila widac komunikat "jesli konto istnieje, wyslalismy link".
- [ ] Mail "Reset your Kalba password" dochodzi (UWAGA: sprawdz SPAM, szukaj "Kalba").
- [ ] Link otwiera strone resetu, ustawienie nowego hasla dziala.
- [ ] Po resecie: nowe haslo dziala, stare NIE dziala.

### 1.2 Home -> Detail

- [ ] Lista warsztatow laduje sie bez bledu.
- [ ] Klik warsztatu otwiera detail.

### 1.3 Groups

- [ ] Groups laduje sekcje My Groups i Discover Groups.
- [ ] Subscribe z Discover dziala i przenosi grupe do My Groups.
- [ ] Klik grupy otwiera Group Detail.

### 1.4 Enrollment

- [ ] Enroll dziala.
- [ ] Unenroll dziala.
- [ ] Licznik miejsc aktualizuje sie po akcji.

### 1.5 Join Call

- [ ] Join przenosi do ekranu call.
- [ ] Mic on/off dziala.
- [ ] Leave wraca do aplikacji bez zawieszenia.

### 1.6 Profile / Sign Out

- [ ] Sign Out dziala i wraca do Sign In.
- [ ] Link "Privacy Policy" otwiera strone polityki (po polsku).
- [ ] "Delete account" (podwojne potwierdzenie) usuwa konto i wylogowuje; logowanie tymi danymi juz nie dziala.

## 2. Smoke TRAINER

### 2.1 Groups / Create

- [ ] Trainer widzi FAB tworzenia grupy w zakladce Groups.
- [ ] Create group z poprawnymi danymi dziala.
- [ ] Po create group app przechodzi do Group Detail.
- [ ] W Group Detail owner widzi przycisk Create Workshop.
- [ ] Create workshop z poprawnymi danymi dziala.

### 2.2 Detail Owner Actions

- [ ] Edit group dziala i zapisuje zmiany.
- [ ] Edit warsztatu dziala i zapisuje zmiany.
- [ ] Delete warsztatu dziala.

### 2.3 Host Controls in Call

- [ ] Trainer jako host moze wykonac Mute All / Unmute All.
- [ ] Trainer jako host moze wykonac Cameras Off / Cameras On.

## 3. Quick Tabs Smoke

- [ ] My Kalba otwiera sie i laduje dane.
- [ ] Calendar otwiera sie i mozna przelaczyc Month/Week/Day.

## 4. Exit Criteria

Smoke przechodzi, jesli:

1. Brak crashy i freeze.
2. Login, list/detail, groups, enroll, join call, sign out dzialaja.
3. Trainer moze create/edit group, create/edit/delete workshop i sterowac host controls.
