import axios, { type InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";

import { loadRefreshToken, useAuthStore } from "@/store/auth";

import { normalizeAuthResponse } from "./auth-response";

// Extend Axios config to support retry flag for token refresh
declare module "axios" {
  interface AxiosRequestConfig {
    _retry?: boolean;
    _skipAuthRefresh?: boolean;
  }

  interface InternalAxiosRequestConfig {
    _retry?: boolean;
    _skipAuthRefresh?: boolean;
  }
}

const extra = Constants.expoConfig?.extra;
const bundledApiUrlWeb = process.env.EXPO_PUBLIC_API_URL_WEB;
const bundledApiUrlNative = process.env.EXPO_PUBLIC_API_URL_NATIVE;
const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const ANDROID_EMULATOR_HOSTS = new Set(["10.0.2.2", "10.0.3.2"]);

function isPrivateIpv4(hostname: string): boolean {
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname);
}

function getMetroHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) {
    return null;
  }
  return hostUri.split(":")[0] ?? null;
}

function resolveApiUrl(): string {
  if (Platform.OS === "web") {
    return bundledApiUrlWeb ?? extra?.apiUrlWeb ?? "http://localhost:8000/api/v1";
  }

  const configuredNativeUrl =
    bundledApiUrlNative ?? extra?.apiUrlNative ?? "http://localhost:8000/api/v1";

  if (!__DEV__) {
    return configuredNativeUrl;
  }

  const metroHost = getMetroHost();
  if (!metroHost) {
    return configuredNativeUrl;
  }

  try {
    const parsed = new URL(configuredNativeUrl);
    const configuredHost = parsed.hostname;
    if (configuredHost === metroHost) {
      return configuredNativeUrl;
    }

    if (ANDROID_EMULATOR_HOSTS.has(configuredHost)) {
      return configuredNativeUrl;
    }

    // In development builds, keep backend host in sync with Metro host so local IP changes don't break API calls.
    if (LOCALHOST_HOSTS.has(configuredHost) || isPrivateIpv4(configuredHost)) {
      parsed.hostname = metroHost;
      const rewritten = parsed.toString();
      console.warn(
        `[API] Rewrote native API host from ${configuredHost} to ${metroHost}. ` +
        "Update EXPO_PUBLIC_API_URL_NATIVE if this is intentional.",
      );
      return rewritten;
    }
  } catch {
    // Keep configured URL if parsing fails.
  }

  return configuredNativeUrl;
}

const API_URL = resolveApiUrl();

// Always log the resolved URL so you can verify it in Metro / Hermes debugger
console.log("[API] baseURL:", API_URL);
console.log(
  "[API] config source:",
  bundledApiUrlNative || bundledApiUrlWeb
    ? "process.env"
    : extra?.apiUrlNative || extra?.apiUrlWeb
      ? "expoConfig.extra"
      : "fallback",
);

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10_000, // 10 s — prevents hanging forever on unreachable server
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`[API] --> ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] <-- ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    if (axios.isAxiosError(error)) {
      console.error(
        "[API] error",
        error.code,
        error.response?.status,
        error.response?.data,
        error.config?.url,
      );
    } else {
      console.error("[API] unexpected error", error);
    }

    const originalRequest = error.config;
    const isRefreshRequest = originalRequest?.url?.includes("/auth/refresh");

    if (
      error.response?.status === 401
      && originalRequest
      && !originalRequest._retry
      && !originalRequest._skipAuthRefresh
      && !isRefreshRequest
    ) {
      originalRequest._retry = true;
      try {
        const storedRefreshToken = await loadRefreshToken();
        if (storedRefreshToken) {
          const refreshResponse = await apiClient.post("/auth/refresh", {
            refresh_token: storedRefreshToken,
          }, {
            _skipAuthRefresh: true,
          });
          const auth = normalizeAuthResponse(refreshResponse.data);
          await useAuthStore.getState().signIn(
            auth.access_token,
            auth.refresh_token,
          );
          originalRequest.headers.Authorization = `Bearer ${auth.access_token}`;
          return apiClient(originalRequest);
        }
      } catch {
        // Refresh failed — fall through to sign out
      }
      await useAuthStore.getState().signOut();
    }
    return Promise.reject(error);
  },
);
