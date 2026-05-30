import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createGroup,
  deleteGroup,
  fetchGroupById,
  fetchGroupMembers,
  fetchGroups,
  fetchGroupWorkshops,
  fetchMyGroups,
  removeGroupMember,
  subscribeToGroup,
  unsubscribeFromGroup,
  updateGroup,
} from "@/api/endpoints";
import type { GroupCreatePayload, GroupUpdatePayload } from "@/types/api";

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: fetchGroups,
  });
}

export function useMyGroups() {
  return useQuery({
    queryKey: ["groups", "mine"],
    queryFn: fetchMyGroups,
  });
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: ["groups", id],
    queryFn: () => fetchGroupById(id),
    enabled: !!id,
  });
}

export function useGroupMembers(id: string) {
  return useQuery({
    queryKey: ["groups", id, "members"],
    queryFn: () => fetchGroupMembers(id),
    enabled: !!id,
  });
}

export function useGroupWorkshops(id: string, enabled = true) {
  return useQuery({
    queryKey: ["groups", id, "workshops"],
    queryFn: () => fetchGroupWorkshops(id),
    enabled: !!id && enabled,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GroupCreatePayload) => createGroup(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useUpdateGroup(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GroupUpdatePayload) => updateGroup(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useSubscribeGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subscribeToGroup(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useUnsubscribeGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unsubscribeFromGroup(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useRemoveGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberUserId: string) =>
      removeGroupMember(groupId, memberUserId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["groups", groupId] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}
