import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateWorkshop } from "@/api/endpoints";
import type { WorkshopUpdatePayload } from "@/types/api";

export function useUpdateWorkshop(workshopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WorkshopUpdatePayload) =>
      updateWorkshop(workshopId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshop", workshopId] });
      queryClient.invalidateQueries({ queryKey: ["workshops"] });
    },
  });
}
