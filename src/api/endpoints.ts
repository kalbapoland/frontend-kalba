import { apiClient } from "./client";
import { normalizeAuthResponse } from "./auth-response";
import type {
  AuthResponse,
  Group,
  GroupCreatePayload,
  GroupMember,
  GroupUpdatePayload,
  HostActionResponse,
  HostActionType,
  JoinWorkshopResponse,
  MyKalbaDashboard,
  MyKalbaGoal,
  MyKalbaNotification,
  MyWorkshopsQuery,
  PushTokenRegister,
  PushTokenUnregister,
  User,
  Workshop,
  WorkshopCreatePayload,
  WorkshopUpdatePayload,
} from "@/types/api";

export async function exchangeGoogleToken(idToken: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/google", {
    id_token: idToken,
  });
  return normalizeAuthResponse(data);
}

export async function registerWithEmail(
  email: string,
  password: string,
  fullName: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", {
    email,
    password,
    full_name: fullName,
  });
  return normalizeAuthResponse(data);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.post("/auth/forgot-password", { email });
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/reset-password", {
    token,
    password,
  });
  return normalizeAuthResponse(data);
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", {
    email,
    password,
  });
  return normalizeAuthResponse(data);
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/refresh", {
    refresh_token: refreshToken,
  });
  return normalizeAuthResponse(data);
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/users/me");
  return data;
}

export async function deleteAccount(): Promise<void> {
  await apiClient.delete("/users/me");
}

export async function fetchWorkshops(): Promise<Workshop[]> {
  const { data } = await apiClient.get<Workshop[]>("/workshops/");
  return data;
}

export async function fetchWorkshopById(id: string): Promise<Workshop> {
  const { data } = await apiClient.get<Workshop>(`/workshops/${id}`);
  return data;
}

export async function createWorkshop(
  payload: WorkshopCreatePayload,
): Promise<Workshop> {
  const { data } = await apiClient.post<Workshop>("/workshops/", payload);
  return data;
}

export async function updateWorkshop(
  id: string,
  payload: WorkshopUpdatePayload,
): Promise<Workshop> {
  const { data } = await apiClient.patch<Workshop>(
    `/workshops/${id}`,
    payload,
  );
  return data;
}

export async function deleteWorkshop(id: string): Promise<void> {
  await apiClient.delete(`/workshops/${id}`);
}

export async function fetchMyWorkshops(
  query: MyWorkshopsQuery = {},
): Promise<Workshop[]> {
  const { data } = await apiClient.get<Workshop[]>("/workshops/mine", {
    params: {
      role: query.role,
      from: query.from,
      to: query.to,
    },
  });
  return data;
}

export async function enrollWorkshop(id: string): Promise<Workshop> {
  const { data } = await apiClient.post<Workshop>(`/workshops/${id}/enroll`);
  return data;
}

export async function unenrollWorkshop(id: string): Promise<void> {
  await apiClient.delete(`/workshops/${id}/enroll`);
}

// --- Groups ---

export async function fetchGroups(): Promise<Group[]> {
  const { data } = await apiClient.get<Group[]>("/groups/");
  return data;
}

export async function fetchMyGroups(): Promise<Group[]> {
  const { data } = await apiClient.get<Group[]>("/groups/mine");
  return data;
}

export async function fetchGroupById(id: string): Promise<Group> {
  const { data } = await apiClient.get<Group>(`/groups/${id}`);
  return data;
}

export async function createGroup(
  payload: GroupCreatePayload,
): Promise<Group> {
  const { data } = await apiClient.post<Group>("/groups/", payload);
  return data;
}

export async function updateGroup(
  id: string,
  payload: GroupUpdatePayload,
): Promise<Group> {
  const { data } = await apiClient.patch<Group>(`/groups/${id}`, payload);
  return data;
}

export async function deleteGroup(id: string): Promise<void> {
  await apiClient.delete(`/groups/${id}`);
}

export async function subscribeToGroup(id: string): Promise<Group> {
  const { data } = await apiClient.post<Group>(`/groups/${id}/subscribe`);
  return data;
}

export async function unsubscribeFromGroup(id: string): Promise<void> {
  await apiClient.post(`/groups/${id}/unsubscribe`);
}

export async function fetchGroupMembers(id: string): Promise<GroupMember[]> {
  const { data } = await apiClient.get<GroupMember[]>(`/groups/${id}/members`);
  return data;
}

export async function removeGroupMember(
  id: string,
  memberUserId: string,
): Promise<void> {
  await apiClient.delete(`/groups/${id}/members/${memberUserId}`);
}

export async function fetchGroupWorkshops(id: string): Promise<Workshop[]> {
  const { data } = await apiClient.get<Workshop[]>(`/groups/${id}/workshops`);
  return data;
}

export async function joinWorkshop(
  workshopId: string,
): Promise<JoinWorkshopResponse> {
  const { data } = await apiClient.post<JoinWorkshopResponse>(
    `/video/workshops/${workshopId}/join`,
  );
  return data;
}

export async function sendHostAction(
  workshopId: string,
  action: HostActionType,
  targetUserId?: string,
): Promise<HostActionResponse> {
  const { data } = await apiClient.post<HostActionResponse>(
    `/video/workshops/${workshopId}/host-action`,
    targetUserId ? { action, target_user_id: targetUserId } : { action },
  );
  return data;
}

export async function registerPushToken(
  payload: PushTokenRegister,
): Promise<void> {
  await apiClient.put("/users/me/push-tokens", payload);
}

export async function unregisterPushToken(
  payload: PushTokenUnregister,
): Promise<void> {
  await apiClient.post("/users/me/push-tokens/unregister", payload);
}

export async function suggestTags(
  prefix: string,
  limit = 10,
): Promise<string[]> {
  const { data } = await apiClient.get<string[]>("/tags/suggest", {
    params: { q: prefix, limit },
  });
  return data;
}

export async function fetchMyKalbaDashboard(): Promise<MyKalbaDashboard> {
  const { data } = await apiClient.get<MyKalbaDashboard>("/users/me/my-kalba/dashboard");
  return data;
}

export async function updateMyKalbaGoal(monthlyTarget: number): Promise<MyKalbaGoal> {
  const { data } = await apiClient.put<MyKalbaGoal>("/users/me/my-kalba/goal", {
    monthly_target: monthlyTarget,
  });
  return data;
}

export async function fetchMyKalbaSchedule(limit = 12): Promise<Workshop[]> {
  const { data } = await apiClient.get<Workshop[]>("/users/me/my-kalba/schedule", {
    params: { limit },
  });
  return data;
}

export async function fetchMyKalbaNotifications(
  unreadOnly: boolean,
  limit = 50,
): Promise<MyKalbaNotification[]> {
  const { data } = await apiClient.get<MyKalbaNotification[]>(
    "/users/me/my-kalba/notifications",
    {
      params: {
        unread_only: unreadOnly,
        limit,
      },
    },
  );
  return data;
}

export async function updateMyKalbaNotificationRead(
  id: string,
  isRead: boolean,
): Promise<MyKalbaNotification> {
  const { data } = await apiClient.patch<MyKalbaNotification>(
    `/users/me/my-kalba/notifications/${id}/read`,
    { is_read: isRead },
  );
  return data;
}

export async function deleteMyKalbaNotification(id: string): Promise<void> {
  await apiClient.delete(`/users/me/my-kalba/notifications/${id}`);
}

export async function markAllMyKalbaNotificationsRead(): Promise<void> {
  await apiClient.post("/users/me/my-kalba/notifications/mark-all-read");
}
