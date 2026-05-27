import { useQuery } from "@tanstack/react-query";

import { fetchMyWorkshops } from "@/api/endpoints";
import type { MyWorkshopsQuery } from "@/types/api";

export function useMyWorkshops(query: MyWorkshopsQuery = {}) {
  return useQuery({
    queryKey: ["my-workshops", query.role ?? "all", query.from ?? null, query.to ?? null],
    queryFn: () => fetchMyWorkshops(query),
    staleTime: 30_000,
  });
}
