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
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg text-gray-400">
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
      className="flex-1 bg-white"
      contentContainerStyle={{ padding: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <FormField label="Title" value={title} onChangeText={setTitle} placeholder="Workshop title" />
      <FormField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Optional description"
        multiline
      />
      <FormField
        label="Date"
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
      />
      <FormField
        label="Time"
        value={time}
        onChangeText={setTime}
        placeholder="HH:MM"
      />
      <FormField
        label="Duration (minutes)"
        value={duration}
        onChangeText={setDuration}
        placeholder="60"
        keyboardType="numeric"
      />
      <FormField
        label="Price"
        value={price}
        onChangeText={setPrice}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />
      <FormField
        label="Max Participants"
        value={maxParticipants}
        onChangeText={setMaxParticipants}
        placeholder="20"
        keyboardType="numeric"
      />

      <Pressable
        onPress={handleSubmit}
        disabled={isPending}
        className="mt-6 items-center rounded-xl bg-primary py-4"
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-lg font-semibold text-white">
            Create Workshop
          </Text>
        )}
      </Pressable>
    </ScrollView>
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
      <Text className="mb-1 text-sm font-medium text-gray-700">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        keyboardType={keyboardType}
        className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-base text-gray-900"
        style={multiline ? { minHeight: 80, textAlignVertical: "top" } : undefined}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}
