import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "@/store/auth";
import { useUser } from "@/hooks/useUser";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import { fonts } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { useThemedStyles } from "@/theme/useThemedStyles";
import type { ThemeColors } from "@/theme/themes";

function buildStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.canvas,
      alignItems: "center",
      justifyContent: "center",
    },
    errorScreen: {
      flex: 1,
      backgroundColor: c.canvas,
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      paddingHorizontal: 40,
    },
    errorPrimary: { textAlign: "center", fontFamily: fonts.display, fontSize: 16, color: c.inkBody },
    errorSecondary: { textAlign: "center", fontFamily: fonts.body, fontSize: 12, color: c.inkMuted },
    retryPill: {
      marginTop: 8,
      borderRadius: 999,
      backgroundColor: c.primary,
      paddingHorizontal: 32,
      paddingVertical: 16,
    },
    retryText: { fontFamily: fonts.bodyMedium, letterSpacing: 2, color: c.surface },
    signOut: { marginTop: 4, paddingVertical: 8 },
  });
}

export default function AppLayout() {
  const { t } = useTranslation();
  const token = useAuthStore((s) => s.token);
  const signOut = useAuthStore((s) => s.signOut);
  const { isLoading, isError, error, refetch } = useUser();
  const { colors } = useTheme();
  const s = useThemedStyles(buildStyles);

  // Register / refresh the Expo push token with the backend on every launch.
  // The hook skips itself on web and when permission is denied.
  usePushRegistration();

  if (!token) {
    return <Redirect href="/sign-in" />;
  }

  if (isLoading) {
    return (
      <View style={s.screen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    console.error("[AppLayout] useUser failed:", error);
    return (
      <View style={s.errorScreen}>
        <Text style={s.errorPrimary}>
          {t("common.server_unreachable")}
        </Text>
        <Text style={s.errorSecondary}>
          {(error as Error)?.message ?? t("common.unknown_error")}
        </Text>
        <Pressable onPress={() => refetch()} style={s.retryPill}>
          <Text style={s.retryText}>{t("common.retry")}</Text>
        </Pressable>
        <Pressable onPress={() => signOut()} style={s.signOut}>
          <Text style={s.errorSecondary}>{t("signout")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="create-workshop"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen
        name="workshop/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="workshop/edit"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen
        name="workshop/call"
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="create-group"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen name="group/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="group/edit"
        options={{ presentation: "modal", headerShown: false }}
      />
    </Stack>
  );
}