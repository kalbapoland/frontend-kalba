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

## Rules

- Never call API endpoints directly from a component — always use a hook
- Never store the JWT in `AsyncStorage` — use `expo-secure-store`
- Never use array index as a `key` prop in lists
- Never log tokens or auth responses
- Always handle loading and error states in components that fetch data
- Always invalidate relevant queries after a mutation succeeds
