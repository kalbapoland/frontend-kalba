import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";

import { useAuthStore } from "@/store/auth";
import { useUser } from "@/hooks/useUser";

export default function AppLayout() {
  const token = useAuthStore((s) => s.token);
  const { isLoading } = useUser();

  if (!token) {
    return <Redirect href="/sign-in" />;
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator size="large" color="#7C8B72" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#F5F2ED" },
        headerShadowVisible: false,
        headerTintColor: "#6B6B66",
        headerTitleStyle: {
          fontWeight: "300",
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="create-workshop"
        options={{ presentation: "modal", title: "New Workshop" }}
      />
      <Stack.Screen
        name="workshop/[id]"
        options={{ title: "" }}
      />
    </Stack>
  );
}
