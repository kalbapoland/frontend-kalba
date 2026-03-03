import { View, Text, Pressable, Alert, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useAuthStore } from "@/store/auth";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const handleSignOut = () => {
    const doSignOut = async () => {
      queryClient.clear();
      await signOut();
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out?")) {
        doSignOut();
      }
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: doSignOut },
      ]);
    }
  };

  if (!user) return null;

  const initials = (user.full_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      className="flex-1 bg-canvas px-6"
      style={{ paddingTop: insets.top + 24 }}
    >
      {/* Profile Card */}
      <View className="items-center rounded-3xl bg-surface px-8 py-10">
        <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Text className="text-2xl font-bold text-primary">{initials}</Text>
        </View>

        <Text className="text-xl font-semibold text-ink">
          {user.full_name}
        </Text>
        <Text className="mt-1.5 text-sm text-ink-faint">{user.email}</Text>

        <View className="mt-4 rounded-full bg-canvas px-4 py-1.5">
          <Text className="text-xs font-medium capitalize tracking-wider text-ink-faint">
            {user.role}
          </Text>
        </View>
      </View>

      <View className="flex-1" />

      {/* Sign Out */}
      <Pressable
        onPress={handleSignOut}
        className="flex-row items-center justify-center gap-2 rounded-full border border-danger/30 bg-surface py-4"
        style={({ pressed }) => ({
          marginBottom: Math.max(insets.bottom, 16) + 60,
          opacity: pressed ? 0.8 : 1,
        })}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Ionicons name="log-out-outline" size={18} color="#C4836E" />
        <Text className="text-sm font-medium text-danger">Sign Out</Text>
      </Pressable>
    </View>
  );
}
