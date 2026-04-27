import { apiClient } from "./client";
import { normalizeAuthResponse } from "./auth-response";
import type {
  AuthResponse,
  HostActionResponse,
  HostActionType,
  JoinWorkshopResponse,
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
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", {
    email,
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
): Promise<HostActionResponse> {
  const { data } = await apiClient.post<HostActionResponse>(
    `/video/workshops/${workshopId}/host-action`,
    { action },
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
