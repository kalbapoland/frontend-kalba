import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteWorkshop } from "@/api/endpoints";

export function useDeleteWorkshop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workshopId: string) => deleteWorkshop(workshopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshops"] });
    },
  });
}
