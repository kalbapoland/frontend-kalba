import { apiClient } from "./client";
import type {
  AuthResponse,
  JoinWorkshopResponse,
  User,
  Workshop,
  WorkshopCreatePayload,
} from "@/types/api";

export async function exchangeGoogleToken(idToken: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/google", {
    id_token: idToken,
  });
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/users/me");
  return data;
}

export async function fetchWorkshops(): Promise<Workshop[]> {
  const { data } = await apiClient.get<Workshop[]>("/workshops/");
  return data;
}

export async function createWorkshop(
  payload: WorkshopCreatePayload,
): Promise<Workshop> {
  const { data } = await apiClient.post<Workshop>("/workshops/", payload);
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
