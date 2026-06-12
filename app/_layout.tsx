import "../global.css";
import "@/lib/i18n";

import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
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
      const isReminder = type === "reminder";

      return {
        shouldShowBanner: isReminder,
        shouldShowList: isReminder,
        shouldPlaySound: isReminder,
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

  useEffect(() => {
    if (!isRestoringToken && fontsReady) {
      SplashScreen.hideAsync();
    }
  }, [isRestoringToken, fontsReady]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const workshopId = extractWorkshopId(response);
        if (workshopId) {
          router.push(`/workshop/${workshopId}`);
        }
      },
    );

    void (async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      const workshopId = extractWorkshopId(response);
      if (workshopId) {
        router.push(`/workshop/${workshopId}`);
      }
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
