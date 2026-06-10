# Kalba Frontend — Raport z audytu kodu

**Data:** 2026-06-10
**Zakres:** cały kod źródłowy (Expo / React Native): `app/`, `src/` (api, hooks, store, lib, components, theme), konfiguracja (`app.config.js`, `eas.json`, `tsconfig.json`), CI, testy, dokumentacja.
**Metoda:** dwa niezależne przeglądy (1: correctness / security / state management; 2: architektura / standardy / wydajność / testy / dokumentacja), wyniki scalone i zdeduplikowane.
**Rewizja audytowanego kodu:** `97289f9` (branch: `main`).

**Legenda ważności:** 🔴 Krytyczny · 🟠 Wysoki · 🟡 Średni · ⚪ Niski

---

## Podsumowanie

Makro-struktura jest dobra: czysty routing Expo Router, separacja `api/` → `hooks/` (TanStack Query) → ekrany, Zustand tylko dla sesji, mocne typowanie DTO, klucze SecureStore per-host (zapobiega przeciekom tokenów dev/prod). Najpoważniejsze problemy: **tokeny (refresh token, token pokoju Daily) trafiają do `localStorage`, URL-i i parametrów nawigacji**, **interceptor odświeżania tokenów bez mutexa** (równoległe 401 wylogowują użytkownika), **kanał `app-message` Daily pozwala dowolnemu uczestnikowi wyciszyć wszystkich**, oraz **prawie zerowe pokrycie testami krytycznych przepływów** przy CI z `--passWithNoTests`. Systemowo: dwa konkurujące systemy stylowania i dwa źródła prawdy o palecie kolorów, brak ESLint/Prettier, nieaktualny README.

---

## 1. Problemy z bezpieczeństwem

### 🔴 SEC-1. JWT i refresh token w plaintext `localStorage` na webie
**Plik:** `src/store/auth.ts:96-101, 131-146`
Na webie access i **długożyjący refresh token** są zapisywane do `localStorage` — czytelnego dla dowolnego JS w originie; to pierwszy cel eksfiltracji przy XSS. Access token w `localStorage` jest częściowo nieunikniony (SecureStore nie ma backendu web), ale refresh token nie powinien tam trafiać.
**Poprawka:** docelowo refresh przez HttpOnly/Secure/SameSite cookie z backendu; minimum — refresh token na webie tylko w pamięci (akceptując re-login po przeładowaniu):
```ts
let webRefreshToken: string | null = null;
async function saveRefreshToken(t: string) {
  if (Platform.OS === "web") { webRefreshToken = t; return; }
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, t);
}
```

### 🔴 SEC-2. Token pokoju Daily w query stringu URL na webie
**Plik:** `app/(app)/workshop/call.web.tsx:31`
```ts
const embedUrl = `${roomUrl}?t=${token}`;
```
Token w `iframe src` ląduje w historii przeglądarki, `document.referrer` i logach proxy.
**Poprawka:** użyć `callFrame.join({ url, token })` z Daily JS (token przekazany programowo, nie w URL); jeśli prebuilt-iframe konieczny — przynajmniej `history.replaceState` po załadowaniu.

### 🟠 SEC-3. Token, roomUrl i `role` w parametrach nawigacji (URL na webie)
**Pliki:** `app/(app)/workshop/[id].tsx:47-56`, `app/(app)/workshop/call.tsx:69-79`, `call.web.tsx:9-21`
Poświadczenia połączenia są serializowane do parametrów Expo Router — widoczne w pasku adresu na webie, łatwe do inspekcji w stanie nawigacji.
**Poprawka:** odpowiedź z `join` przekazywać przez krótkotrwały store (Zustand) lub kontekst kluczowany `workshopId`; ekran rozmowy czyta stamtąd.

### 🟠 SEC-4. `isHost` wyprowadzane z parametru nawigacji podanego przez klienta
**Pliki:** `app/(app)/workshop/call.tsx:80`, `call.web.tsx:19`
`const isHost = params.role === "host"` — nawigacja z `?role=host` daje UI hosta. **Weryfikacja krzyżowa z audytem backendu: `POST /video/workshops/{id}/host-action` faktycznie re-autoryzuje po `workshop.trainer_id` po stronie serwera**, więc to defense-in-depth, nie eskalacja uprawnień — ale UI nie powinno ufać parametrowi.
**Poprawka:** wyprowadzać status hosta z `useUser()` + `workshop.trainer_id`, parametr `role` traktować wyłącznie jako wskazówkę wyświetlania.

### 🟠 SEC-5. `app-message` Daily: dowolny uczestnik może wyciszyć/wyłączyć kamery wszystkim
**Plik:** `app/(app)/workshop/call.tsx:151-180`
`handleAppMessage` wykonuje `{ type: "host_control", action: "mute_all" }` od **każdego** nadawcy — app-message w Daily jest peer-to-peer i nieuwierzytelniony jako pochodzący od hosta. Złośliwy uczestnik może sterować całą salą.
**Poprawka:** nie reagować na surowe app-message dla kontroli hosta; walidować `session_id` nadawcy względem znanego id hosta uzyskanego z serwera, lub sterować stanem z eventu rozgłaszanego przez backend.

### 🟡 SEC-6. Pełne logowanie żądań/odpowiedzi/błędów w buildach produkcyjnych
**Plik:** `src/api/client.ts:99-145`
`console.log` per-request (metoda+URL), per-response (status) i pełne `error.response?.data` — bezwarunkowo, także w release (adb logcat / Console.app / konsola web). Ujawnia powierzchnię API i treść błędów backendu.
**Poprawka:** wszystko za `if (__DEV__)`; nigdy nie logować `error.response?.data` na produkcji. Dotyczy też `console.warn` w `src/hooks/usePushRegistration.ts:43-48, 67-79, 86`.

### ⚪ SEC-7. Hardkodowane URL-e i identyfikatory w bundle (informacyjnie)
**Pliki:** `app/(app)/(tabs)/profile.tsx:21` (`https://backend-kalba.fly.dev/privacy`), `app.config.js:90, 123, 154-159`
Client ID Google i EAS project ID są z natury publiczne — **żadnych prawdziwych sekretów w bundle nie znaleziono (dobrze)**. URL polityki prywatności powinien jednak wynikać z konfiguracji API base, by uniknąć dryfu środowisk.

---

## 2. Błędy w implementacji (correctness)

### 🟠 IMP-1. Interceptor odświeżania tokenów bez mutexa — równoległe 401 wylogowują użytkownika
**Plik:** `src/api/client.ts:125-181`
Kilka jednoczesnych 401 (typowe tuż po wygaśnięciu tokena) → każde żądanie niezależnie woła `POST /auth/refresh`. Backend rotuje refresh tokeny, więc pierwszy refresh unieważnia token, pozostałe padają i wywołują `signOut()` — wylogowanie mimo ważnej sesji. Dodatkowo refresh idzie przez ten sam `apiClient` (dokleja przeterminowany nagłówek), a nieprzechwycony wyjątek z `signIn` w interceptorze odrzuca oryginalne żądanie.
**Poprawka:** pojedyncza in-flight promesa:
```ts
let refreshPromise: Promise<string> | null = null;
// w interceptorze:
refreshPromise ??= doRefresh(); // czyści się w finally
const newToken = await refreshPromise;
```

### 🟠 IMP-2. `restoreToken` nie sprawdza `exp` — przeterminowany JWT traktowany jako zalogowanie
**Pliki:** `src/store/auth.ts:214-218`, `app/(app)/_layout.tsx:18-21`
Po starcie aplikacja renderuje drzewo zalogowane z dowolnym zapisanym tokenem; przeterminowany token bez ważnego refresha → mignięcie UI → 401 → bounce do sign-in; błąd sieciowy na `/users/me` pokazuje ekran błędu zamiast logowania.
**Poprawka:** zdekodować `exp` (base64, bez weryfikacji podpisu) przy restore; przeterminowany access bez refresh tokena = niezalogowany.

### 🟠 IMP-3. `signOut` wyścig z interceptorem — token może zostać ponownie zapisany po wylogowaniu
**Plik:** `src/store/auth.ts:198-212`
`unregisterPushToken` to uwierzytelnione żądanie; jego 401 wchodzi w interceptor, który próbuje refresh + `signIn` **równolegle z trwającym `signOut`** — w najgorszym razie token jest re-persystowany tuż po wyczyszczeniu.
**Poprawka:** wysyłać unregister z flagą `_skipAuthRefresh: true` (flaga już istnieje w kliencie).

### 🟡 IMP-4. Cleanup rozmowy: `destroy()` natychmiast po nieoczekiwanym `leave()`
**Plik:** `app/(app)/workshop/call.tsx:212-217`
`call.leave().catch(() => {}); call.destroy();` — `destroy()` biegnie zanim `leave()` się rozwiąże; możliwy wyciek zasobów natywnych (wskaźnik „kamera w użyciu"), a handler `left-meeting` (`router.back()`, linie 134-137) może odpalić po odmontowaniu.
**Poprawka:**
```ts
return () => {
  const c = call; call = null; callRef.current = null;
  (async () => { try { await c?.leave(); } finally { await c?.destroy(); } })();
};
```
Plus guard na `router.back()` po unmount.

### 🟡 IMP-5. Nieobsłużona częściowa zgoda na uprawnienia (mikrofon TAK, kamera NIE)
**Plik:** `app/(app)/workshop/call.tsx:188-196`
Guard przerywa tylko gdy **oba** uprawnienia odmówione. Mikrofon-tak/kamera-nie (częsty wybór w aplikacji medytacyjnej) → późniejsze `setLocalVideo(true)` na odmówionej kamerze; `force_camera_on` wprowadza zepsuty stan. Odwrotnie: kamera-tak/mikrofon-nie → użytkownik na zawsze wyciszony bez komunikatu.
**Poprawka:** obsłużyć każde uprawnienie niezależnie; nie wołać `setLocalVideo(true)` przy odmowie kamery; pokazać nieblokujący komunikat.

### 🟡 IMP-6. Niezabezpieczony `JSON.parse(params.rules)` — crash ekranu rozmowy
**Pliki:** `app/(app)/workshop/call.tsx:79`, `call.web.tsx:21`
Niepoprawny JSON w parametrze (deep link, ucięty param) → synchroniczny wyjątek w renderze, bez error boundary. Rzutowanie `{}` na `WorkshopRules` jest też niepoprawne typowo (wszystkie pola `undefined`).
**Poprawka:**
```ts
function parseRules(raw?: string): WorkshopRules {
  try { return { ...DEFAULT_RULES, ...(JSON.parse(raw ?? "{}")) }; }
  catch { return DEFAULT_RULES; }
}
```

### 🟡 IMP-7. Timer awaryjny 20 s na ekranie OAuth może cofnąć zalogowanego użytkownika
**Plik:** `app/oauthredirect.tsx:12-24`
Bezwarunkowy `router.replace("/sign-in")` po 20 s nie jest kasowany, gdy `token` już jest — wolna nawigacja do `(app)` po późnym sign-in może zostać „przebita" powrotem do logowania.
**Poprawka:** dodać `token` do zależności efektu timera i pomijać/kasować, gdy `token` truthy.

### ⚪ IMP-8. Google Sign-In: zgniatanie błędów i `(result as any).params`
**Plik:** `src/components/AuthScreen.tsx:211-247`
Przypadki `cancel`/`error` (z `result.error`) sklejone w jeden generyczny alert — diagnoza w terenie niemożliwa; cast `any` omija typowanie. **Poprawka:** rozróżnić `result.type === "error"` i zalogować `result.error`; zawęzić typ po `result.type === "success"` zamiast `any`.

### ⚪ IMP-9. Licznik czasu rozmowy inkrementalny (dryfuje)
**Pliki:** `call.tsx:221-225`, `call.web.tsx:62-65`
`setElapsed((s) => s + 1)` co 1000 ms dryfuje przy zajętym wątku JS; na webie startuje od mount, nie od połączenia. **Poprawka:** liczyć z zapamiętanego `joinedAt = Date.now()`.

### ⚪ IMP-10. Martwy kod / drobiazgi
- `src/lib/oauth-url.ts` — mutowalny singleton modułowy używany tylko przez własny test; usunąć lub udokumentować.
- `app/(app)/workshop/call.tsx:479-482` — `color={danger || !on ? "#fff" : "#fff"}` zawsze `#fff`; uprościć.
- `app/(app)/(tabs)/index.tsx:336-350` — nieużywany styl `fab`; usunąć.

---

## 3. Zarządzanie stanem (TanStack Query / Zustand)

### 🟠 STATE-1. Cache zapytań czyszczony tylko przy wylogowaniu z ekranu Profil — wyciek danych między użytkownikami
**Pliki:** `src/store/auth.ts:198-212`, `src/api/client.ts:177`, `app/(app)/(tabs)/profile.tsx:32-33`
`queryClient.clear()` woła tylko `profile.tsx`. Wylogowanie z interceptora (nieudany refresh) lub z ekranu błędu `_layout` **nie czyści cache** — kolejny użytkownik na tym samym urządzeniu może przez chwilę widzieć cudze `/users/me`, warsztaty i powiadomienia.
**Poprawka:** przenieść `queryClient.clear()` do akcji `signOut` w store (import współdzielonego klienta z `lib/query-client.ts`) — pokrywa każdą ścieżkę wylogowania.

### 🟡 STATE-2. Luki w inwalidacji cache i niespójne klucze zapytań
**Pliki:** `src/hooks/useDeleteWorkshop.ts`, `useCreateWorkshop.ts`, `useJoinWorkshop.ts`, `useWorkshopDetail.ts` vs `useGroups.ts`
- Klucze niespójne: detal warsztatu `["workshop", id]` (l.poj.), lista `["workshops"]` (l.mn.), grupy `["groups", id]` — łatwo o błędną inwalidację.
- `useDeleteWorkshop` inwaliduje tylko `["workshops"]` — kalendarz (`["my-workshops"]`) i lista warsztatów grupy pokazują usunięty warsztat do refetchu.
- `useCreateWorkshop` analogicznie — a tworzenie zawsze dzieje się w grupie.
**Poprawka:** scentralizować klucze w `src/lib/query-keys.ts`; create/delete/update warsztatu inwalidują `["workshops"]`, `["my-workshops"]` i listę warsztatów grupy.

### 🟡 STATE-3. Inwalidacja całego drzewa `["my-kalba"]` przy każdym przełączeniu „przeczytane"
**Plik:** `src/hooks/useMyKalba.ts:47-76`
Każdy toggle powiadomienia refetchuje dashboard + harmonogram + wszystkie listy powiadomień; zwracana zaktualizowana encja jest wyrzucana. **Poprawka:** `setQueryData` zwróconą encją lub zawęzić inwalidację do `["my-kalba", "notifications"]`.

### ⚪ STATE-4. `useUser` zapisuje do Zustand wewnątrz `queryFn`
**Plik:** `src/hooks/useUser.ts:12-16`
Duplikacja stanu serwera w store; po `queryClient.clear()` store trzyma starego `user` do refetchu. **Poprawka:** czytać użytkownika z `useUser().data` w komponentach i usunąć lustro w store, albo aktualizować store w efekcie, nie w `queryFn`.

### ⚪ STATE-5. `setToken` fire-and-forget zapisu do SecureStore
**Plik:** `src/store/auth.ts:220-224`
Token w pamięci ustawiany niezależnie od powodzenia zapisu; nieużywany przez ścieżkę refresh — rozważyć usunięcie, a jeśli zostaje — `await`.

---

## 4. Błędy architektoniczne

### 🟠 ARCH-1. Dwa źródła prawdy o palecie kolorów (gwarantowany dryf)
**Pliki:** `src/theme/tokens.ts:1-23`, `tailwind.config.js:7-40`
Identyczna paleta zdefiniowana dwa razy (JS + Tailwind); ekrany mieszają `bg-canvas` z `colors.primary`. Każda zmiana koloru = dwa miejsca.
**Poprawka:** jedno źródło — `tailwind.config.js` buduje `colors` z eksportu `tokens.ts` (wymaga eksportu konsumowalnego przez JS w configu).

### 🟠 ARCH-2. Dwa równoległe systemy stylowania bez udokumentowanej reguły + hardkodowane hexy
**Pliki:** NativeWind: `app/(app)/(tabs)/index.tsx:61,132-155`, `app/(app)/_layout.tsx:24-50`; StyleSheet: prawie wszystkie pozostałe ekrany; inline: cały `call.web.tsx`; hexy m.in. `call.tsx:489-643`, `index.tsx:211-351`, `[id].tsx:327-440`, `create-workshop.tsx:469-652`, `FloatingTabBar.tsx:131`
README twierdzi „NativeWind v4", rzeczywistość to głównie StyleSheet z literałami `#566B52`, `#2E2E2B` itd. `call.web.tsx` używa nawet innego koloru wskaźnika „live" (`#22c55e`) niż `call.tsx` (`#8A9A7E`) — widoczna niespójność między platformami.
**Poprawka:** wybrać jeden podstawowy system (przy obecnym wolumenie: StyleSheet + tokeny), udokumentować w README/CLAUDE.md, zastąpić literały `colors.*`/`spacing.*`/`radii.*`, ujednolicić `call.web.tsx` z `call.tsx`. Wzorcem są `AuthScreen.tsx` i `MonthView.tsx` (konsekwentnie `colors.*`).

### 🟡 ARCH-3. ~600 zduplikowanych linii między formularzami create/edit warsztatu
**Pliki:** `app/(app)/create-workshop.tsx` (652 linie), `app/(app)/workshop/edit.tsx` (632 linie)
Oba definiują własny inline `FormField`, niemal identyczną logikę date/time pickerów (modal iOS + picker Android), `showAlert` i ~180-liniowy StyleSheet.
**Poprawka:** wspólny `WorkshopForm` (lub minimum: `components/forms/FormField`, `components/forms/SchedulePicker`, wspólny moduł stylów).

### 🟡 ARCH-4. Duplikacja helperów w wielu plikach
- Helper alertu platformowego (`Platform.OS === "web" ? window.alert : Alert.alert`) skopiowany w **9 plikach** (`create-workshop`, `AuthScreen`, `profile`, `workshop/[id]`, `workshop/edit`, `group/[id]`, `group/edit`, `groups`, `create-group`) → `src/lib/alert.ts` z `showAlert`/`showConfirm`.
- `formatPrice` w `index.tsx:42-46` i `[id].tsx:26-30` (subtelnie różne); `formatTime` reimplementowany w `call.tsx:58-62` i `call.web.tsx:67-71` mimo istnienia `src/lib/date.ts` → przenieść do `src/lib/format.ts` / reużyć `lib/date`.
- `isPrivateIpv4`/`normalizeAndroidEmulatorUrl` zduplikowane w `src/api/client.ts:28-52` i `src/store/auth.ts:34-46` → `src/lib/api-url.ts`.

### 🟡 ARCH-5. Niespójne źródło prawdy o własności warsztatu
**Pliki:** `src/types/api.ts:23,35` (`is_owner` z serwera) vs `app/(app)/workshop/[id].tsx:117` (`user?.id === workshop.trainer_id`) vs `MonthView.tsx:82,166` (`w.is_owner`)
Jeśli serwerowe `is_owner` kiedyś odbiegnie od porównania `trainer_id` (np. współprowadzący), UI będzie niespójne. **Poprawka:** wszędzie serwerowe `is_owner` (lub jeden helper `isWorkshopOwner`).

---

## 5. Jakość kodu / standardy

- 🟠 **STD-1.** **Brak ESLint i Prettier** — żadnego configu w repo ani kroku lint w CI, a w `call.tsx:218` jest komentarz `eslint-disable-next-line` (lint był zakładany). Skutki widoczne: wcięcia 4-spacje w `src/lib/i18n.ts`, `src/hooks/usePushRegistration.ts`, `my-kalba.tsx` (reszta 2-spacje); pojedyncze cudzysłowy w `i18n.ts`; podwójny import Reacta w `AuthScreen.tsx:1,22`. **Poprawka:** `eslint-config-expo` + `eslint-plugin-react-hooks` + Prettier (`tabWidth: 2`) + krok `lint` w CI + reformat.
- 🟡 **STD-2.** Ucieczki typowe `as any`: `i18n.ts:53` (`resources as any` — typować przez `i18next` `CustomTypeOptions`), `MonthView.tsx:96,120` (`markedDates as any`), `AuthScreen.tsx:218` (`(result as any).params` — zawęzić po `result.type`).
- ⚪ **STD-3.** Hardkodowany angielski na ekranie głównym mimo i18n en/pl: `index.tsx:35-40,113,117` („Good morning", „Upcoming", „Browse groups") — polski użytkownik widzi angielski. Przenieść do `locales/*.json`.
- ⚪ **STD-4.** `app.config.js:90,123` — reverse-client-id w `CFBundleURLSchemes`/intent-filter hardkodowany zamiast wyprowadzony z tych samych env co runtime (`AuthScreen.tsx:65-89`); dziś wartości zgodne, ale to pułapka dryfu.

---

## 6. Wydajność

- 🟡 **PERF-1.** `WorkshopCard` bez `React.memo`, `renderItem` jako nowa closura co render (`index.tsx:48-106,171`) — każdy element listy re-renderuje się przy każdej zmianie stanu rodzica (np. toggle `isRefetching`). FlatList bez `windowSize`/`getItemLayout`. **Poprawka:** `React.memo` + stabilny `useCallback` na `renderItem`; karty mają ~stałą wysokość → `getItemLayout`.
- ⚪ **PERF-2.** `useWorkshops` (lista) bez własnej polityki `staleTime`/refetch przy globalnym `staleTime: 5min` (`src/lib/query-client.ts`) — możliwe nieświeże dane po zmianach zapisów gdzie indziej. Udokumentować strategię cache.
- ⚪ **PERF-3.** `react-native-calendars` — ciężka zależność używana tylko w `MonthView.tsx`; `WeekView`/`DayView` są ręczne. Niski priorytet; ocenić przy pracy nad rozmiarem bundle.
- ⚪ **PERF-4.** `useMyWorkshops.ts:8` — klucz zapytania z nieznormalizowanym `query.from/to` (Date vs ISO string fragmentuje cache). Wymusić ISO string.

---

## 7. Testy i CI

### 🟠 TEST-1. Krytyczne przepływy bez żadnych testów; CI z `--passWithNoTests`; testy poza type-checkiem
**Pliki:** `src/**/__tests__` (8 plików, ~752 linie), `.github/workflows/ci-frontend.yml:53`, `tsconfig.json:17-20`
- Testy pokrywają tylko czyste funkcje (`lib/date`, `lib/hashtags`, `lib/oauth-url`, `lib/workshopSchedule`, `store/auth`, logikę refresh w `api/client`, 1 z ~40 funkcji w `endpoints`). **Zero** testów komponentów/ekranów: AuthScreen (login/rejestracja/Google, `resolveAuthError`), join-call (`[id].tsx handleJoin`), enroll/unenroll, `handleAppMessage`. `@testing-library/react-native` jest zainstalowane i nieużywane.
- CI: `--passWithNoTests` może zostawić CI zielone bez żadnego uruchomionego testu; to ryzyko jakości niezależnie od bieżącej konfiguracji `testMatch`.
- `tsconfig.json` wyklucza `**/__tests__/**` — pliki testowe bez type-checku, mogą gnić niezauważone.
**Poprawka:** usunąć `--passWithNoTests`; `tsconfig.test.json` obejmujący testy + przebieg `tsc` w CI; testy RTL dla: ścieżek happy/error AuthScreen, join → parametry `router.push`, toggle zapisu przy pełnym warsztacie; wyekstrahować `handleAppMessage` do czystej funkcji w `lib/` i przetestować mapowanie akcji.

---

## 8. Dokumentacja i konfiguracja

### 🟡 DOC-1. README nieaktualny w wielu miejscach
**Plik:** `README.md`
- l.3: link do backendu `../backend-kalba/` — faktyczny katalog to `../backend`.
- l.35-39: `cp .env .env.local` — **w repo nie ma żadnego `.env` ani `.env.example`** (gitignore); nowy kontrybutor nie ruszy.
- l.10,184: „NativeWind/Tailwind" — rzeczywistość to głównie StyleSheet (ARCH-2).
- l.193-199: opis auth „tylko Google, 401 → wylogowanie" — w kodzie jest e-mail/hasło + rejestracja + reset hasła + refresh-retry przed wylogowaniem.
- Drzewo struktury (149-176) pomija `groups`, `my-kalba`, `calendar`, `workshop/call`, `workshop/edit`, `group/*`, ekrany haseł, `theme/`, `components/calendar/`, `locales/`, `lib/i18n`.
- Tabela env (45-46): brakuje `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (używany w `AuthScreen.tsx:162,224`), `EXPO_PUBLIC_SMOKE_WORKSHOP_OFFSET_MINUTES`, `EXPO_PUBLIC_ALLOW_ANDROID_CLEARTEXT`, `EXPO_PUBLIC_EAS_PROJECT_ID`.
**Poprawka:** odświeżyć README; dodać commitowany `.env.example` z kompletem zmiennych `EXPO_PUBLIC_*`.

### ⚪ DOC-2. `eas.json` bez profilu/kanału stage
**Plik:** `eas.json:6-22`
Profile tylko `development`/`tester`/`production`, a CLAUDE/DESIGN mówią o `local/dev/stage/prod`; `app.config.js` czyta `APP_ENV`, ale profile go nie ustawiają (poza `tester`). Rozważyć jawne `channel`/`env: { APP_ENV }` per profil.

---

## 9. Sugestie poprawek — plan zadań dla modelu wykonawczego (np. Sonnet)

Zadania niezależne, wg priorytetu. Każde = osobny branch + PR. Po każdym: `npm test -- --watchAll=false` i `npx tsc --noEmit`.

| # | Zadanie | Pliki | Kryteria akceptacji |
|---|---------|-------|---------------------|
| 1 | Mutex refresh: pojedyncza in-flight promesa dla `/auth/refresh`; refresh przez goły axios (nie `apiClient`); try/catch wokół `signIn` w interceptorze | `src/api/client.ts` | Test: 3 równoległe 401 → dokładnie 1 wywołanie refresh, wszystkie żądania ponowione |
| 2 | Refresh token na webie poza `localStorage` (in-memory); dopisać do DESIGN.md docelowy wariant cookie HttpOnly | `src/store/auth.ts` | Web: brak klucza refresh w `localStorage`; native bez zmian (SecureStore) |
| 3 | Token Daily poza URL na webie: `callFrame.join({ url, token })` zamiast `?t=` w `iframe src` | `app/(app)/workshop/call.web.tsx` | Token nieobecny w `src` iframe i historii |
| 4 | Odpowiedź join przez store zamiast parametrów nawigacji (token/roomUrl/role/rules); `isHost` z `useUser()` + `workshop.trainer_id` | `[id].tsx`, `call.tsx`, `call.web.tsx`, nowy slice w store | Parametry trasy zawierają tylko `workshopId`; `?role=host` w URL nie daje UI hosta |
| 5 | Ignorować `app-message` typu `host_control` od nadawców innych niż zweryfikowany host (walidacja `session_id` hosta z serwera) | `app/(app)/workshop/call.tsx:151-180` | Test czystej funkcji: wiadomość od nie-hosta → brak akcji |
| 6 | `queryClient.clear()` w akcji `signOut` (każda ścieżka wylogowania); `unregisterPushToken` z `_skipAuthRefresh: true` | `src/store/auth.ts`, `src/api/endpoints.ts`, `profile.tsx` (usunąć ręczny clear) | Wylogowanie z interceptora czyści cache; brak re-zapisania tokena po signOut |
| 7 | `restoreToken`: dekodowanie `exp`; przeterminowany access bez refresha → stan niezalogowany | `src/store/auth.ts` | Test: przeterminowany token w storage → ekran logowania bez mignięcia |
| 8 | Logi API i push za `__DEV__`; nigdy `error.response?.data` w produkcji | `src/api/client.ts`, `src/hooks/usePushRegistration.ts` | Release build: zero logów `[API]` |
| 9 | Bezpieczny `parseRules` z domyślnymi wartościami + try/catch; naprawa cleanup rozmowy (`await leave()` → `destroy()`, guard na `router.back()`); obsługa częściowych uprawnień kamera/mikrofon | `call.tsx`, `call.web.tsx` | Zepsuty param `rules` nie crashuje; mikrofon-tak/kamera-nie → join bez prób włączania wideo + komunikat |
| 10 | Timer 20 s w `oauthredirect.tsx` kasowany gdy `token` obecny | `app/oauthredirect.tsx` | Późny sign-in nie jest przebijany powrotem do logowania |
| 11 | ESLint (`eslint-config-expo` + `react-hooks`) + Prettier (2 spacje, podwójne cudzysłowy) + krok lint w CI; usunąć `--passWithNoTests`; `tsconfig.test.json` + `tsc` nad testami w CI | `.eslintrc`/`eslint.config.js`, `.prettierrc`, `ci-frontend.yml`, `tsconfig*` | CI: lint + tsc + jest, czerwone przy 0 testów |
| 12 | Centralizacja kluczy zapytań w `src/lib/query-keys.ts`; create/delete/update warsztatu inwalidują `workshops`, `my-workshops` i listę grupy; toggle powiadomienia → `setQueryData` lub zawężona inwalidacja | `src/hooks/*` | Usunięcie warsztatu znika z kalendarza i widoku grupy bez ręcznego odświeżenia |
| 13 | Jedno źródło palety: `tailwind.config.js` czyta z `tokens.ts`; zastąpienie hardkodowanych hexów tokenami; ujednolicenie `call.web.tsx` z `call.tsx`; decyzja StyleSheet-vs-NativeWind zapisana w README | `tailwind.config.js`, `tokens.ts`, ekrany z hexami | `git grep '#566B52'` poza `tokens.ts` → 0 trafień |
| 14 | Deduplikacja: `src/lib/alert.ts` (9 plików), `src/lib/format.ts` (`formatPrice`/`formatTime`), `src/lib/api-url.ts` (client+store); wyodrębnienie wspólnego `WorkshopForm` z create/edit | wiele | Zero zmian zachowania; spadek LOC ~600+ |
| 15 | Testy RTL krytycznych przepływów: AuthScreen (happy/error), join z `[id].tsx`, toggle zapisu, czysta funkcja `handleAppMessage` | nowe pliki testów | Min. 4 nowe pliki testowe zielone w CI |
| 16 | i18n ekranu głównego (`index.tsx`); `React.memo` na `WorkshopCard` + stabilny `renderItem`; usunięcie martwego kodu (`oauth-url.ts`, styl `fab`, no-op `color` w `ControlBtn`); aktualizacja README + `.env.example` | `index.tsx`, `README.md`, in. | Polski locale pokazuje polskie teksty; README zgodny ze stanem kodu |

**Wskazówki dla modelu wykonawczego:**
- Wzorce do naśladowania w repo: `AuthScreen.tsx` i `MonthView.tsx` (tokeny kolorów), `src/lib/*` (czyste funkcje z testami), istniejące guardy `_retry`/`_skipAuthRefresh` w `client.ts`.
- Klucze SecureStore są scope'owane per host API — nie zmieniać tego mechanizmu przy refaktorze auth.
- Zadania 3–5 i 9 dotykają ekranu rozmowy — testować na realnym urządzeniu/symulatorze (Daily nie działa w pełni w jest).
- Zadanie 4 zależy częściowo od 3 (oba zmieniają sposób przekazywania tokena) — robić w tej kolejności lub razem.

---

## Zweryfikowane jako OK (nie zgłaszać ponownie)

- Access token na native poprawnie w SecureStore, z walidacją wejścia (`requireTokenString`) i kluczami per host API (brak przecieku tokenów dev/prod).
- Żądania refresh poprawnie wyłączone z pętli retry (`_skipAuthRefresh`, `isRefreshRequest`).
- Android cleartext poprawnie ograniczony do IP prywatnych/local; HTTPS wymuszony na prod (`app.config.js`).
- `forgot-password` celowo pokazuje identyczne UI niezależnie od istnienia konta (brak enumeracji).
- Brak API keys / client secrets / klucza Daily w bundle — tokeny Daily mintowane po stronie serwera.
- Host-action: backend niezależnie autoryzuje po `trainer_id` (zweryfikowane krzyżowo: `../backend/docs/AUDIT_REPORT_BACKEND.md`, sekcja „Zweryfikowane jako OK”, rewizja backendu `2da3640`) — `role` w params to problem defense-in-depth, nie eskalacja.
- Dobra higiena dostępności: `accessibilityRole`/`accessibilityLabel`/`testID` na elementach interaktywnych.
- Solidne testy jednostkowe czystych funkcji (timezone w `workshopSchedule`, hashtagi, store auth).
