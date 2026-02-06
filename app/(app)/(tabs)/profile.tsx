import { View, Text, Pressable } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/store/auth";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    queryClient.clear();
    await signOut();
  };

  if (!user) return null;

  return (
    <View className="flex-1 bg-gray-50 px-6 pt-10">
      <View className="items-center rounded-2xl bg-white p-6 shadow-sm">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-primary">
          <Text className="text-3xl text-white">
            {user.full_name?.[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>

        <Text className="text-xl font-bold text-gray-900">
          {user.full_name}
        </Text>
        <Text className="mt-1 text-sm text-gray-500">{user.email}</Text>

        <View className="mt-3 rounded-full bg-secondary/10 px-4 py-1">
          <Text className="text-sm font-medium capitalize text-secondary">
            {user.role}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={handleSignOut}
        className="mt-8 items-center rounded-xl border border-red-200 bg-white py-4"
      >
        <Text className="font-semibold text-red-500">Sign Out</Text>
      </Pressable>
    </View>
  );
}
