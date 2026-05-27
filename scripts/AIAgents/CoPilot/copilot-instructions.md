# Kalba — Frontend

## Tech Stack

React Native + Expo SDK 54, TypeScript, NativeWind (Tailwind CSS), TanStack Query, Zustand, expo-router.
Targets iOS, Android, and Web.

## Architecture

- `app/` — Expo Router screens (file-based routing); `(app)/` = protected area requiring auth
- `src/api/client.ts` — Axios instance with JWT `Authorization` header injected
- `src/api/endpoints.ts` — all API call functions
- `src/hooks/` — TanStack Query hooks, one per resource/action
- `src/store/auth.ts` — Zustand auth store (JWT token + user object)
- `src/types/api.ts` — TypeScript interfaces matching backend DTOs

## Code Conventions

- TypeScript strict — no `any`, no untyped props
- All API types from `src/types/api.ts` — never duplicate inline
- Data fetching only through `src/hooks/`, never directly in components
- Server state via TanStack Query, auth state via Zustand only
- Styling with NativeWind `className` — never mix `StyleSheet.create()` with NativeWind
- Design tokens from `src/theme/tokens.ts` for colors and spacing
- Platform-specific files: `component.web.tsx` / `component.tsx` (native fallback)
- JWT stored in `expo-secure-store`, never in `AsyncStorage`

## Common Patterns

```typescript
// Custom query hook
export function useWorkshop(id: number) {
  return useQuery({
    queryKey: ['workshop', id],
    queryFn: () => getWorkshopById(id),
  });
}

// Mutation with cache invalidation
export function useJoinWorkshop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => joinWorkshop(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['workshop', id] });
    },
  });
}

// Screen consuming a hook
export default function WorkshopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error } = useWorkshop(Number(id));
  // ...
}
```

## Roles

- `user` — browse and join workshops
- `trainer` — create/edit/delete workshops, host video calls

## Design Document

`docs/DESIGN.md` is the living record of product/design decisions, current
capabilities, known limitations, and future improvement ideas. Consult it
before designing new features and update it whenever a decision is made
or a feature ships.

## Pre-Commit Code Review Workflow

Before committing changes, a multi-agent code review should be performed.

The entry point is `.github/prompts/code-reviewer.prompt.md` — a **manager** prompt that does not review code itself. For large diffs, it coordinates **max 2 independent reviewers**, each covering a subset of categories:

- `review-runtime-security.prompt.md` — Correctness, Security, State Management
- `review-architecture-quality.prompt.md` — Architecture, Documentation, Coding Standards, Performance, Tests

For small diffs, the manager may route to `review-single-pass.prompt.md`.

The manager dispatches the staged diff as clean independent passes, collects each reviewer report, and merges them into a single consolidated review with deduplication and strictest-severity-wins rules.

In Copilot Chat: reference the manager prompt file and provide the staged diff (`git diff --cached`). The manager handles the orchestration — you do not need to invoke specialists individually unless you want a focused review of one domain.

The reviewer reports findings and the developer decides whether to commit, fix issues first, or explicitly skip the review. This step is skipped only when the developer explicitly says so.

## Rules

- Never call API endpoints directly from a component — always use a hook
- Never store the JWT in `AsyncStorage` — use `expo-secure-store`
- Never use array index as a `key` prop in lists
- Never log tokens or auth responses
- Always handle loading and error states in components that fetch data
- Always invalidate relevant queries after a mutation succeeds
