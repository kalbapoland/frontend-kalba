import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { useWorkshopDetail } from "@/hooks/useWorkshopDetail";

export default function WorkshopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workshop, isLoading } = useWorkshopDetail(id!);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!workshop) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg text-gray-400">Workshop not found</Text>
      </View>
    );
  }

  const date = new Date(workshop.start_time);

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24 }}>
      <Text className="text-2xl font-bold text-gray-900">
        {workshop.title}
      </Text>

      {workshop.description ? (
        <Text className="mt-4 text-base leading-6 text-gray-600">
          {workshop.description}
        </Text>
      ) : null}

      <View className="mt-6 rounded-xl bg-gray-50 p-4">
        <DetailRow label="Date" value={date.toLocaleDateString()} />
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
          label="Max Participants"
          value={String(workshop.max_participants)}
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
      className={`flex-row items-center justify-between py-3 ${
        last ? "" : "border-b border-gray-200"
      }`}
    >
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="text-sm font-medium text-gray-900">{value}</Text>
    </View>
  );
}
