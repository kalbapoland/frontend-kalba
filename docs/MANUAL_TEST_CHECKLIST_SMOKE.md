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

## 1. Smoke USER

### 1.1 Sign In

- [ ] Login email+haslo dziala (happy path).
- [ ] Google login dziala (happy path).
- [ ] Niepoprawne dane pokazuja blad (bez crasha).

### 1.2 Home -> Detail

- [ ] Lista warsztatow laduje sie bez bledu.
- [ ] Klik warsztatu otwiera detail.

### 1.3 Enrollment

- [ ] Enroll dziala.
- [ ] Unenroll dziala.
- [ ] Licznik miejsc aktualizuje sie po akcji.

### 1.4 Join Call

- [ ] Join przenosi do ekranu call.
- [ ] Mic on/off dziala.
- [ ] Leave wraca do aplikacji bez zawieszenia.

### 1.5 Profile / Sign Out

- [ ] Sign Out dziala i wraca do Sign In.

## 2. Smoke TRAINER

### 2.1 Home / Create

- [ ] Trainer widzi przycisk/FAB Create.
- [ ] Create workshop z poprawnymi danymi dziala.

### 2.2 Detail Owner Actions

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
2. Login, list/detail, enroll, join call, sign out dzialaja.
3. Trainer moze create/edit/delete i sterowac host controls.
