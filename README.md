# Kalba Frontend

React Native + Expo mobile app for discovering and booking workshops. Connects to the [Kalba backend](../backend-kalba/) API.

## Prerequisites

- **Node.js 20+** (required by Expo SDK 54 — check with `node -v`)
- **npm** (ships with Node)
- **Xcode** (macOS, for iOS development builds)
- **Android Studio** (for Android development builds)
- The Kalba backend running locally on port 8000 (or use `start:dev`/`web:dev` scripts to target the deployed instance)

## Setup

1. **Install dependencies**

   ```bash
   cd frontend-kalba
   npm install
   ```

2. **Configure environment variables**

   Copy the example and fill in your values:

   ```bash
   cp .env .env.local   # or edit .env directly
   ```

   | Variable | Description |
   |----------|-------------|
   | `EXPO_PUBLIC_API_URL_WEB` | Backend API base URL for web (default: `http://localhost:8000/api/v1`) |
   | `EXPO_PUBLIC_API_URL_NATIVE` | Backend API base URL for mobile — use your machine's local IP (e.g. `http://192.168.1.42:8000/api/v1`) |
   | `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth **Web** client ID from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
   | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth **iOS** client ID (requires a separate iOS client in Google Cloud Console) |

   For **Android emulator**, use `http://10.0.2.2:8000/api/v1` as the native URL.

3. **Start the backend**

   In a separate terminal:

   ```bash
   cd backend-kalba
   uv run uvicorn app.main:app --reload
   ```

## Running the app

All scripts have a `:dev` variant that targets the deployed backend (`https://backend-kalba.fly.dev`) instead of localhost.

| Platform | Local backend | Deployed backend |
|----------|--------------|-----------------|
| Dev server (native) | `npm start` | `npm run start:dev` |
| iOS build + run | `npm run ios` | `npm run ios:dev` |
| Android build + run | `npm run android` | `npm run android:dev` |
| Web | `npm run web` | `npm run web:dev` |

> **How env switching works:** The API URL is read from `Constants.expoConfig.extra` (set in `app.config.js`), which is evaluated by the Expo CLI process at startup — before the bundle is served. The `:dev` scripts copy `.env.dev` to `.env.development.local` (highest-priority dotenv file) so Expo's env loader picks up the remote URL. The file is auto-deleted when the script exits. Switching backends requires a **full Metro restart**.

### Mobile (development build)

Mobile requires a **development build** — Expo Go will not work. Google OAuth on iOS/Android needs custom URL schemes (the reverse client ID) registered in the native app binary. Expo Go doesn't register schemes from your `app.config.js`, so the OAuth redirect fails with `Error 400: invalid_request`.

**First run** — build the native app:

```bash
npm run ios        # local backend  (requires Xcode)
npm run ios:dev    # deployed backend
```

This generates the native project, registers the OAuth URL scheme, and installs the dev client on your device/simulator. The first build takes a few minutes.

**Subsequent runs against local backend** — start the dev server only:

```bash
npx expo start --dev-client
```

**Subsequent runs against deployed backend** — always use the full script (it sets the correct env before Metro starts):

```bash
npm run ios:dev    # or start:dev if the native binary is already installed
```

## Project structure

```
frontend-kalba/
├── app/                          # Expo Router file-based routes
│   ├── _layout.tsx               # Root layout (providers, splash, token restore)
│   ├── sign-in.tsx               # Google Sign-In screen
│   └── (app)/                    # Protected routes (requires auth)
│       ├── _layout.tsx           # Auth guard + Stack navigator
│       ├── create-workshop.tsx   # Create workshop form (trainer only)
│       ├── workshop/[id].tsx     # Workshop detail screen
│       └── (tabs)/               # Bottom tab navigator
│           ├── _layout.tsx       # Tab bar config
│           ├── index.tsx         # Workshop list (home)
│           └── profile.tsx       # User profile + sign out
├── src/
│   ├── api/
│   │   ├── client.ts             # Axios instance — reads URL from Constants.expoConfig.extra
│   │   └── endpoints.ts          # Typed API functions
│   ├── hooks/                    # TanStack Query hooks
│   ├── store/auth.ts             # Zustand auth store
│   ├── types/api.ts              # TypeScript interfaces
│   └── lib/query-client.ts       # React Query config
├── app.config.js                 # Expo app config (injects API URL into extra)
├── global.css                    # Tailwind CSS directives
├── tailwind.config.js            # NativeWind/Tailwind config
├── metro.config.js               # Metro bundler + NativeWind
├── .env.local                    # Local overrides (gitignored) — set your local IP here
└── .env.dev                      # Deployed backend URLs (used by :dev scripts)
```

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | React Native + Expo SDK 54 |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind v4 + Tailwind CSS v3 |
| Client state | Zustand |
| Server state | TanStack Query v5 |
| HTTP | Axios |
| Auth | expo-auth-session (Google OAuth) |
| Token storage | expo-secure-store (native) / localStorage (web) |

## Auth flow

1. User taps "Sign in with Google" on the sign-in screen
2. `expo-auth-session` opens the Google OAuth flow and returns an ID token
3. The app sends the ID token to `POST /api/v1/auth/google`
4. The backend verifies the token with Google, creates/finds the user, and returns a JWT
5. The JWT is stored in SecureStore (native) or localStorage (web)
6. All subsequent API requests include the JWT via an Axios interceptor
7. On 401 responses, the user is automatically signed out

## Troubleshooting

### Styles look stale / Tailwind changes not showing

After editing `tailwind.config.js` or `global.css`, clear the Metro cache:

```bash
npx expo start --clear
```

### App hitting the wrong server / URL not updating

The API URL comes from `Constants.expoConfig.extra`, which is evaluated when the Expo CLI process starts. If the wrong URL is active:

```bash
# 1. Stop any running Metro / Expo server (Ctrl+C)

# 2. Remove any stale .env.development.local (auto-deleted on clean exit, may linger after a crash)
rm -f .env.development.local

# 3. Clear Metro's bundle cache (on macOS, Metro caches in $TMPDIR, not /tmp)
rm -rf "$TMPDIR/metro-cache" "$TMPDIR/metro-file-map-"* node_modules/.cache .expo

# 4. Restart with the correct script
npm run ios:dev      # or npm run start:dev if the native binary is already installed
```

Verify the active URL: the Hermes console logs `[API] baseURL: <url>` on every cold start.

### Full cache reset

When things are stuck (white screen, old styles, module errors):

```bash
rm -rf node_modules/.cache
npx expo start --clear
```

### Complete reinstall

Nuclear option when nothing else works:

```bash
rm -rf node_modules
npm install
npx expo start --clear
```

### Expo Go not reflecting changes

Shake device > "Reload", or close and reopen Expo Go entirely.

## Type checking

```bash
npx tsc --noEmit
```
