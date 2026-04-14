import { apiClient } from "./client";
import type {
  AuthResponse,
  HostActionResponse,
  HostActionType,
  JoinWorkshopResponse,
  User,
  Workshop,
  WorkshopCreatePayload,
  WorkshopUpdatePayload,
} from "@/types/api";

function describeValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}

function normalizeOptionalStringField(
  payload: Record<string, unknown>,
  field: string,
): string | null {
  const value = payload[field];

  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(
      `Invalid auth response field ${field}: expected string, got ${describeValue(value)}`,
    );
  }

  return value;
}

export function normalizeAuthResponse(payload: unknown): AuthResponse {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid auth response: expected object payload");
  }

  const authPayload = payload as Record<string, unknown>;
  const accessToken = normalizeOptionalStringField(authPayload, "access_token");

  if (!accessToken) {
    throw new Error("Invalid auth response field access_token: expected non-empty string");
  }

  return {
    access_token: accessToken,
    refresh_token: normalizeOptionalStringField(authPayload, "refresh_token"),
    token_type: normalizeOptionalStringField(authPayload, "token_type") ?? "bearer",
    user_id: normalizeOptionalStringField(authPayload, "user_id"),
  };
}

export async function exchangeGoogleToken(idToken: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/google", {
    id_token: idToken,
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
