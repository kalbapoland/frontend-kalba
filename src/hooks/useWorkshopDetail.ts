import { useQuery } from "@tanstack/react-query";

import { fetchWorkshopById } from "@/api/endpoints";

export function useWorkshopDetail(id: string) {
  return useQuery({
    queryKey: ["workshop", id],
    queryFn: () => fetchWorkshopById(id),
    enabled: !!id,
  });
}
