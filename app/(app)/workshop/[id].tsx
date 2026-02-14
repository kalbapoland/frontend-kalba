import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AxiosError } from "axios";

import { useWorkshopDetail } from "@/hooks/useWorkshopDetail";
import { useJoinWorkshop } from "@/hooks/useJoinWorkshop";
import { useDeleteWorkshop } from "@/hooks/useDeleteWorkshop";
import { useAuthStore } from "@/store/auth";
import { formatWeekdayLong, formatMonthDay, formatTime } from "@/lib/date";

function formatPrice(price: string | number): string {
  const n = Number(price);
  if (n === 0) return "Free";
  return `$${n % 1 === 0 ? n : n.toFixed(2)}`;
}

export default function WorkshopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workshop, isLoading } = useWorkshopDetail(id!);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const joinMutation = useJoinWorkshop();
  const deleteMutation = useDeleteWorkshop();
  const user = useAuthStore((s) => s.user);

  const handleJoin = () => {
    joinMutation.mutate(id!, {
      onSuccess: (data) => {
        router.push({
          pathname: "/(app)/workshop/call",
          params: {
            workshopId: id!,
            token: data.token,
            roomUrl: data.room_url,
            role: data.role,
            rules: JSON.stringify(data.rules),
          },
        });
      },
      onError: (error) => {
        const axiosErr = error as AxiosError<{ detail?: string }>;
        const msg =
          axiosErr.response?.data?.detail ?? "Could not join workshop";
        Alert.alert("Unable to Join", msg);
      },
    });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Workshop",
      "Are you sure you want to delete this workshop? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate(id!, {
              onSuccess: () => router.back(),
              onError: () =>
                Alert.alert("Error", "Failed to delete workshop"),
            });
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator size="large" color="#7C8B72" />
      </View>
    );
  }

  if (!workshop) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <Text className="text-lg font-light text-ink-light">
          Workshop not found
        </Text>
      </View>
    );
  }

  const isOwner = user?.id === workshop.trainer_id;
  const weekday = formatWeekdayLong(workshop.start_time);
  const monthDay = formatMonthDay(workshop.start_time);
  const time = formatTime(workshop.start_time);

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <View className="px-6 pb-6 pt-4">
          <Text className="text-2xl font-bold text-ink">{workshop.title}</Text>
          <Text className="mt-3 text-base text-ink-light">
            {weekday}, {monthDay} · {time}
          </Text>
        </View>

        {/* About Section */}
        {workshop.description ? (
          <View className="px-6 pb-6">
            <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-faint">
              About
            </Text>
            <Text className="text-base leading-7 text-ink-light">
              {workshop.description}
            </Text>
          </View>
        ) : null}

        {/* Details Section */}
        <View className="px-6 pb-6">
          <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-faint">
            Details
          </Text>
          <View
            className="rounded-2xl bg-surface px-5"
            style={{
              shadowColor: "#3D3D3D",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 1,
            }}
          >
            <DetailRow
              icon="clock"
              label="Duration"
              value={`${workshop.duration_minutes} min`}
            />
            <DetailRow
              icon="people"
              label="Spots"
              value={`${workshop.max_participants} max`}
            />
            <DetailRow
              icon="price"
              label="Price"
              value={formatPrice(workshop.price)}
              last
            />
          </View>
        </View>

        {/* Owner Actions */}
        {isOwner && (
          <View className="px-6 pb-6">
            <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-faint">
              Manage
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 items-center rounded-2xl border border-primary bg-surface py-3.5"
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/workshop/edit",
                    params: { id: id! },
                  })
                }
              >
                <Text className="text-sm font-semibold text-primary">
                  Edit Workshop
                </Text>
              </Pressable>
              <Pressable
                className="flex-1 items-center rounded-2xl border border-danger bg-surface py-3.5"
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                onPress={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Text className="text-sm font-semibold text-danger">
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      <View
        className="border-t border-subtle bg-canvas px-6 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Pressable
          className="items-center rounded-2xl bg-primary py-4"
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          onPress={handleJoin}
          disabled={joinMutation.isPending}
        >
          <Text className="text-base font-semibold text-surface">
            {joinMutation.isPending ? "Joining..." : "Join Workshop"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function DetailIcon({ type }: { type: string }) {
  const symbols: Record<string, string> = {
    clock: "⏱",
    people: "👥",
    price: "💲",
  };
  return <Text style={{ fontSize: 16 }}>{symbols[type] ?? "·"}</Text>;
}

function DetailRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: string;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center py-4 ${
        last ? "" : "border-b border-subtle"
      }`}
    >
      <DetailIcon type={icon} />
      <Text className="ml-3 flex-1 text-sm text-ink-faint">{label}</Text>
      <Text className="text-sm font-semibold text-ink">{value}</Text>
    </View>
  );
}
