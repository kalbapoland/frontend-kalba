import { useMutation, useQueryClient } from "@tanstack/react-query";

import { enrollWorkshop, unenrollWorkshop } from "@/api/endpoints";

export function useEnrollWorkshop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workshopId: string) => enrollWorkshop(workshopId),
    onSuccess: (_data, workshopId) => {
      qc.invalidateQueries({ queryKey: ["workshop", workshopId] });
      qc.invalidateQueries({ queryKey: ["my-workshops"] });
      qc.invalidateQueries({ queryKey: ["workshops"] });
    },
  });
}

export function useUnenrollWorkshop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workshopId: string) => unenrollWorkshop(workshopId),
    onSuccess: (_data, workshopId) => {
      qc.invalidateQueries({ queryKey: ["workshop", workshopId] });
      qc.invalidateQueries({ queryKey: ["my-workshops"] });
      qc.invalidateQueries({ queryKey: ["workshops"] });
    },
  });
}
