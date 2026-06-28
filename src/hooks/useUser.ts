import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchCurrentUser, updateCurrentUser } from "@/api/endpoints";
import { useAuthStore } from "@/store/auth";

export function useUser() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const user = await fetchCurrentUser();
      setUser(user);
      return user;
    },
    enabled: !!token,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: (updated) => {
      queryClient.setQueryData(["user", "me"], updated);
      setUser(updated);
    },
  });
}
