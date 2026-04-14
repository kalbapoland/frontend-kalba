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
import type { AxiosError } from "axios";

import { useWorkshopDetail } from "@/hooks/useWorkshopDetail";
import { useJoinWorkshop } from "@/hooks/useJoinWorkshop";
import { useDeleteWorkshop } from "@/hooks/useDeleteWorkshop";
import { useAuthStore } from "@/store/auth";
import { formatWeekdayLong, formatMonthDayYear, formatTime, formatTimeWithTZ } from "@/lib/date";
import { colors } from "@/theme/tokens";

function formatPrice(price: string | number): string {
  const n = Number(price);
  if (n === 0) return "Free";
  return `$${n % 1 === 0 ? n : n.toFixed(2)}`;
}

export default function WorkshopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workshop, isLoading } = useWorkshopDetail(id!);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const joinMutation = useJoinWorkshop();
  const deleteMutation = useDeleteWorkshop();
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
        const msg = axiosErr.response?.data?.detail ?? "Could not join workshop";
        if (Platform.OS === "web") {
          window.alert(msg);
        } else {
          Alert.alert("Unable to Join", msg);
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
            window.alert("Failed to delete workshop");
          } else {
            Alert.alert("Error", "Failed to delete workshop");
          }
        },
      });
    };

    if (Platform.OS === "web") {
      if (window.confirm("Delete this workshop? This cannot be undone.")) {
        doDelete();
      }
    } else {
      Alert.alert(
        "Delete Workshop",
        "Are you sure you want to delete this workshop? This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete },
        ],
      );
    }
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
        <Ionicons name="alert-circle-outline" size={48} color={colors.line} />
        <Text style={s.emptyTitle}>Workshop not found</Text>
      </View>
    );
  }

  const isOwner = user?.id === workshop.trainer_id;
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
            accessibilityLabel="Go back"
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
            <Text style={s.description}>{workshop.description}</Text>
          </View>
        ) : null}

        {/* Details card */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Details</Text>
          <View style={s.detailCard}>
            <DetailRow icon="time-outline" label="Duration" value={`${workshop.duration_minutes} min`} />
            <DetailRow icon="people-outline" label="Spots" value={`${workshop.max_participants} max`} />
            <DetailRow icon="pricetag-outline" label="Price" value={formatPrice(workshop.price)} />
            {showOriginalTZ && (
              <DetailRow icon="globe-outline" label="Event timezone" value={originalTZTime} last />
            )}
            {!showOriginalTZ && (
              <DetailRow icon="globe-outline" label="Timezone" value={eventTZ} last />
            )}
          </View>
        </View>

        {/* Owner actions */}
        {isOwner && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Manage</Text>
            <View style={s.manageRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit workshop"
                style={({ pressed }) => [s.ghostButton, s.editButton, { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
                onPress={() => router.push({ pathname: "/(app)/workshop/edit", params: { id: id! } })}
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <Text style={[s.ghostButtonText, { color: colors.primary }]}>Edit</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete workshop"
                style={({ pressed }) => [s.ghostButton, s.deleteButton, { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
                onPress={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={[s.ghostButtonText, { color: colors.danger }]}>
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky join button */}
      <View style={[s.stickyBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Join workshop"
          style={({ pressed }) => [s.joinButton, { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.92 : 1 }]}
          onPress={handleJoin}
          disabled={joinMutation.isPending}
        >
          {joinMutation.isPending ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <>
              <Ionicons name="videocam" size={18} color={colors.surface} />
              <Text style={s.joinButtonText}>Join Workshop</Text>
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
  emptyTitle: { fontSize: 18, fontWeight: "300", color: "#57564F", marginTop: 16 },
  navBar: { paddingHorizontal: 20, paddingBottom: 8 },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 24, paddingBottom: 28 },
  title: {
    fontSize: 28,
    fontWeight: "200",
    letterSpacing: 0.5,
    lineHeight: 36,
    color: "#2E2E2B",
    marginBottom: 12,
  },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { fontSize: 14, color: "#57564F", letterSpacing: 0.2 },
  dateDot: { fontSize: 14, color: "#DDD9D1", marginHorizontal: 2 },
  section: { paddingHorizontal: 24, paddingBottom: 28 },
  description: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 26,
    color: "#57564F",
    letterSpacing: 0.1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 2,
    color: "#8C8A82",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  detailCard: {
    borderRadius: 20,
    backgroundColor: "#FAF8F4",
    borderWidth: 1,
    borderColor: "#EDE9E2",
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: "#EDE9E2" },
  detailLabel: { flex: 1, fontSize: 14, color: "#57564F" },
  detailValue: { fontSize: 14, fontWeight: "600", color: "#2E2E2B" },
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
    backgroundColor: "#FAF8F4",
  },
  deleteButton: {
    borderWidth: 1.5,
    borderColor: "rgba(196,131,110,0.3)",
    backgroundColor: "#FAF8F4",
  },
  ghostButtonText: { fontSize: 14, fontWeight: "500", letterSpacing: 0.3 },
  stickyBar: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: colors.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#EDE9E2",
  },
  joinButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: "#566B52",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  joinButtonText: { fontSize: 16, fontWeight: "500", letterSpacing: 0.5, color: "#FAF8F4" },
});
