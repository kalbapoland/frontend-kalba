import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";

import { useAuthStore } from "@/store/auth";

const extra = Constants.expoConfig?.extra;
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
    return extra?.apiUrlWeb ?? "http://localhost:8000/api/v1";
  }

  const configuredNativeUrl = extra?.apiUrlNative ?? "http://localhost:8000/api/v1";

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
        error.code,                          // e.g. ECONNABORTED (timeout), ERR_NETWORK
        error.response?.status,              // HTTP status if server replied
        error.response?.data,               // body if server replied
        error.config?.url,
      );
    } else {
      console.error("[API] unexpected error", error);
    }
    if (error.response?.status === 401) {
      await useAuthStore.getState().signOut();
    }
    return Promise.reject(error);
  },
);
