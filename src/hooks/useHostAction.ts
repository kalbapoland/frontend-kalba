import { useMutation } from "@tanstack/react-query";

import { sendHostAction } from "@/api/endpoints";
import type { HostActionType } from "@/types/api";

export interface HostActionInput {
  action: HostActionType;
  targetUserId?: string;
}

export function useHostAction(workshopId: string) {
  return useMutation({
    mutationFn: ({ action, targetUserId }: HostActionInput) =>
      sendHostAction(workshopId, action, targetUserId),
  });
}
