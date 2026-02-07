import { View, Text, Pressable } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "@/store/auth";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const handleSignOut = async () => {
    queryClient.clear();
    await signOut();
  };

  if (!user) return null;

  return (
    <View
      className="flex-1 bg-canvas px-8"
      style={{ paddingTop: insets.top + 24 }}
    >
      <View className="items-center rounded-3xl bg-surface px-8 py-10">
        <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-primary/15">
          <Text className="text-4xl font-light text-primary">
            {user.full_name?.[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>

        <Text className="text-2xl font-light tracking-wide text-ink">
          {user.full_name}
        </Text>
        <Text className="mt-3 text-sm text-muted">{user.email}</Text>

        <View className="mt-5 rounded-full bg-secondary/10 px-5 py-1.5">
          <Text className="text-xs font-medium capitalize tracking-wider text-secondary">
            {user.role}
          </Text>
        </View>
      </View>

      <View className="flex-1" />

      <Pressable
        onPress={handleSignOut}
        className="mb-8 items-center py-4"
      >
        <Text className="text-sm tracking-wide text-muted">Sign Out</Text>
      </Pressable>
    </View>
  );
}
