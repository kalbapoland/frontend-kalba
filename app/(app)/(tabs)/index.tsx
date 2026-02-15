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
import Ionicons from "@expo/vector-icons/Ionicons";

import { useWorkshops } from "@/hooks/useWorkshops";
import { useAuthStore } from "@/store/auth";
import type { Workshop } from "@/types/api";
import {
  formatWeekdayShort,
  formatDay,
  formatMonthLong,
  formatTime,
} from "@/lib/date";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatPrice(price: string | number): string {
  const n = Number(price);
  if (n === 0) return "Free";
  return `$${n % 1 === 0 ? n : n.toFixed(2)}`;
}

function WorkshopCard({ workshop }: { workshop: Workshop }) {
  const router = useRouter();
  const weekday = formatWeekdayShort(workshop.start_time);
  const day = formatDay(workshop.start_time);
  const month = formatMonthLong(workshop.start_time);
  const time = formatTime(workshop.start_time);

  return (
    <Pressable
      onPress={() => router.push(`/(app)/workshop/${workshop.id}`)}
      className="mb-4 flex-row overflow-hidden rounded-2xl bg-surface"
      style={({ pressed }) => ({
        opacity: pressed ? 0.95 : 1,
        shadowColor: "#3D3D3D",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      })}
    >
      {/* Left accent strip */}
      <View className="w-1 bg-primary" />

      <View className="flex-1 px-5 py-5">
        <Text className="text-lg font-semibold text-ink">
          {workshop.title}
        </Text>

        <View className="mt-2.5 flex-row items-center">
          <Ionicons name="calendar-outline" size={13} color="#8A8A85" />
          <Text className="ml-1.5 text-sm text-ink-light">
            {weekday}, {day} {month}
          </Text>
          <Text className="mx-2 text-ink-faint">·</Text>
          <Ionicons name="time-outline" size={13} color="#8A8A85" />
          <Text className="ml-1 text-sm text-ink-light">{time}</Text>
        </View>

        <View className="mt-3.5 flex-row items-center gap-2">
          <View className="rounded-lg bg-primary/10 px-2.5 py-1">
            <Text className="text-xs font-semibold text-primary">
              {formatPrice(workshop.price)}
            </Text>
          </View>
          <View className="flex-row items-center gap-1 rounded-lg bg-canvas px-2.5 py-1">
            <Ionicons name="time-outline" size={11} color="#8A8A85" />
            <Text className="text-xs text-ink-faint">
              {workshop.duration_minutes} min
            </Text>
          </View>
          <View className="flex-row items-center gap-1 rounded-lg bg-canvas px-2.5 py-1">
            <Ionicons name="people-outline" size={11} color="#8A8A85" />
            <Text className="text-xs text-ink-faint">
              {workshop.max_participants} spots
            </Text>
          </View>
        </View>
      </View>

      {/* Right chevron */}
      <View className="items-center justify-center pr-4">
        <Ionicons name="chevron-forward" size={16} color="#C5C3BC" />
      </View>
    </Pressable>
  );
}

function ListHeader({ name }: { name?: string }) {
  const firstName = name?.split(" ")[0];

  return (
    <View className="mb-6 px-1">
      <Text className="text-base text-ink-light">
        {getGreeting()}
        {firstName ? "," : ""}
      </Text>
      {firstName && (
        <Text className="mt-1 text-2xl font-semibold text-ink">
          {firstName}
        </Text>
      )}

      <Text className="mt-8 text-sm font-semibold uppercase tracking-wider text-ink-faint">
        Upcoming
      </Text>
      <View className="mt-2 h-0.5 w-8 rounded-full bg-primary" />
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
        <Ionicons name="cloud-offline-outline" size={40} color="#C5C3BC" />
        <Text className="mt-4 text-lg font-light text-ink-light">
          Unable to load workshops
        </Text>
        <Text className="mt-2 text-center text-sm text-muted">
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
          paddingHorizontal: 20,
          paddingTop: insets.top + 24,
          paddingBottom: 100,
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
            <Ionicons name="calendar-outline" size={40} color="#C5C3BC" />
            <Text className="mt-4 text-lg font-light text-ink-light">
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
          className="absolute right-6 h-14 w-14 items-center justify-center rounded-full bg-primary"
          style={{
            bottom: insets.bottom + 68,
            shadowColor: "#3D3D3D",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <Ionicons name="add" size={28} color="#FAFAF7" />
        </Pressable>
      )}
    </View>
  );
}
