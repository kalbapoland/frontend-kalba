import { useQuery } from "@tanstack/react-query";

import { fetchWorkshops } from "@/api/endpoints";
import type { Workshop } from "@/types/api";

export function useWorkshopDetail(id: string) {
  return useQuery({
    queryKey: ["workshops"],
    queryFn: fetchWorkshops,
    select: (workshops): Workshop | undefined =>
      workshops.find((w) => w.id === id),
  });
}
