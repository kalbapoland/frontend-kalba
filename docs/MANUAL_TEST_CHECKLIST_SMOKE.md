# Manual Smoke Checklist (20-30 min)

Cel: szybki check przed daily/demo lub po wiekszym merge.
Czas: okolo 20-30 minut.
Zakres: najwazniejsze flow end-to-end (user + trainer).

> **Pokrycie automatyczne:** Większość happy-path flowów jest pokryta przez suite
> 21 testów Maestro (`test/automated/run_android_smoke_local.py`). Poniższa lista
> zawiera **wyłącznie scenariusze NIE pokryte automatycznie** — czyli te, których
> Maestro nie może zweryfikować (Google OAuth, dostarczanie maili, UX/haptyka,
> web platform, host-control skuteczność).

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

- [ ] Google login dziala (happy path).
- [ ] Sign Up email+haslo wymaga pola Name (puste imie -> blad).
- [ ] Po Google login w apce widac imie z konta Google (nie email).

### 1.1b Reset hasla (tylko konta email+haslo)

- [ ] Mail "Reset your Kalba password" dochodzi (UWAGA: sprawdz SPAM, szukaj "Kalba").
- [ ] Link otwiera strone resetu, ustawienie nowego hasla dziala.
- [ ] Po resecie: nowe haslo dziala, stare NIE dziala.

### 1.2 Home -> Detail

- [ ] Tab bar: wskaznik aktywnej zakladki przesuwa sie plynnie; haptyka na native.

### 1.4 Enrollment

- [ ] Licznik miejsc aktualizuje sie po Enroll/Unenroll.

### 1.5 Join Call

- [ ] Mic on/off dziala podczas polaczenia.

### 1.6 Profile / Sign Out

- [ ] Link "Privacy Policy" otwiera strone polityki (po polsku).

## 2. Smoke TRAINER

### 2.3 Host Controls in Call

- [ ] Trainer jako host moze wykonac Mute All / Unmute All — efekt widoczny na koncie uczestnika.
- [ ] Trainer jako host moze wykonac Cameras Off / Cameras On — efekt widoczny na koncie uczestnika.

## 3. Exit Criteria

Smoke przechodzi, jesli:

1. Brak crashy i freeze.
2. Google login, licznik miejsc, mic toggle, host controls dzialaja.
3. Tester potwierdza brak regresjii wizualnych / haptycznych.
