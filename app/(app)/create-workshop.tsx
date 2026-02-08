import { useState } from "react";
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
import { useRouter } from "expo-router";

import { useCreateWorkshop } from "@/hooks/useCreateWorkshop";
import { useAuthStore } from "@/store/auth";

export default function CreateWorkshopScreen() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { mutate, isPending } = useCreateWorkshop();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");

  if (user?.role !== "trainer") {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <Text className="text-base text-muted">
          Only trainers can create workshops
        </Text>
      </View>
    );
  }

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

    const startTime = new Date(`${date}T${time}`);
    if (isNaN(startTime.getTime())) {
      showAlert("Invalid date/time format. Use YYYY-MM-DD and HH:MM");
      return;
    }

    mutate(
      {
        title: title.trim(),
        description: description.trim(),
        start_time: startTime.toISOString(),
        duration_minutes: Number(duration),
        price: price.trim() || "0.00",
        max_participants: Number(maxParticipants),
      },
      {
        onSuccess: () => router.back(),
        onError: () => showAlert("Failed to create workshop"),
      },
    );
  };

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

      <SectionLabel>Schedule</SectionLabel>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormField
            label="Date"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
          />
        </View>
        <View className="flex-1">
          <FormField
            label="Time"
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

      <SectionLabel>Details</SectionLabel>
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
        className="mt-8 items-center rounded-2xl bg-primary py-4"
      >
        {isPending ? (
          <ActivityIndicator color="#FAFAF7" />
        ) : (
          <Text className="text-base font-medium tracking-wide text-surface">
            Create Workshop
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <View className="mb-4 mt-2 flex-row items-center">
      <View className="mr-2 h-1.5 w-1.5 rounded-full bg-primary" />
      <Text className="text-xs font-medium uppercase tracking-widest text-ink-faint">
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
      <Text className="mb-1.5 text-xs font-medium tracking-wider text-ink-faint">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        keyboardType={keyboardType}
        className="rounded-xl border border-subtle bg-surface px-4 py-3.5 text-base text-ink"
        style={multiline ? { minHeight: 100, textAlignVertical: "top" } : undefined}
        placeholderTextColor="#B0AEA6"
      />
    </View>
  );
}
