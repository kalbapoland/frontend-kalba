import { Platform } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

import type { User } from "@/types/api";

const TOKEN_KEY = "kalba_token";
const REFRESH_TOKEN_KEY = "kalba_refresh_token";

async function saveToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
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
  if (Platform.OS === "web") {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
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
  setUser: (user: User) => void;
  signIn: (token: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  restoreToken: () => Promise<void>;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isRestoringToken: true,

  setUser: (user) => set({ user }),

  signIn: async (token, refreshToken) => {
    await saveToken(token);
    await saveRefreshToken(refreshToken);
    set({ token });
  },

  signOut: async () => {
    await removeToken();
    await removeRefreshToken();
    set({ token: null, user: null });
  },

  restoreToken: async () => {
    const token = await loadToken();
    set({ token, isRestoringToken: false });
  },

  setToken: (token) => {
    saveToken(token);
    set({ token });
  },
}));
