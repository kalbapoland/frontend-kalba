import "../global.css";

import { useEffect } from "react";
import { Slot, SplashScreen } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const isRestoringToken = useAuthStore((s) => s.isRestoringToken);
  const restoreToken = useAuthStore((s) => s.restoreToken);

  useEffect(() => {
    restoreToken();
  }, [restoreToken]);

  useEffect(() => {
    if (!isRestoringToken) {
      SplashScreen.hideAsync();
    }
  }, [isRestoringToken]);

  if (isRestoringToken) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}
