import { Platform } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

import type { User } from "@/types/api";
import { unregisterPushToken } from "@/api/endpoints";

const TOKEN_KEY = "kalba_token";
const REFRESH_TOKEN_KEY = "kalba_refresh_token";

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
    set({ token: null, user: null, pushToken: null });
  },

  restoreToken: async () => {
    const token = await loadToken();
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
