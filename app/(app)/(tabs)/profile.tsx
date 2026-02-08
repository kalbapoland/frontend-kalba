import { View, Text, Pressable, Alert, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "@/store/auth";

function SettingsRow({
  label,
  last = false,
}: {
  label: string;
  last?: boolean;
}) {
  return (
    <Pressable
      className={`flex-row items-center justify-between py-4 ${
        last ? "" : "border-b border-subtle"
      }`}
    >
      <Text className="text-base text-ink">{label}</Text>
      <Text className="text-sm text-ink-faint">›</Text>
    </Pressable>
  );
}

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

  return (
    <View
      className="flex-1 bg-canvas px-6"
      style={{ paddingTop: insets.top + 24 }}
    >
      {/* Profile Header Card */}
      <View
        className="items-center rounded-3xl bg-surface px-8 py-10"
        style={{
          shadowColor: "#3D3D3D",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-canvas">
          <Text className="text-3xl font-semibold text-primary">
            {user.full_name?.[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>

        <Text className="text-xl font-semibold text-ink">{user.full_name}</Text>
        <Text className="mt-2 text-sm text-ink-faint">{user.email}</Text>

        <View className="mt-4 rounded-full bg-canvas px-4 py-1.5">
          <Text className="text-xs font-medium capitalize tracking-wider text-ink-faint">
            {user.role}
          </Text>
        </View>
      </View>

      {/* Settings List */}
      <View className="mt-6 rounded-2xl bg-surface px-5">
        <SettingsRow label="Account" />
        <SettingsRow label="Preferences" last />
      </View>

      <View className="flex-1" />

      {/* Destructive Sign Out */}
      <Pressable
        onPress={handleSignOut}
        className="items-center rounded-2xl border border-danger-light bg-surface py-4"
        style={{ marginBottom: Math.max(insets.bottom, 16) + 60 }}
      >
        <Text className="text-sm font-medium text-danger">Sign Out</Text>
      </Pressable>
    </View>
  );
}
