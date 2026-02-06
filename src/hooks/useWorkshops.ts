import { useQuery } from "@tanstack/react-query";

import { fetchWorkshops } from "@/api/endpoints";

export function useWorkshops() {
  return useQuery({
    queryKey: ["workshops"],
    queryFn: fetchWorkshops,
  });
}
