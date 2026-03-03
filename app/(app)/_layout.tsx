import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Redirect, Stack } from "expo-router";

import { useAuthStore } from "@/store/auth";
import { useUser } from "@/hooks/useUser";

export default function AppLayout() {
  const token = useAuthStore((s) => s.token);
  const signOut = useAuthStore((s) => s.signOut);
  const { isLoading, isError, error, refetch } = useUser();

  if (!token) {
    return <Redirect href="/sign-in" />;
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator size="large" color="#5E6B5A" />
      </View>
    );
  }

  if (isError) {
    console.error("[AppLayout] useUser failed:", error);
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-canvas px-10">
        <Text className="text-center text-base font-light text-ink-light">
          Could not reach the server.
        </Text>
        <Text className="text-center text-xs text-muted">
          {(error as Error)?.message ?? "Unknown error"}
        </Text>
        <Pressable
          onPress={() => refetch()}
          className="mt-2 rounded-full bg-primary px-8 py-4"
        >
          <Text className="font-medium tracking-wide text-surface">Retry</Text>
        </Pressable>
        <Pressable onPress={() => signOut()} className="mt-1 py-2">
          <Text className="text-sm text-ink-faint">Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#F5F2ED" },
        headerShadowVisible: false,
        headerTintColor: "#5E6B5A",
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 17,
          color: "#3D3D3D",
        },
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="create-workshop"
        options={{ presentation: "modal", title: "New Workshop" }}
      />
      <Stack.Screen
        name="workshop/[id]"
        options={{ title: "Workshop" }}
      />
      <Stack.Screen
        name="workshop/edit"
        options={{ presentation: "modal", title: "Edit Workshop" }}
      />
      <Stack.Screen
        name="workshop/call"
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: "fade",
        }}
      />
    </Stack>
  );
}
