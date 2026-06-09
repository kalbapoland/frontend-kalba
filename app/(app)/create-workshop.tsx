import { useState } from "react";
import {
  Modal,
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { HashtagTextInput } from "@/components/HashtagTextInput";
import { useCreateWorkshop } from "@/hooks/useCreateWorkshop";
import { useGroup } from "@/hooks/useGroups";
import { useAuthStore } from "@/store/auth";
import {
  getDeviceTimezone,
  localTimeToUTC,
  MIN_WORKSHOP_OFFSET_MS,
  toLocalDateInput,
  toLocalTimeInput,
} from "@/lib/workshopSchedule";
import { colors } from "@/theme/tokens";

type PickerMode = "date" | "time" | null;

// Smoke flows can take a long time on CI/emulator; keep the default workshop
// start time far enough in the future to avoid timing flakiness.
const DEV_DEFAULT_WORKSHOP_OFFSET_MS = 6 * 60 * 60 * 1000;
// NOTE: This is intentionally production-bundled config used by automated
// smoke tests. Smoke runs use release builds, so test-only schedule behavior
// must be configurable from runtime env available in production code.
const SMOKE_OFFSET_MINUTES_RAW = Number(process.env.EXPO_PUBLIC_SMOKE_WORKSHOP_OFFSET_MINUTES ?? "");
const SMOKE_WORKSHOP_OFFSET_MS =
  Number.isFinite(SMOKE_OFFSET_MINUTES_RAW) && SMOKE_OFFSET_MINUTES_RAW > 0
    ? Math.trunc(SMOKE_OFFSET_MINUTES_RAW * 60 * 1000)
    : null;

const CREATE_WORKSHOP_TEST_IDS = {
  titleInput: "workshop.create.title.input",
  descriptionInput: "workshop.create.description.input",
  dateButton: "workshop.create.date.button",
  timeButton: "workshop.create.time.button",
  durationInput: "workshop.create.duration.input",
  priceInput: "workshop.create.price.input",
  maxParticipantsInput: "workshop.create.max-participants.input",
  submitButton: "workshop.create.submit.button",
} as const;

export default function CreateWorkshopScreen() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const group = useGroup(groupId ?? "");
  const { mutate, isPending } = useCreateWorkshop();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // Production code path used by tests: smoke can override schedule window
  // while normal users keep default app behavior.
  // Default to now + smoke offset (if configured) or app minimum offset.
  const [timezone] = useState(getDeviceTimezone);
  const minimumOffsetMs = SMOKE_WORKSHOP_OFFSET_MS ?? MIN_WORKSHOP_OFFSET_MS;
  const defaultOffsetMs = SMOKE_WORKSHOP_OFFSET_MS
    ?? (__DEV__ ? Math.max(MIN_WORKSHOP_OFFSET_MS, DEV_DEFAULT_WORKSHOP_OFFSET_MS) : MIN_WORKSHOP_OFFSET_MS);
  const defaultIso = new Date(Date.now() + defaultOffsetMs).toISOString();
  const [date, setDate] = useState(() => toLocalDateInput(defaultIso, getDeviceTimezone()));
  const [time, setTime] = useState(() => toLocalTimeInput(defaultIso, getDeviceTimezone()));
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const isNativePickerSupported = Platform.OS === "ios" || Platform.OS === "android";

  if (user?.role !== "trainer") {
    return (
      <View style={[s.centered, { backgroundColor: colors.canvas }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.line} />
        <Text style={s.lockedText}>Only trainers can create workshops</Text>
      </View>
    );
  }

  if (!groupId) {
    return (
      <View style={[s.centered, { backgroundColor: colors.canvas }]}>
        <Ionicons name="people-outline" size={48} color={colors.line} />
        <Text style={s.lockedText}>
          Open a group you own and tap “Create workshop” to add one.
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

  const resolveCurrentSchedule = () => {
    const parsed = localTimeToUTC(date, time, timezone);
    if (parsed.ok) {
      return parsed.value;
    }
    return new Date();
  };

  const onChangeSchedule = (
    _event: DateTimePickerEvent,
    selected?: Date,
  ) => {
    if (!selected || !pickerMode) {
      if (Platform.OS === "android") {
        setPickerMode(null);
      }
      return;
    }

    // Clamp to minimum allowed time. On Android the time picker
    // does not enforce minimumDate in the UI, so we enforce it here.
    const minAllowed = new Date(Date.now() + minimumOffsetMs);
    const effective = selected < minAllowed ? minAllowed : selected;

    if (pickerMode === "date") {
      const y = effective.getFullYear();
      const m = String(effective.getMonth() + 1).padStart(2, "0");
      const d = String(effective.getDate()).padStart(2, "0");
      setDate(`${y}-${m}-${d}`);
    } else {
      const h = String(effective.getHours()).padStart(2, "0");
      const min = String(effective.getMinutes()).padStart(2, "0");
      setTime(`${h}:${min}`);
    }

    if (Platform.OS === "android") {
      setPickerMode(null);
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

    const parsedSchedule = localTimeToUTC(date, time, timezone);
    if (!parsedSchedule.ok) {
      showAlert(parsedSchedule.error);
      return;
    }

    if (parsedSchedule.value <= new Date(Date.now() + minimumOffsetMs)) {
      showAlert(__DEV__
        ? "Start time must be at least 1 minute in the future."
        : "Start time must be in the future. Please choose a later date or time.");
      return;
    }

    mutate(
      {
        title: title.trim(),
        description: description.trim(),
        start_time: parsedSchedule.value.toISOString(),
        timezone,
        duration_minutes: Number(duration),
        price: price.trim() || "0.00",
        max_participants: Number(maxParticipants),
        group_id: groupId,
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
            testID={CREATE_WORKSHOP_TEST_IDS.titleInput}
          />
          <View style={s.fieldContainer}>
            <Text style={s.fieldLabel}>Description (optional)</Text>
            <HashtagTextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What will participants experience? Use #hashtags (up to 5)."
              testID={CREATE_WORKSHOP_TEST_IDS.descriptionInput}
            />
          </View>
          <View style={s.fieldContainer}>
            <Text style={s.fieldLabel}>Group</Text>
            <View style={s.groupBanner}>
              <Ionicons name="people" size={16} color={colors.primary} />
              <Text style={s.groupBannerText} numberOfLines={1}>
                {group.data?.title ?? "This group"}
              </Text>
            </View>
          </View>
          <View style={s.fieldContainer}>
            <Text style={s.fieldLabel}>Schedule ({timezone})</Text>
            <View style={s.scheduleCard}>
              <View style={s.schedulePreviewRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.inkMuted} />
                <Text style={s.schedulePreviewText}>{date}</Text>
                <Text style={s.scheduleDot}>·</Text>
                <Ionicons name="time-outline" size={16} color={colors.inkMuted} />
                <Text style={s.schedulePreviewText}>{time}</Text>
              </View>

              {isNativePickerSupported ? (
                <View style={s.scheduleButtonRow}>
                  <Pressable
                    onPress={() => setPickerMode("date")}
                    accessibilityRole="button"
                    accessibilityLabel="Pick workshop date"
                    testID={CREATE_WORKSHOP_TEST_IDS.dateButton}
                    style={({ pressed }) => [
                      s.scheduleButton,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Ionicons name="calendar" size={16} color={colors.primary} />
                    <Text style={s.scheduleButtonText}>Pick Date</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPickerMode("time")}
                    accessibilityRole="button"
                    accessibilityLabel="Pick workshop time"
                    testID={CREATE_WORKSHOP_TEST_IDS.timeButton}
                    style={({ pressed }) => [
                      s.scheduleButton,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Ionicons name="time" size={16} color={colors.primary} />
                    <Text style={s.scheduleButtonText}>Pick Time</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Date"
                      value={date}
                      onChangeText={setDate}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Time"
                      value={time}
                      onChangeText={setTime}
                      placeholder="HH:MM"
                    />
                  </View>
                </View>
              )}

              <Text style={s.scheduleHint}>
                Time is in your local timezone ({timezone}). Participants see it in their own timezone.
              </Text>
            </View>
          </View>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <FormField label="Duration (min)" value={duration} onChangeText={setDuration} placeholder="60" keyboardType="numeric" testID={CREATE_WORKSHOP_TEST_IDS.durationInput} />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Price ($)" value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" testID={CREATE_WORKSHOP_TEST_IDS.priceInput} />
            </View>
          </View>
          <FormField
            label="Max participants"
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            placeholder="20"
            keyboardType="numeric"
            testID={CREATE_WORKSHOP_TEST_IDS.maxParticipantsInput}
          />
        </ScrollView>

        {/* Submit — always visible, outside scroll */}
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <Pressable
            onPress={handleSubmit}
            disabled={isPending}
            accessibilityRole="button"
            accessibilityLabel={isPending ? "Creating workshop" : "Create workshop"}
            testID={CREATE_WORKSHOP_TEST_IDS.submitButton}
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

      {pickerMode && Platform.OS === "android" ? (
        <DateTimePicker
          value={resolveCurrentSchedule()}
          mode={pickerMode}
          is24Hour
          minimumDate={new Date(Date.now() + minimumOffsetMs)}
          onChange={onChangeSchedule}
        />
      ) : null}

      {pickerMode && Platform.OS === "ios" ? (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setPickerMode(null)}
        >
          <View style={s.pickerSheetBackdrop}>
            <View style={s.pickerSheet}>
              <View style={s.pickerSheetHeader}>
                <Text style={s.pickerSheetTitle}>
                  {pickerMode === "date" ? "Choose Date" : "Choose Time"}
                </Text>
                <Pressable
                  onPress={() => setPickerMode(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Close date picker"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Text style={s.pickerDoneText}>Done</Text>
                </Pressable>
              </View>

              <DateTimePicker
                value={resolveCurrentSchedule()}
                mode={pickerMode}
                display="spinner"
                is24Hour
                minimumDate={new Date(Date.now() + minimumOffsetMs)}
                onChange={onChangeSchedule}
              />
            </View>
          </View>
        </Modal>
      ) : null}
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
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  testID?: string;
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
        testID={testID}
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
  scheduleCard: {
    backgroundColor: "#FAF8F4",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E8E3DA",
    padding: 14,
    gap: 10,
  },
  schedulePreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  schedulePreviewText: {
    fontSize: 14,
    color: "#2E2E2B",
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  scheduleDot: {
    color: "#CFC8BD",
    fontSize: 13,
  },
  scheduleButtonRow: {
    flexDirection: "row",
    gap: 10,
  },
  scheduleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F1EEE8",
    borderRadius: 999,
    paddingVertical: 10,
  },
  scheduleButtonText: {
    fontSize: 13,
    color: "#566B52",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  scheduleHint: {
    fontSize: 12,
    color: "#8C8A82",
    lineHeight: 16,
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
  groupBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8EDE5",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  groupBannerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#566B52",
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
  pickerSheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  pickerSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    overflow: "hidden",
  },
  pickerSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  pickerSheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E2E2B",
  },
  pickerDoneText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#566B52",
  },
});
