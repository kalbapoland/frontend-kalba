import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import type { AxiosError } from "axios";

import { DescriptionWithHashtags } from "@/components/DescriptionWithHashtags";
import { useWorkshopDetail } from "@/hooks/useWorkshopDetail";
import { useJoinWorkshop } from "@/hooks/useJoinWorkshop";
import { useDeleteWorkshop } from "@/hooks/useDeleteWorkshop";
import { useEnrollWorkshop, useUnenrollWorkshop } from "@/hooks/useEnrollment";
import { useAuthStore } from "@/store/auth";
import { formatWeekdayLong, formatMonthDayYear, formatTime, formatTimeWithTZ } from "@/lib/date";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { successFeedback } from "@/lib/haptics";
import { colors, fonts } from "@/theme/tokens";

function formatPrice(price: string | number, freeLabel: string): string {
  const n = Number(price);
  if (n === 0) return freeLabel;
  return `$${n % 1 === 0 ? n : n.toFixed(2)}`;
}

export default function WorkshopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workshop, isLoading } = useWorkshopDetail(id!);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const joinMutation = useJoinWorkshop();
  const deleteMutation = useDeleteWorkshop();
  const enrollMutation = useEnrollWorkshop();
  const unenrollMutation = useUnenrollWorkshop();
  const user = useAuthStore((s) => s.user);

  const handleJoin = () => {
    joinMutation.mutate(id!, {
      onSuccess: (data) => {
        router.push({
          pathname: "/(app)/workshop/call",
          params: {
            workshopId: id!,
            token: data.token,
            roomUrl: data.room_url,
            role: data.role,
            rules: JSON.stringify(data.rules),
          },
        });
      },
      onError: (error) => {
        const axiosErr = error as AxiosError<{ detail?: string }>;
        const msg = axiosErr.response?.data?.detail ?? t("errors.could_not_join");
        if (Platform.OS === "web") {
          window.alert(msg);
        } else {
          Alert.alert(t("errors.unable_to_join"), msg);
        }
      },
    });
  };

  const handleDelete = () => {
    const doDelete = () => {
      deleteMutation.mutate(id!, {
        onSuccess: () => router.back(),
        onError: () => {
          if (Platform.OS === "web") {
            window.alert(t("errors.failed_to_delete"));
          } else {
            Alert.alert(t("errors.title"), t("errors.failed_to_delete"));
          }
        },
      });
    };

    if (Platform.OS === "web") {
      if (window.confirm(t("workshop.delete_confirm_body"))) {
        doDelete();
      }
    } else {
      Alert.alert(
        t("workshop.delete_confirm_title"),
        t("workshop.delete_confirm_body"),
        [
          { text: t("cancel"), style: "cancel" },
          { text: t("delete"), style: "destructive", onPress: doDelete },
        ],
      );
    }
  };

  if (isLoading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.canvas, paddingTop: insets.top + 32 }]}>
        <SkeletonList count={3} />
      </View>
    );
  }

  if (!workshop) {
    return (
      <View style={[s.centered, { backgroundColor: colors.canvas }]}>
        <EmptyState icon="alert-circle-outline" title={t("workshop_not_found")} />
      </View>
    );
  }

  const isOwner = user?.id === workshop.trainer_id;
  const isEnrolled = workshop.is_enrolled === true;
  const enrolledCount = workshop.enrolled_count ?? 0;
  const isFull = enrolledCount >= workshop.max_participants;
  const enrollmentBusy = enrollMutation.isPending || unenrollMutation.isPending;
  const handleEnrollToggle = () => {
    const mutation = isEnrolled ? unenrollMutation : enrollMutation;
    mutation.mutate(id!, {
      onSuccess: () => successFeedback(),
      onError: (err) => {
        const axiosErr = err as AxiosError<{ detail?: string }>;
        const msg = axiosErr.response?.data?.detail ?? t("errors.action_failed");
        if (Platform.OS === "web") {
          window.alert(msg);
        } else {
          Alert.alert(t("errors.title"), msg);
        }
      },
    });
  };
  const weekday = formatWeekdayLong(workshop.start_time);
  const monthDay = formatMonthDayYear(workshop.start_time);
  const time = formatTime(workshop.start_time);
  const eventTZ = workshop.timezone || "UTC";
  const viewerTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const showOriginalTZ = eventTZ !== viewerTZ;
  const originalTZTime = formatTimeWithTZ(workshop.start_time, eventTZ);

  return (
    <View style={[s.screen, { backgroundColor: colors.canvas }]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Back nav */}
        <View style={[s.navBar, { paddingTop: insets.top + 12 }]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t("workshop.go_back")}
            style={({ pressed }) => [s.backButton, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
        </View>

        {/* Title + Date */}
        <View style={s.header}>
          <Text style={s.title}>{workshop.title}</Text>
          <View style={s.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.inkMuted} />
            <Text style={s.dateText}>{weekday}, {monthDay}</Text>
            <Text style={s.dateDot}>·</Text>
            <Ionicons name="time-outline" size={14} color={colors.inkMuted} />
            <Text style={s.dateText}>{time}</Text>
          </View>
        </View>

        {/* Description */}
        {workshop.description ? (
          <View style={s.section}>
            <DescriptionWithHashtags
              text={workshop.description}
              style={s.description}
            />
          </View>
        ) : null}

        {/* Details card */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>{t("details")}</Text>
          <View style={s.detailCard}>
            <DetailRow icon="time-outline" label={t("duration")} value={`${workshop.duration_minutes} min`} />
            <DetailRow
              icon="people-outline"
              label={t("spots")}
              value={`${enrolledCount} / ${workshop.max_participants}`}
            />
            <DetailRow icon="pricetag-outline" label={t("price")} value={formatPrice(workshop.price, t("free"))} />
            {showOriginalTZ && (
              <DetailRow icon="globe-outline" label={t("workshop.event_timezone")} value={originalTZTime} last />
            )}
            {!showOriginalTZ && (
              <DetailRow icon="globe-outline" label={t("workshop.timezone")} value={eventTZ} last />
            )}
          </View>
        </View>

        {/* Owner actions */}
        {isOwner && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>{t("manage")}</Text>
            <View style={s.manageRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("edit")}
                testID="trainer.edit.workshop.button"
                style={({ pressed }) => [s.ghostButton, s.editButton, { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
                onPress={() => router.push({ pathname: "/(app)/workshop/edit", params: { id: id! } })}
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <Text style={[s.ghostButtonText, { color: colors.primary }]}>{t("edit")}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("delete")}
                testID="trainer.delete.workshop.button"
                style={({ pressed }) => [s.ghostButton, s.deleteButton, { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
                onPress={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={[s.ghostButtonText, { color: colors.danger }]}>
                  {deleteMutation.isPending ? t("workshop.deleting") : t("delete")}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky actions */}
      <View style={[s.stickyBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {!isOwner && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isEnrolled ? t("workshop.unenroll") : t("workshop.enroll")}
            testID={isEnrolled ? "workshop.unenroll.button" : "workshop.enroll.button"}
            style={({ pressed }) => [
              s.enrollButton,
              isEnrolled ? s.enrollButtonUnenroll : s.enrollButtonEnroll,
              (isFull && !isEnrolled) && s.enrollButtonDisabled,
              { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.92 : 1 },
            ]}
            onPress={handleEnrollToggle}
            disabled={enrollmentBusy || (isFull && !isEnrolled)}
          >
            {enrollmentBusy ? (
              <ActivityIndicator color={isEnrolled ? colors.danger : colors.primary} />
            ) : (
              <>
                <Ionicons
                  name={
                    isEnrolled
                      ? "close-circle-outline"
                      : isFull
                        ? "lock-closed-outline"
                        : "add-circle-outline"
                  }
                  size={18}
                  color={isEnrolled ? colors.danger : isFull ? colors.inkMuted : colors.primary}
                />
                <Text
                  style={[
                    s.enrollButtonText,
                    {
                      color: isEnrolled
                        ? colors.danger
                        : isFull
                          ? colors.inkMuted
                          : colors.primary,
                    },
                  ]}
                >
                  {isEnrolled
                    ? t("workshop.unenroll")
                    : isFull
                      ? t("workshop.full")
                      : t("workshop.enroll")}
                </Text>
              </>
            )}
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("workshop.join")}
          testID="workshop.join.button"
          style={({ pressed }) => [s.joinButton, { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.92 : 1 }]}
          onPress={handleJoin}
          disabled={joinMutation.isPending}
        >
          {joinMutation.isPending ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <>
              <Ionicons name="videocam" size={18} color={colors.surface} />
              <Text style={s.joinButtonText}>{t("workshop.join")}</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function DetailRow({ icon, label, value, last = false }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[s.detailRow, !last && s.detailRowBorder]}>
      <Ionicons name={icon} size={17} color={colors.inkMuted} />
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  navBar: { paddingHorizontal: 20, paddingBottom: 8 },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 24, paddingBottom: 28 },
  title: {
    fontFamily: fonts.displayLight,
    fontSize: 28,
    letterSpacing: 0.4,
    lineHeight: 38,
    color: colors.ink,
    marginBottom: 12,
  },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { fontFamily: fonts.body, fontSize: 14, color: colors.inkBody, letterSpacing: 0.2 },
  dateDot: { fontSize: 14, color: colors.line, marginHorizontal: 2 },
  section: { paddingHorizontal: 24, paddingBottom: 28 },
  description: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 26,
    color: colors.inkBody,
    letterSpacing: 0.1,
  },
  sectionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.inkMuted,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  detailCard: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineWhisper,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.lineWhisper },
  detailLabel: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.inkBody },
  detailValue: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.ink },
  manageRow: { flexDirection: "row", gap: 12 },
  ghostButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 14,
  },
  editButton: {
    borderWidth: 1.5,
    borderColor: "rgba(86,107,82,0.3)",
    backgroundColor: colors.surface,
  },
  deleteButton: {
    borderWidth: 1.5,
    borderColor: "rgba(196,131,110,0.3)",
    backgroundColor: colors.surface,
  },
  ghostButtonText: { fontFamily: fonts.bodyMedium, fontSize: 14, letterSpacing: 0.3 },
  stickyBar: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: colors.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineWhisper,
  },
  joinButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  joinButtonText: { fontFamily: fonts.bodyMedium, fontSize: 16, letterSpacing: 0.5, color: colors.surface },
  enrollButton: {
    height: 50,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  enrollButtonEnroll: {
    borderColor: "rgba(86,107,82,0.45)",
    backgroundColor: colors.surface,
  },
  enrollButtonUnenroll: {
    borderColor: "rgba(196,131,110,0.45)",
    backgroundColor: colors.surface,
  },
  enrollButtonDisabled: {
    borderColor: "rgba(140,138,130,0.3)",
    backgroundColor: colors.canvasDeep,
  },
  enrollButtonText: { fontFamily: fonts.bodyMedium, fontSize: 15, letterSpacing: 0.3 },
});
