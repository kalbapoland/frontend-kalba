import { useEffect, useState } from "react";
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
import { useTranslation } from "react-i18next";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { HashtagTextInput } from "@/components/HashtagTextInput";
import { useWorkshopDetail } from "@/hooks/useWorkshopDetail";
import { useUpdateWorkshop } from "@/hooks/useUpdateWorkshop";
import { successFeedback } from "@/lib/haptics";
import { colors, fonts } from "@/theme/tokens";
import {
  getDeviceTimezone,
  localTimeToUTC,
  toLocalDateInput,
  toLocalTimeInput,
} from "@/lib/workshopSchedule";

type PickerMode = "date" | "time" | null;

const EDIT_WORKSHOP_TEST_IDS = {
  titleInput: "workshop.edit.title.input",
  dateButton: "workshop.edit.date.button",
  timeButton: "workshop.edit.time.button",
  durationInput: "workshop.edit.duration.input",
  priceInput: "workshop.edit.price.input",
  maxParticipantsInput: "workshop.edit.max-participants.input",
  submitButton: "workshop.edit.submit.button",
} as const;

export default function EditWorkshopScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workshop, isLoading } = useWorkshopDetail(id!);
  const { mutate, isPending } = useUpdateWorkshop(id!);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState(getDeviceTimezone);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const isNativePickerSupported = Platform.OS === "ios" || Platform.OS === "android";

  useEffect(() => {
    if (!workshop) return;
    setTitle(workshop.title);
    setDescription(workshop.description);
    const tz = workshop.timezone || getDeviceTimezone();
    setTimezone(tz);
    setDate(toLocalDateInput(workshop.start_time, tz));
    setTime(toLocalTimeInput(workshop.start_time, tz));
    setDuration(String(workshop.duration_minutes));
    setPrice(String(Number(workshop.price) || ""));
    setMaxParticipants(String(workshop.max_participants));
  }, [workshop]);

  const showAlert = (msg: string) => {
    if (Platform.OS === "web") {
      window.alert(msg);
    } else {
      Alert.alert(t("errors.title"), msg);
    }
  };

  const resolvePickerDate = () => {
    const [year, month, day] = date.split("-").map((value) => Number(value));
    const [hours, minutes] = time.split(":").map((value) => Number(value));

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day) ||
      !Number.isFinite(hours) ||
      !Number.isFinite(minutes)
    ) {
      return new Date();
    }

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  };

  const resolveCurrentSchedule = () => {
    return resolvePickerDate();
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

    if (pickerMode === "date") {
      const y = selected.getFullYear();
      const m = String(selected.getMonth() + 1).padStart(2, "0");
      const d = String(selected.getDate()).padStart(2, "0");
      setDate(`${y}-${m}-${d}`);
    } else {
      const h = String(selected.getHours()).padStart(2, "0");
      const min = String(selected.getMinutes()).padStart(2, "0");
      setTime(`${h}:${min}`);
    }

    if (Platform.OS === "android") {
      setPickerMode(null);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      showAlert(t("workshop.title_required"));
      return;
    }
    if (!date.trim() || !time.trim()) {
      showAlert(t("workshop.date_time_required"));
      return;
    }
    if (!duration.trim() || isNaN(Number(duration)) || Number(duration) < 1) {
      showAlert(t("workshop.duration_required"));
      return;
    }
    if (
      !maxParticipants.trim() ||
      isNaN(Number(maxParticipants)) ||
      Number(maxParticipants) < 1
    ) {
      showAlert(t("workshop.max_participants_required"));
      return;
    }

    const parsedSchedule = localTimeToUTC(date, time, timezone);
    if (!parsedSchedule.ok) {
      showAlert(parsedSchedule.error);
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
      },
      {
        onSuccess: () => {
          successFeedback();
          router.back();
        },
        onError: () => showAlert(t("workshop.update_failed")),
      },
    );
  };

  if (isLoading) {
    return (
      <View style={[s.centered, { backgroundColor: colors.canvas }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!workshop) {
    return (
      <View style={[s.centered, { backgroundColor: colors.canvas }]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.line} />
        <Text style={s.notFoundText}>{t("workshop_not_found")}</Text>
      </View>
    );
  }

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
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t("workshop.go_back")}
            style={({ pressed }) => [s.backButton, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
          <Text style={s.pageTitle}>{t("workshop.edit_title")}</Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FormField
            label={t("group.field_title")}
            value={title}
            onChangeText={setTitle}
            placeholder={t("workshop.title_placeholder")}
            testID={EDIT_WORKSHOP_TEST_IDS.titleInput}
          />

          <View style={s.fieldContainer}>
            <Text style={s.fieldLabel}>{t("group.field_description")}</Text>
            <HashtagTextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t("workshop.description_placeholder")}
            />
          </View>

          <View style={s.fieldContainer}>
            <Text style={s.fieldLabel}>{t("workshop.schedule_label", { timezone })}</Text>
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
                    accessibilityLabel={t("workshop.pick_date")}
                    testID={EDIT_WORKSHOP_TEST_IDS.dateButton}
                    style={({ pressed }) => [s.scheduleButton, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Ionicons name="calendar" size={16} color={colors.primary} />
                    <Text style={s.scheduleButtonText}>{t("workshop.pick_date")}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPickerMode("time")}
                    accessibilityRole="button"
                    accessibilityLabel={t("workshop.pick_time")}
                    testID={EDIT_WORKSHOP_TEST_IDS.timeButton}
                    style={({ pressed }) => [s.scheduleButton, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Ionicons name="time" size={16} color={colors.primary} />
                    <Text style={s.scheduleButtonText}>{t("workshop.pick_time")}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label={t("workshop.date")}
                      value={date}
                      onChangeText={setDate}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label={t("workshop.time")}
                      value={time}
                      onChangeText={setTime}
                      placeholder="HH:MM"
                    />
                  </View>
                </View>
              )}

              <Text style={s.scheduleHint}>
                {t("workshop.schedule_hint", { timezone })}
              </Text>
            </View>
          </View>

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <FormField
                label={t("workshop.duration_minutes")}
                value={duration}
                onChangeText={setDuration}
                placeholder="60"
                keyboardType="numeric"
                testID={EDIT_WORKSHOP_TEST_IDS.durationInput}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormField
                label={t("workshop.price_dollar")}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                keyboardType="decimal-pad"
                testID={EDIT_WORKSHOP_TEST_IDS.priceInput}
              />
            </View>
          </View>

          <FormField
            label={t("workshop.max_participants")}
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            placeholder="20"
            keyboardType="numeric"
            testID={EDIT_WORKSHOP_TEST_IDS.maxParticipantsInput}
          />
        </ScrollView>

        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <Pressable
            onPress={handleSubmit}
            disabled={isPending}
            accessibilityRole="button"
            accessibilityLabel={
              isPending ? t("workshop.saving") : t("workshop.save_changes_a11y")
            }
            testID={EDIT_WORKSHOP_TEST_IDS.submitButton}
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
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.surface} />
                <Text style={s.submitText}>{t("group.save_changes")}</Text>
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
                  {pickerMode === "date"
                    ? t("workshop.choose_date")
                    : t("workshop.choose_time")}
                </Text>
                <Pressable
                  onPress={() => setPickerMode(null)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    pickerMode === "date"
                      ? t("workshop.close_date_picker")
                      : t("workshop.close_time_picker")
                  }
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Text style={s.pickerDoneText}>{t("workshop.done")}</Text>
                </Pressable>
              </View>

              <DateTimePicker
                value={resolveCurrentSchedule()}
                mode={pickerMode}
                display="spinner"
                is24Hour
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
  notFoundText: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.inkBody,
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
    borderColor: colors.lineWhisper,
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
