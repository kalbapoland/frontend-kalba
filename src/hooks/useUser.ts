import { useQuery } from "@tanstack/react-query";

import { fetchCurrentUser } from "@/api/endpoints";
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
