import type { AuthResponse } from "@/types/api";

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