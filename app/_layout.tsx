import "../global.css";
import "@/lib/i18n";

import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as ScreenOrientation from "expo-screen-orientation";
import { Slot, SplashScreen, useRouter } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import {
  Fraunces_300Light,
  Fraunces_400Regular,
  Fraunces_500Medium,
} from "@expo-google-fonts/fraunces";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";

import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth";

let isNotificationHandlerConfigured = false;

if (Platform.OS !== "web" && !isNotificationHandlerConfigured) {
  if (Platform.OS === "android") {
    void Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const type = notification.request.content.data?.type;
      const shouldAlert = type === "reminder" || type === "cancelled";

      return {
        shouldShowBanner: shouldAlert,
        shouldShowList: shouldAlert,
        shouldPlaySound: shouldAlert,
        shouldSetBadge: false,
      };
    },
  });

  isNotificationHandlerConfigured = true;
}

function extractWorkshopId(
  response: Notifications.NotificationResponse | null,
): string | null {
  const workshopId = response?.notification.request.content.data?.workshop_id;

  if (typeof workshopId === "string" && workshopId.length > 0) {
    return workshopId;
  }

  if (typeof workshopId === "number") {
    return String(workshopId);
  }

  return null;
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const isRestoringToken = useAuthStore((s) => s.isRestoringToken);
  const restoreToken = useAuthStore((s) => s.restoreToken);
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_300Light,
    Fraunces_400Regular,
    Fraunces_500Medium,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const fontsReady = fontsLoaded || fontError != null;

  useEffect(() => {
    restoreToken();
  }, [restoreToken]);

  // Keep the app portrait by default. The native config (`orientation:
  // "default"`) permits all orientations so the call screen can rotate; this
  // baseline lock ensures every other screen stays portrait. The call screen
  // unlocks on mount and re-locks portrait on unmount (BL-004).
  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }
    void ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP,
    );
  }, []);

  useEffect(() => {
    if (!isRestoringToken && fontsReady) {
      SplashScreen.hideAsync();
    }
  }, [isRestoringToken, fontsReady]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const handleNotificationResponse = (
      response: Notifications.NotificationResponse | null,
    ) => {
      const type = response?.notification.request.content.data?.type;
      if (type === "cancelled") {
        router.push("/my-kalba");
        return;
      }
      const workshopId = extractWorkshopId(response);
      if (workshopId) {
        router.push(`/workshop/${workshopId}`);
      }
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );

    void (async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      handleNotificationResponse(response);
    })();

    return () => {
      subscription.remove();
    };
  }, [router]);

  if (isRestoringToken || !fontsReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}
