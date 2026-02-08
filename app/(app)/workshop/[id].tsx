import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWorkshopDetail } from "@/hooks/useWorkshopDetail";

function formatPrice(price: string | number): string {
  const n = Number(price);
  if (n === 0) return "Free";
  return `$${n % 1 === 0 ? n : n.toFixed(2)}`;
}

export default function WorkshopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workshop, isLoading } = useWorkshopDetail(id!);
  const insets = useSafeAreaInsets();

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

  const date = new Date(workshop.start_time);
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
  const monthDay = date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

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
      </ScrollView>

      {/* Sticky CTA */}
      <View
        className="border-t border-subtle bg-canvas px-6 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Pressable
          className="items-center rounded-2xl bg-primary py-4"
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        >
          <Text className="text-base font-semibold text-surface">
            Join Workshop
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
