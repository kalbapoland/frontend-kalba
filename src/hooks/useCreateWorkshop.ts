import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createWorkshop } from "@/api/endpoints";
import type { WorkshopCreatePayload } from "@/types/api";

export function useCreateWorkshop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WorkshopCreatePayload) => createWorkshop(payload),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ["workshops"] });
      queryClient.invalidateQueries({ queryKey: ["groups", payload.group_id, "workshops"] });
    },
  });
}
