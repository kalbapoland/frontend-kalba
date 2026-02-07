import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWorkshops } from "@/hooks/useWorkshops";
import { useAuthStore } from "@/store/auth";
import type { Workshop } from "@/types/api";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function WorkshopCard({ workshop }: { workshop: Workshop }) {
  const router = useRouter();
  const date = new Date(workshop.start_time);

  return (
    <Pressable
      onPress={() => router.push(`/(app)/workshop/${workshop.id}`)}
      className="mb-4 rounded-2xl bg-surface px-6 py-6"
    >
      <Text className="text-lg font-normal tracking-wide text-ink">
        {workshop.title}
      </Text>

      <View className="mt-4 flex-row items-center justify-between">
        <Text className="text-sm text-ink-faint">
          {date.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}{" "}
          · {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
        <Text className="text-sm font-medium text-primary">
          {Number(workshop.price) > 0 ? `$${workshop.price}` : "Free"}
        </Text>
      </View>
    </Pressable>
  );
}

function ListHeader({ name }: { name?: string }) {
  const firstName = name?.split(" ")[0];

  return (
    <View className="mb-6 px-1">
      <Text className="text-2xl font-light tracking-wide text-ink">
        {getGreeting()}
        {firstName ? `, ${firstName}` : ""}
      </Text>
      <Text className="mt-2 text-sm text-muted">Upcoming workshops</Text>
    </View>
  );
}

export default function WorkshopListScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useWorkshops();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTrainer = user?.role === "trainer";

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator size="large" color="#7C8B72" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-12">
        <Text className="text-lg font-light text-ink-light">
          Unable to load workshops
        </Text>
        <Text className="mt-3 text-center text-sm text-muted">
          Check your connection and try again
        </Text>
        <Pressable
          onPress={() => refetch()}
          className="mt-8 rounded-2xl bg-primary px-8 py-4"
        >
          <Text className="font-medium tracking-wide text-surface">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WorkshopCard workshop={item} />}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: insets.top + 20,
          paddingBottom: 40,
        }}
        ListHeaderComponent={<ListHeader name={user?.full_name} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#7C8B72"
          />
        }
        ListEmptyComponent={
          <View className="items-center py-24">
            <Text className="text-lg font-light text-ink-light">
              Nothing scheduled yet
            </Text>
            <Text className="mt-2 text-sm text-muted">
              Check back soon for new workshops
            </Text>
          </View>
        }
      />
      {isTrainer && (
        <Pressable
          onPress={() => router.push("/(app)/create-workshop")}
          className="absolute bottom-8 right-8 h-14 w-14 items-center justify-center rounded-full bg-primary"
          style={{
            shadowColor: "#3D3D3D",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text className="text-2xl font-light text-surface">+</Text>
        </Pressable>
      )}
    </View>
  );
}
