# TODO

## Bugi

- **Migotanie ekranu podczas logowania OAuth (android:debug:remote)** — Podczas logowania przez Google OAuth na Androidzie, gdy okno OAuth się zamyka i aplikacja wraca na pierwszy plan, przez chwilę widoczny jest niezalogowany ekran (pusty ekran logowania / główne menu) zanim nastąpi przejście do ekranu po zalogowaniu. Prawdopodobna przyczyna: race condition między powrotem z OAuth a zapisaniem/odczytaniem JWT — stan auth przez jeden cykl renderowania wygląda jak niezalogowany, a zamknięcie okna OAuth odsłania poprzedni ekran zanim token dotrze. Naprawa: pokazać overlay z loadingiem w momencie między odebraniem wyniku OAuth a potwierdzeniem stanu auth, żeby ekran logowania nie był widoczny w trakcie przepływu.
