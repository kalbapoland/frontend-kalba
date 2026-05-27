# Kalba — Frontend

## Project Overview

Mobile & web app for a meditation & workshop platform with live video sessions.
React Native + Expo (SDK 54), TypeScript, NativeWind (Tailwind CSS), TanStack Query, Zustand.
Targets iOS, Android, and Web.

## Architecture

```
app/                         # Expo Router file-based routing
├── _layout.tsx              # Root layout — fonts, auth gate, QueryClientProvider
├── sign-in.tsx              # Google OAuth sign-in screen
├── oauthredirect.tsx        # OAuth redirect handler
└── (app)/                   # Protected routes (requires auth)
    ├── _layout.tsx          # Auth guard layout
    ├── create-workshop.tsx  # Create workshop form (TRAINER only)
    ├── (tabs)/              # Bottom tab navigator
    │   ├── _layout.tsx
    │   ├── index.tsx        # Workshop list (home)
    │   └── profile.tsx      # User profile
    └── workshop/
        ├── [id].tsx         # Workshop detail
        ├── edit.tsx         # Edit workshop (TRAINER only)
        ├── call.tsx         # Video call screen (native)
        └── call.web.tsx     # Video call screen (web)

src/
├── api/
│   ├── client.ts            # Axios instance with auth header injection
│   └── endpoints.ts         # All API call functions
├── components/
│   └── FloatingTabBar.tsx   # Custom floating tab bar component
├── hooks/                   # TanStack Query hooks (one per resource/action)
│   ├── useUser.ts
│   ├── useWorkshops.ts
│   ├── useWorkshopDetail.ts
│   ├── useCreateWorkshop.ts
│   ├── useUpdateWorkshop.ts
│   ├── useDeleteWorkshop.ts
│   ├── useJoinWorkshop.ts
│   └── useHostAction.ts
├── lib/
│   ├── date.ts              # Date formatting helpers
│   ├── oauth-url.ts         # Google OAuth URL builder
│   └── query-client.ts      # TanStack QueryClient singleton
├── store/
│   └── auth.ts              # Zustand auth store (token + user)
├── theme/
│   └── tokens.ts            # Design tokens (colors, spacing)
└── types/
    └── api.ts               # TypeScript interfaces matching backend DTOs
```

### Auth Flow

1. User taps "Sign in with Google" → `expo-auth-session` opens OAuth browser
2. Google returns `id_token` → `POST /api/v1/auth/google`
3. Backend returns JWT → stored in `expo-secure-store` via Zustand auth store
4. `client.ts` attaches `Authorization: Bearer <token>` to every request

### Roles

- `user` — can browse and join workshops
- `trainer` — additional UI for creating/editing/deleting workshops, hosts video calls

## Dev Commands

```bash
npm install                  # install dependencies
npm run start                # start Expo dev server
npm run android              # run on Android emulator/device
npm run ios                  # run on iOS simulator/device
npm run web                  # run in browser

# dev environment (uses .env.dev)
npm run start:dev
npm run android:dev
npm run ios:dev
npm run web:dev
```

## Environment Variables

Expo reads variables from `.env.*` files via `expo-constants`.
Copy `.env.dev.example` → `.env.dev` for local development.

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL (e.g. `http://localhost:8000/api/v1`) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth — web/Expo client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth — Android client ID |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth — iOS client ID |

## Key Libraries

| Library | Purpose |
|---|---|
| `expo-router` | File-based navigation |
| `@tanstack/react-query` | Server state, caching, mutations |
| `zustand` | Client auth state |
| `axios` | HTTP client |
| `nativewind` | Tailwind CSS for React Native |
| `expo-auth-session` | Google OAuth |
| `expo-secure-store` | Secure token storage |
| `@daily-co/react-native-daily-js` | Video call SDK |
| `react-i18next` / `i18next` | Localization & pluralization |
| `expo-localization` | Device language detection |

## Code Conventions

- TypeScript throughout — no implicit `any`
- All API types defined in `src/types/api.ts`, matching backend DTOs exactly
- Data fetching via custom hooks in `src/hooks/` (never call API directly from components)
- Global state only for auth (`src/store/auth.ts`), everything else via TanStack Query
- Styling with NativeWind (`className` prop), design tokens in `src/theme/tokens.ts`
- Platform-specific files use `.web.tsx` / `.native.tsx` suffixes
- **Localization:** text literals must be wrapped in `const { t } = useTranslation()` with dictionary keys mapped in `src/locales/*.json`.

## Design Document

[`docs/DESIGN.md`](docs/DESIGN.md) is the living record of product/design
decisions, current capabilities, known limitations, and future improvement
ideas. **Consult it before designing new features and update it whenever a
decision is made or a feature ships.** Keep entries concise and dated.

## Git Conventions

- Branch names prefixed with developer name, e.g. `banaszki/feature-name`
- **Always create a new branch for every new feature or fix** — never commit directly to `main`
- Branch protection is enabled on `main` — direct pushes are blocked
- Never push directly to `main` — all changes via pull request
- PR requires approval from the other developer before merge
- CI (TypeScript check) must pass before merge is allowed

## Workflow Orchestration

### Pre-Commit Code Review (Default — Mandatory)

Before executing any `git commit` command:
1. Invoke the `code-reviewer` sub-agent on the staged changes (`git diff --cached`). The `code-reviewer` is now a **manager** that does not review itself:
    - for small diffs, it may run `review-single-pass`
    - for larger diffs, it dispatches to **max 2 independent reviewers** in parallel:
      - `review-runtime-security` (Correctness, Security, State Management)
    - `review-architecture-quality` (Architecture, Documentation, Coding Standards, Performance, Tests)
2. The manager merges the reviewer reports into a single consolidated review with a deduplicated issue list and a final verdict (`Approve` / `Request Changes` / `Block`).
3. Present the full consolidated review (and, when relevant, the verbatim reviewer reports) to the user.
4. Wait for the user to explicitly decide: approve and commit, request changes, or skip.
5. Only proceed with the commit after the user's decision.

Skip this step only if the user explicitly says so (e.g. "skip review", "just commit", "no review").

### Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or UI architectural decisions)
- Write detailed specs upfront to reduce ambiguity

### Verification Before Done

- Never mark a task complete without testing on at least one platform (iOS sim, Android, or web)
- Check that data mutations correctly invalidate TanStack Query cache

### Core Principles

- **Simplicity First:** Make every change as simple as possible.
- **No Laziness:** Find root causes. No temporary fixes.
- **Minimal Impact:** Changes should only touch what's necessary.
