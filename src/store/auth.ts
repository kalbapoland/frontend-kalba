import { Platform } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

import type { User } from "@/types/api";
import { unregisterPushToken } from "@/api/endpoints";

const LEGACY_TOKEN_KEY = "kalba_token";
const LEGACY_REFRESH_TOKEN_KEY = "kalba_refresh_token";

function sanitizeKeyPart(value: string): string {
  return value.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "default";
}

function getConfiguredApiUrl(): string {
  const extra = Constants.expoConfig?.extra;

  if (Platform.OS === "web") {
    return (
      process.env.EXPO_PUBLIC_API_URL_WEB
      ?? extra?.apiUrlWeb
      ?? "http://localhost:8000/api/v1"
    );
  }

  return (
    process.env.EXPO_PUBLIC_API_URL_NATIVE
    ?? extra?.apiUrlNative
    ?? "http://localhost:8000/api/v1"
  );
}

function normalizeAndroidEmulatorUrl(apiUrl: string): string {
  try {
    const parsed = new URL(apiUrl);
    if (Platform.OS === "android" && (parsed.hostname === "10.0.2.2" || parsed.hostname === "10.0.3.2")) {
      parsed.hostname = "127.0.0.1";
      return parsed.toString();
    }
  } catch {
    // Keep the original value if it is not a valid URL.
  }

  return apiUrl;
}

function buildScopedKey(baseKey: string): string {
  const apiUrl = normalizeAndroidEmulatorUrl(getConfiguredApiUrl());

  try {
    const parsed = new URL(apiUrl);
    const scope = sanitizeKeyPart(`${parsed.protocol}//${parsed.host}${parsed.pathname}`);
    return `${baseKey}_${scope}`;
  } catch {
    return `${baseKey}_${sanitizeKeyPart(apiUrl)}`;
  }
}

const TOKEN_KEY = buildScopedKey(LEGACY_TOKEN_KEY);
const REFRESH_TOKEN_KEY = buildScopedKey(LEGACY_REFRESH_TOKEN_KEY);

function describeTokenValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}

function requireTokenString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value) {
    throw new Error(
      `Invalid ${name}: expected non-empty string, got ${describeTokenValue(value)}`,
    );
  }

  return value;
}

function normalizeOptionalToken(value: unknown, name: string): string | null {
  if (value == null || value === "") {
    return null;
  }

  return requireTokenString(value, name);
}

async function saveToken(token: string): Promise<void> {
  const normalizedToken = requireTokenString(token, "access_token");

  if (Platform.OS === "web") {
    localStorage.setItem(TOKEN_KEY, normalizedToken);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, normalizedToken);
  }
}

async function removeLegacyAuthKeys(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    return;
  }

  await Promise.all([
    SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY),
    SecureStore.deleteItemAsync(LEGACY_REFRESH_TOKEN_KEY),
  ]);
}

async function loadToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function removeToken(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

async function saveRefreshToken(token: string): Promise<void> {
  const normalizedToken = requireTokenString(token, "refresh_token");

  if (Platform.OS === "web") {
    localStorage.setItem(REFRESH_TOKEN_KEY, normalizedToken);
  } else {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, normalizedToken);
  }
}

export async function loadRefreshToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

async function removeRefreshToken(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
}

interface AuthState {
  token: string | null;
  user: User | null;
  isRestoringToken: boolean;
  pushToken: string | null;
  setUser: (user: User) => void;
  signIn: (token: string, refreshToken?: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  restoreToken: () => Promise<void>;
  setToken: (token: string) => void;
  setPushToken: (pushToken: string) => void;
  clearPushToken: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isRestoringToken: true,
  pushToken: null,

  setUser: (user) => set({ user }),

  signIn: async (token, refreshToken) => {
    const normalizedToken = requireTokenString(token, "access_token");
    const normalizedRefreshToken = normalizeOptionalToken(
      refreshToken,
      "refresh_token",
    );

    await saveToken(normalizedToken);

    if (normalizedRefreshToken) {
      await saveRefreshToken(normalizedRefreshToken);
    } else {
      await removeRefreshToken();
    }

    await removeLegacyAuthKeys();

    set({ token: normalizedToken });
  },

  signOut: async () => {
    const pushToken = useAuthStore.getState().pushToken;
    if (pushToken) {
      try {
        await unregisterPushToken({ token: pushToken });
      } catch {
        // Non-fatal — token will expire naturally or be cleaned up on
        // the next DeviceNotRegistered response from Expo
      }
    }
    await removeToken();
    await removeRefreshToken();
    await removeLegacyAuthKeys();
    set({ token: null, user: null, pushToken: null });
  },

  restoreToken: async () => {
    const token = await loadToken();
    await removeLegacyAuthKeys();
    set({ token, isRestoringToken: false });
  },

  setToken: (token) => {
    const normalizedToken = requireTokenString(token, "access_token");
    void saveToken(normalizedToken);
    set({ token: normalizedToken });
  },

  setPushToken: (pushToken) => set({ pushToken }),

  clearPushToken: () => set({ pushToken: null }),
}));
