import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";

import { useAuthStore } from "@/store/auth";

const extra = Constants.expoConfig?.extra;
const API_URL =
  Platform.OS === "web"
    ? (extra?.apiUrlWeb ?? "http://localhost:8000/api/v1")
    : (extra?.apiUrlNative ?? "http://localhost:8000/api/v1");

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
