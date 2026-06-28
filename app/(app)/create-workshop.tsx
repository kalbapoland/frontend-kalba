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
import { useTranslation } from "react-i18next";
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
import { successFeedback } from "@/lib/haptics";
import { colors, fonts } from "@/theme/tokens";

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
  const { t } = useTranslation();
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
  // Smoke offset controls the *default* start time only — not the validation
  // threshold. Validation always uses MIN_WORKSHOP_OFFSET_MS (1h in release)
  // so 24h smoke default easily clears the bar even after slow form filling.
  const minimumOffsetMs = MIN_WORKSHOP_OFFSET_MS;
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
        <Text style={s.lockedText}>{t("create_workshop.only_trainers")}</Text>
      </View>
    );
  }

  if (!groupId) {
    return (
      <View style={[s.centered, { backgroundColor: colors.canvas }]}>
        <Ionicons name="people-outline" size={48} color={colors.line} />
        <Text style={s.lockedText}>
          {t("create_workshop.no_group_hint")}
        </Text>
      </View>
    );
  }

  const showAlert = (msg: string) => {
    if (Platform.OS === "web") {
      window.alert(msg);
    } else {
      Alert.alert(t("errors.title"), msg);
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
      showAlert(t("create_workshop.err_title_required"));
      return;
    }
    if (!date.trim() || !time.trim()) {
      showAlert(t("create_workshop.err_datetime_required"));
      return;
    }
    if (!duration.trim() || isNaN(Number(duration)) || Number(duration) < 1) {
      showAlert(t("create_workshop.err_duration_min"));
      return;
    }
    if (
      !maxParticipants.trim() ||
      isNaN(Number(maxParticipants)) ||
      Number(maxParticipants) < 1
    ) {
      showAlert(t("create_workshop.err_max_participants_min"));
      return;
    }

    const parsedSchedule = localTimeToUTC(date, time, timezone);
    if (!parsedSchedule.ok) {
      showAlert(parsedSchedule.error);
      return;
    }

    const nowMs = Date.now();
    const workshopMs = parsedSchedule.value.getTime();
    if (__DEV__) {
      const diffMin = ((workshopMs - nowMs) / 60_000).toFixed(1);
      const minRequired = (minimumOffsetMs / 60_000).toFixed(1);
      console.log(
        `[create-workshop] now=${new Date(nowMs).toISOString()} workshop=${parsedSchedule.value.toISOString()} diff=${diffMin}min required>=${minRequired}min`,
      );
    }
    if (parsedSchedule.value <= new Date(nowMs + minimumOffsetMs)) {
      showAlert(__DEV__
        ? t("create_workshop.err_future_dev")
        : t("create_workshop.err_future"));
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
        onSuccess: () => {
          successFeedback();
          router.back();
        },
        onError: () => showAlert(t("create_workshop.err_create_failed")),
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
            accessibilityLabel={t("create_workshop.a11y_back")}
            style={({ pressed }) => [s.backButton, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
          <Text style={s.pageTitle}>{t("create_workshop.title")}</Text>
        </View>

        {/* Form fields — scrollable only if keyboard pushes them */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FormField
            label={t("create_workshop.field_title")}
            value={title}
            onChangeText={setTitle}
            placeholder={t("create_workshop.title_placeholder")}
            testID={CREATE_WORKSHOP_TEST_IDS.titleInput}
          />
          <View style={s.fieldContainer}>
            <Text style={s.fieldLabel}>{t("create_workshop.field_description")}</Text>
            <HashtagTextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t("create_workshop.description_placeholder")}
              testID={CREATE_WORKSHOP_TEST_IDS.descriptionInput}
            />
          </View>
          <View style={s.fieldContainer}>
            <Text style={s.fieldLabel}>{t("create_workshop.field_group")}</Text>
            <View style={s.groupBanner}>
              <Ionicons name="people" size={16} color={colors.primary} />
              <Text style={s.groupBannerText} numberOfLines={1}>
                {group.data?.title ?? t("create_workshop.this_group")}
              </Text>
            </View>
          </View>
          <View style={s.fieldContainer}>
            <Text style={s.fieldLabel}>{t("create_workshop.schedule_label", { timezone })}</Text>
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
                    accessibilityLabel={t("create_workshop.a11y_pick_date")}
                    testID={CREATE_WORKSHOP_TEST_IDS.dateButton}
                    style={({ pressed }) => [
                      s.scheduleButton,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Ionicons name="calendar" size={16} color={colors.primary} />
                    <Text style={s.scheduleButtonText}>{t("create_workshop.pick_date")}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPickerMode("time")}
                    accessibilityRole="button"
                    accessibilityLabel={t("create_workshop.a11y_pick_time")}
                    testID={CREATE_WORKSHOP_TEST_IDS.timeButton}
                    style={({ pressed }) => [
                      s.scheduleButton,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Ionicons name="time" size={16} color={colors.primary} />
                    <Text style={s.scheduleButtonText}>{t("create_workshop.pick_time")}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label={t("create_workshop.field_date")}
                      value={date}
                      onChangeText={setDate}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label={t("create_workshop.field_time")}
                      value={time}
                      onChangeText={setTime}
                      placeholder="HH:MM"
                    />
                  </View>
                </View>
              )}

              <Text style={s.scheduleHint}>
                {t("create_workshop.schedule_hint", { timezone })}
              </Text>
            </View>
          </View>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <FormField label={t("create_workshop.field_duration")} value={duration} onChangeText={setDuration} placeholder="60" keyboardType="numeric" testID={CREATE_WORKSHOP_TEST_IDS.durationInput} />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label={t("create_workshop.field_price")} value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" testID={CREATE_WORKSHOP_TEST_IDS.priceInput} />
            </View>
          </View>
          <FormField
            label={t("create_workshop.field_max_participants")}
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
            accessibilityLabel={isPending ? t("create_workshop.a11y_creating") : t("create_workshop.a11y_create")}
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
                <Text style={s.submitText}>{t("create_workshop.submit")}</Text>
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
                  {pickerMode === "date" ? t("create_workshop.choose_date") : t("create_workshop.choose_time")}
                </Text>
                <Pressable
                  onPress={() => setPickerMode(null)}
                  accessibilityRole="button"
                  accessibilityLabel={t("create_workshop.a11y_close_picker")}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Text style={s.pickerDoneText}>{t("create_workshop.done")}</Text>
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
        placeholderTextColor={colors.inkMuted}
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
    fontFamily: fonts.body,
    color: colors.inkMuted,
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
    fontFamily: fonts.display,
    letterSpacing: 0.4,
    color: colors.ink,
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
    fontFamily: fonts.bodyMedium,
    letterSpacing: 0.8,
    color: colors.inkMuted,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  scheduleCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
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
    color: colors.ink,
    fontFamily: fonts.bodyMedium,
    letterSpacing: 0.2,
  },
  scheduleDot: {
    color: colors.line,
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
    backgroundColor: colors.canvasDeep,
    borderRadius: 999,
    paddingVertical: 10,
  },
  scheduleButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.3,
  },
  scheduleHint: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 16,
  },
  fieldInput: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  fieldInputFocused: {
    borderColor: colors.primarySoft,
  },
  groupBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryWash,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  groupBannerText: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineWhisper,
    backgroundColor: "transparent",
  },
  submitButton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.primary,
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
    fontFamily: fonts.bodyMedium,
    letterSpacing: 0.5,
    color: colors.surface,
  },
  pickerSheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  pickerSheet: {
    backgroundColor: colors.elevated,
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
    fontFamily: fonts.bodySemiBold,
    color: colors.ink,
  },
  pickerDoneText: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
});
