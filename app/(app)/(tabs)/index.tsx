import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";

import { useWorkshops } from "@/hooks/useWorkshops";
import { useAuthStore } from "@/store/auth";
import type { Workshop } from "@/types/api";

function WorkshopCard({ workshop }: { workshop: Workshop }) {
  const router = useRouter();
  const date = new Date(workshop.start_time);

  return (
    <Pressable
      onPress={() => router.push(`/(app)/workshop/${workshop.id}`)}
      className="mb-3 rounded-xl bg-white p-4 shadow-sm"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <Text className="text-lg font-semibold text-gray-900">
        {workshop.title}
      </Text>
      {workshop.description ? (
        <Text className="mt-1 text-sm text-gray-500" numberOfLines={2}>
          {workshop.description}
        </Text>
      ) : null}
      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-sm text-gray-600">
          {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
        <Text className="text-sm font-medium text-primary">
          {Number(workshop.price) > 0 ? `$${workshop.price}` : "Free"}
        </Text>
      </View>
      <View className="mt-1 flex-row items-center justify-between">
        <Text className="text-xs text-gray-400">
          {workshop.duration_minutes} min
        </Text>
        <Text className="text-xs text-gray-400">
          Max {workshop.max_participants} participants
        </Text>
      </View>
    </Pressable>
  );
}

export default function WorkshopListScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useWorkshops();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const isTrainer = user?.role === "trainer";

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="mb-4 text-center text-red-500">
          Failed to load workshops.
        </Text>
        <Pressable
          onPress={() => refetch()}
          className="rounded-lg bg-primary px-6 py-3"
        >
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WorkshopCard workshop={item} />}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View className="items-center py-20">
            <Text className="text-lg text-gray-400">
              No upcoming workshops
            </Text>
          </View>
        }
      />
      {isTrainer && (
        <Pressable
          onPress={() => router.push("/(app)/create-workshop")}
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
          style={{ elevation: 4 }}
        >
          <Text className="text-2xl text-white">+</Text>
        </Pressable>
      )}
    </View>
  );
}
