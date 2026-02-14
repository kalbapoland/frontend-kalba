import { useMutation } from "@tanstack/react-query";

import { sendHostAction } from "@/api/endpoints";
import type { HostActionType } from "@/types/api";

export function useHostAction(workshopId: string) {
  return useMutation({
    mutationFn: (action: HostActionType) =>
      sendHostAction(workshopId, action),
  });
}
