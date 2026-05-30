import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Redirect, Stack } from "expo-router";

import { useAuthStore } from "@/store/auth";
import { useUser } from "@/hooks/useUser";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import { colors } from "@/theme/tokens";

export default function AppLayout() {
  const token = useAuthStore((s) => s.token);
  const signOut = useAuthStore((s) => s.signOut);
  const { isLoading, isError, error, refetch } = useUser();

  // Register / refresh the Expo push token with the backend on every launch.
  // The hook skips itself on web and when permission is denied.
  usePushRegistration();

  if (!token) {
    return <Redirect href="/sign-in" />;
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    console.error("[AppLayout] useUser failed:", error);
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-canvas px-10">
        <Text className="text-center text-base font-light text-ink-body">
          Could not reach the server.
        </Text>
        <Text className="text-center text-xs text-ink-muted">
          {(error as Error)?.message ?? "Unknown error"}
        </Text>
        <Pressable
          onPress={() => refetch()}
          className="mt-2 rounded-full bg-primary px-8 py-4"
        >
          <Text className="font-medium tracking-wide text-surface">Retry</Text>
        </Pressable>
        <Pressable onPress={() => signOut()} className="mt-1 py-2">
          <Text className="text-sm text-ink-muted">Sign out</Text>
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
