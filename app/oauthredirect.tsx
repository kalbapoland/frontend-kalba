import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { useAuthStore } from "@/store/auth";

export default function OAuthRedirect() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  // Navigate to app as soon as sign-in completes
  useEffect(() => {
    if (token) {
      router.replace("/(app)/(tabs)");
    }
  }, [token]);

  // Safety net: if nothing happens in 20s, go back to sign-in
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/sign-in");
    }, 20000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

