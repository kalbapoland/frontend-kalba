# Kalba Frontend

React Native + Expo mobile app for discovering and booking workshops. Connects to the [Kalba backend](../backend-kalba/) API.

## Prerequisites

- **Node.js 20+** (required by Expo SDK 54 — check with `node -v`)
- **npm** (ships with Node)
- **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)) — for testing on a physical device
- The Kalba backend running locally on port 8000

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
   | `EXPO_PUBLIC_API_URL` | Backend API base URL (default: `http://localhost:8000/api/v1`) |
   | `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Your Google OAuth client ID from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |

   For **Android emulator**, use `http://10.0.2.2:8000/api/v1` instead of `localhost`.
   For a **physical device**, use your machine's local IP (e.g. `http://192.168.1.42:8000/api/v1`).

3. **Start the backend**

   In a separate terminal:

   ```bash
   cd backend-kalba
   uv run uvicorn app.main:app --reload
   ```

## Running the app

### Development server (all platforms)

```bash
npm start
```

This opens the Expo dev tools. From there:

- Press **`w`** to open in a web browser
- Press **`i`** to open in iOS Simulator (macOS only, requires Xcode)
- Press **`a`** to open in Android Emulator (requires Android Studio)
- Scan the **QR code** with Expo Go on your phone

### Platform-specific shortcuts

```bash
npm run web       # web browser only
npm run ios       # iOS Simulator only
npm run android   # Android Emulator only
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
│   │   ├── client.ts             # Axios instance with JWT interceptor
│   │   └── endpoints.ts          # Typed API functions
│   ├── hooks/                    # TanStack Query hooks
│   ├── store/auth.ts             # Zustand auth store
│   ├── types/api.ts              # TypeScript interfaces
│   └── lib/query-client.ts       # React Query config
├── global.css                    # Tailwind CSS directives
├── tailwind.config.js            # NativeWind/Tailwind config
├── metro.config.js               # Metro bundler + NativeWind
└── app.json                      # Expo app config
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

## Type checking

```bash
npx tsc --noEmit
```
