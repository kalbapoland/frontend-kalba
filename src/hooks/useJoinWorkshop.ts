import { useMutation } from "@tanstack/react-query";

import { joinWorkshop } from "@/api/endpoints";

export function useJoinWorkshop() {
  return useMutation({
    mutationFn: (workshopId: string) => joinWorkshop(workshopId),
  });
}
