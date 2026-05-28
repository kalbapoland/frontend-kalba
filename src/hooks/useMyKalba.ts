import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteMyKalbaNotification,
  fetchMyKalbaDashboard,
  fetchMyKalbaNotifications,
  fetchMyKalbaSchedule,
  updateMyKalbaGoal,
  updateMyKalbaNotificationRead,
  markAllMyKalbaNotificationsRead,
} from "@/api/endpoints";

export function useMyKalbaDashboard() {
  return useQuery({
    queryKey: ["my-kalba", "dashboard"],
    queryFn: fetchMyKalbaDashboard,
    staleTime: 30_000,
  });
}

export function useMyKalbaSchedule(limit = 12) {
  return useQuery({
    queryKey: ["my-kalba", "schedule", limit],
    queryFn: () => fetchMyKalbaSchedule(limit),
    staleTime: 30_000,
  });
}

export function useMyKalbaNotifications(unreadOnly: boolean) {
  return useQuery({
    queryKey: ["my-kalba", "notifications", unreadOnly],
    queryFn: () => fetchMyKalbaNotifications(unreadOnly),
    staleTime: 15_000,
  });
}

export function useUpdateMyKalbaGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (monthlyTarget: number) => updateMyKalbaGoal(monthlyTarget),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-kalba"] });
    },
  });
}

export function useUpdateMyKalbaNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) =>
      updateMyKalbaNotificationRead(id, isRead),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-kalba"] });
    },
  });
}

export function useDeleteMyKalbaNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMyKalbaNotification(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-kalba"] });
    },
  });
}

export function useMarkAllMyKalbaNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllMyKalbaNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-kalba"] });
    },
  });
}
