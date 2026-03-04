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
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useCreateWorkshop } from "@/hooks/useCreateWorkshop";
import { useAuthStore } from "@/store/auth";
import { colors } from "@/theme/tokens";

export default function CreateWorkshopScreen() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <View style={[s.centered, { backgroundColor: colors.canvas }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.line} />
        <Text style={s.lockedText}>Only trainers can create workshops</Text>
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
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <LinearGradient
        colors={[colors.canvas, colors.canvasDeep]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header — outside scroll */}
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [s.backButton, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
          <Text style={s.pageTitle}>New Workshop</Text>
        </View>

        {/* Form fields — scrollable only if keyboard pushes them */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FormField
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Morning Yoga Flow"
          />
          <FormField
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="What will participants experience?"
            multiline
          />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <FormField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Time" value={time} onChangeText={setTime} placeholder="HH:MM" />
            </View>
          </View>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <FormField label="Duration (min)" value={duration} onChangeText={setDuration} placeholder="60" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Price ($)" value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" />
            </View>
          </View>
          <FormField
            label="Max participants"
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            placeholder="20"
            keyboardType="numeric"
          />
        </ScrollView>

        {/* Submit — always visible, outside scroll */}
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <Pressable
            onPress={handleSubmit}
            disabled={isPending}
            accessibilityRole="button"
            accessibilityLabel={isPending ? "Creating workshop" : "Create workshop"}
            style={({ pressed }) => [
              s.submitButton,
              {
                opacity: isPending ? 0.55 : 1,
                transform: [{ scale: pressed && !isPending ? 0.97 : 1 }],
              },
            ]}
          >
            {isPending ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <View style={s.submitInner}>
                <Ionicons name="add-circle-outline" size={18} color={colors.surface} />
                <Text style={s.submitText}>Create Workshop</Text>
              </View>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  const [focused, setFocused] = useState(false);

  return (
    <View style={s.fieldContainer}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        keyboardType={keyboardType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          s.fieldInput,
          focused && s.fieldInputFocused,
          multiline && { minHeight: 100, textAlignVertical: "top" as const },
        ]}
        placeholderTextColor="#8C8A82"
      />
    </View>
  );
}

const s = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  lockedText: {
    fontSize: 15,
    fontWeight: "400",
    color: "#8C8A82",
    marginTop: 16,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 4,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -4,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "300",
    letterSpacing: 0.4,
    color: "#2E2E2B",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.8,
    color: "#8C8A82",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  fieldInput: {
    backgroundColor: "#FAF8F4",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#2E2E2B",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  fieldInputFocused: {
    borderColor: "#8A9A7E",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#EDE9E2",
    backgroundColor: "transparent",
  },
  submitButton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: "#566B52",
    alignItems: "center",
    justifyContent: "center",
  },
  submitInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.5,
    color: "#FAF8F4",
  },
});
