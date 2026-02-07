import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { useWorkshopDetail } from "@/hooks/useWorkshopDetail";

export default function WorkshopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workshop, isLoading } = useWorkshopDetail(id!);

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

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ padding: 28, paddingBottom: 48 }}
    >
      <Text className="text-3xl font-light tracking-wide text-ink">
        {workshop.title}
      </Text>

      {workshop.description ? (
        <Text className="mt-6 text-base leading-7 text-ink-light">
          {workshop.description}
        </Text>
      ) : null}

      <View className="mt-10 rounded-2xl bg-surface px-6 py-1">
        <DetailRow
          label="Date"
          value={date.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        />
        <DetailRow
          label="Time"
          value={date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        />
        <DetailRow label="Duration" value={`${workshop.duration_minutes} min`} />
        <DetailRow
          label="Price"
          value={Number(workshop.price) > 0 ? `$${workshop.price}` : "Free"}
        />
        <DetailRow
          label="Spots"
          value={`${workshop.max_participants} max`}
          last
        />
      </View>
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-5 ${
        last ? "" : "border-b border-subtle"
      }`}
    >
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-sm font-medium text-ink">{value}</Text>
    </View>
  );
}
