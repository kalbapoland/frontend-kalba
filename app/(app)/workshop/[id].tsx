import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
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
        if (Platform.OS === "web") {
          window.alert(msg);
        } else {
          Alert.alert("Unable to Join", msg);
        }
      },
    });
  };

  const handleDelete = () => {
    const doDelete = () => {
      deleteMutation.mutate(id!, {
        onSuccess: () => router.back(),
        onError: () => {
          if (Platform.OS === "web") {
            window.alert("Failed to delete workshop");
          } else {
            Alert.alert("Error", "Failed to delete workshop");
          }
        },
      });
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Are you sure you want to delete this workshop? This cannot be undone.",
        )
      ) {
        doDelete();
      }
    } else {
      Alert.alert(
        "Delete Workshop",
        "Are you sure you want to delete this workshop? This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete },
        ],
      );
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator size="large" color="#5E6B5A" />
      </View>
    );
  }

  if (!workshop) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <Ionicons name="alert-circle-outline" size={40} color="#C5C3BC" />
        <Text className="mt-4 text-lg font-light text-ink-light">
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
          <Text className="text-2xl font-light tracking-wide text-ink">
            {workshop.title}
          </Text>
          <View className="mt-3 flex-row items-center">
            <Ionicons name="calendar-outline" size={15} color="#6B6B66" />
            <Text className="ml-2 text-base text-ink-light">
              {weekday}, {monthDay}
            </Text>
            <Text className="mx-2 text-ink-faint">·</Text>
            <Ionicons name="time-outline" size={15} color="#6B6B66" />
            <Text className="ml-1.5 text-base text-ink-light">{time}</Text>
          </View>
        </View>

        {/* Description (no section label) */}
        {workshop.description ? (
          <View className="mt-6 px-6 pb-6">
            <Text className="text-base leading-7 text-ink-light">
              {workshop.description}
            </Text>
          </View>
        ) : null}

        {/* Details */}
        <View className="px-6 pb-6">
          <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-faint">
            Details
          </Text>
          <View className="rounded-2xl bg-surface px-5">
            <DetailRow
              icon="time-outline"
              label="Duration"
              value={`${workshop.duration_minutes} min`}
            />
            <DetailRow
              icon="people-outline"
              label="Spots"
              value={`${workshop.max_participants} max`}
            />
            <DetailRow
              icon="pricetag-outline"
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
                className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-surface py-3.5"
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/workshop/edit",
                    params: { id: id! },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="Edit workshop"
              >
                <Ionicons name="create-outline" size={16} color="#5E6B5A" />
                <Text className="text-sm font-semibold text-primary">Edit</Text>
              </Pressable>
              <Pressable
                className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-surface py-3.5"
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                onPress={handleDelete}
                disabled={deleteMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel="Delete workshop"
              >
                <Ionicons name="trash-outline" size={16} color="#C4836E" />
                <Text className="text-sm font-semibold text-danger">
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Join Button */}
      <View
        className="border-t border-subtle bg-canvas px-6 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Pressable
          className="flex-row items-center justify-center gap-2 rounded-full bg-primary py-4"
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          onPress={handleJoin}
          disabled={joinMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Join workshop"
        >
          {joinMutation.isPending ? (
            <ActivityIndicator color="#FAF9F6" />
          ) : (
            <>
              <Ionicons name="videocam" size={18} color="#FAF9F6" />
              <Text className="text-base font-semibold text-surface">
                Join Workshop
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
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
      <Ionicons name={icon} size={18} color="#9A9590" />
      <Text className="ml-3 flex-1 text-sm text-ink-light">{label}</Text>
      <Text className="text-sm font-semibold text-ink">{value}</Text>
    </View>
  );
}
