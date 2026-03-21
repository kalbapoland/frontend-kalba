import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useWorkshopDetail } from "@/hooks/useWorkshopDetail";
import { useUpdateWorkshop } from "@/hooks/useUpdateWorkshop";
import {
  parseWorkshopSchedule,
  toUtcDateInput,
  toUtcTimeInput,
} from "@/lib/workshopSchedule";

export default function EditWorkshopScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workshop, isLoading } = useWorkshopDetail(id!);
  const { mutate, isPending } = useUpdateWorkshop(id!);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");

  useEffect(() => {
    if (!workshop) return;
    setTitle(workshop.title);
    setDescription(workshop.description);
    setDate(toUtcDateInput(workshop.start_time));
    setTime(toUtcTimeInput(workshop.start_time));
    setDuration(String(workshop.duration_minutes));
    setPrice(String(Number(workshop.price) || ""));
    setMaxParticipants(String(workshop.max_participants));
  }, [workshop]);

  const showAlert = (msg: string) => {
    if (Platform.OS === "web") {
      window.alert(msg);
    } else {
      Alert.alert("Error", msg);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      showAlert("Title is required");
      return;
    }
    if (!date.trim() || !time.trim()) {
      showAlert("Date and time are required");
      return;
    }
    if (!duration.trim() || isNaN(Number(duration)) || Number(duration) < 1) {
      showAlert("Duration must be at least 1 minute");
      return;
    }
    if (
      !maxParticipants.trim() ||
      isNaN(Number(maxParticipants)) ||
      Number(maxParticipants) < 1
    ) {
      showAlert("Max participants must be at least 1");
      return;
    }

    const parsedSchedule = parseWorkshopSchedule(date, time);
    if (!parsedSchedule.ok) {
      showAlert(parsedSchedule.error);
      return;
    }

    mutate(
      {
        title: title.trim(),
        description: description.trim(),
        start_time: parsedSchedule.value.toISOString(),
        duration_minutes: Number(duration),
        price: price.trim() || "0.00",
        max_participants: Number(maxParticipants),
      },
      {
        onSuccess: () => router.back(),
        onError: () => showAlert("Failed to update workshop"),
      },
    );
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

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <FormField
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="Workshop title"
      />
      <FormField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="What will participants experience?"
        multiline
      />

      <SectionLabel icon="calendar-outline">Schedule</SectionLabel>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormField
            label="Date (UTC)"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
          />
        </View>
        <View className="flex-1">
          <FormField
            label="Time (UTC)"
            value={time}
            onChangeText={setTime}
            placeholder="HH:MM"
          />
        </View>
      </View>
      <FormField
        label="Duration (minutes)"
        value={duration}
        onChangeText={setDuration}
        placeholder="60"
        keyboardType="numeric"
      />

      <SectionLabel icon="information-circle-outline">Details</SectionLabel>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormField
            label="Price"
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </View>
        <View className="flex-1">
          <FormField
            label="Max participants"
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            placeholder="20"
            keyboardType="numeric"
          />
        </View>
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={isPending}
        className="mt-8 flex-row items-center justify-center gap-2 rounded-full bg-primary py-4"
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : isPending ? 0.6 : 1 })}
      >
        {isPending ? (
          <ActivityIndicator color="#FAF9F6" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={18} color="#FAF9F6" />
            <Text className="text-base font-medium tracking-wide text-surface">
              Save Changes
            </Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

function SectionLabel({
  children,
  icon,
}: {
  children: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View className="mb-4 mt-2 flex-row items-center gap-2">
      <Ionicons name={icon} size={14} color="#5E6B5A" />
      <Text className="text-xs font-medium uppercase tracking-widest text-ink-light">
        {children}
      </Text>
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "decimal-pad";
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-medium tracking-wider text-ink-light">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        keyboardType={keyboardType}
        className="rounded-2xl bg-surface px-5 py-4 text-base text-ink"
        style={
          multiline
            ? { minHeight: 100, textAlignVertical: "top" }
            : undefined
        }
        placeholderTextColor="#9A9590"
      />
    </View>
  );
}
