import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useWorkshops } from "@/hooks/useWorkshops";
import { useAuthStore } from "@/store/auth";
import { displayName } from "@/lib/user";
import type { Workshop } from "@/types/api";
import {
  formatWeekdayShort,
  formatDay,
  formatMonthLong,
  formatTime,
} from "@/lib/date";
import { colors } from "@/theme/tokens";

function toAutomationSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatPrice(price: string | number): string {
  const n = Number(price);
  if (n === 0) return "Free";
  return `$${n % 1 === 0 ? n : n.toFixed(2)}`;
}

function WorkshopCard({ workshop }: { workshop: Workshop }) {
  const router = useRouter();
  const weekday = formatWeekdayShort(workshop.start_time);
  const day = formatDay(workshop.start_time);
  const month = formatMonthLong(workshop.start_time);
  const time = formatTime(workshop.start_time);

  return (
    <Pressable
      onPress={() => router.push(`/(app)/workshop/${workshop.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${workshop.title}, ${weekday} ${day} ${month} at ${time}, ${formatPrice(workshop.price)}`}
      testID={`home.workshop.card.${toAutomationSlug(workshop.title)}`}
      className="mb-5 flex-row overflow-hidden rounded-2xl border border-line-whisper bg-surface"
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.98 : 1 }],
        opacity: pressed ? 0.92 : 1,
      })}
    >
      {/* Left accent strip */}
      <View style={s.accentStrip} />

      <View style={s.cardBody}>
        {/* Title + Price row */}
        <View style={s.titleRow}>
          <Text style={s.cardTitle} numberOfLines={2}>
            {workshop.title}
          </Text>
          <Text style={s.cardPrice}>{formatPrice(workshop.price)}</Text>
        </View>

        {/* Date + time */}
        <View style={s.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.inkMuted} />
          <Text style={s.metaText}>
            {weekday}, {day} {month}
          </Text>
          <Text style={s.metaDot}>·</Text>
          <Ionicons name="time-outline" size={13} color={colors.inkMuted} />
          <Text style={s.metaText}>{time}</Text>
        </View>

        {/* Duration + spots */}
        <View style={s.detailRow}>
          <Ionicons name="time-outline" size={12} color={colors.inkMuted} />
          <Text style={s.detailText}>{workshop.duration_minutes} min</Text>
          <Text style={s.detailDot}>·</Text>
          <Ionicons name="people-outline" size={12} color={colors.inkMuted} />
          <Text style={s.detailText}>{workshop.max_participants} spots</Text>
        </View>
      </View>

      {/* Chevron */}
      <View style={s.chevronContainer}>
        <Ionicons name="chevron-forward" size={14} color={colors.line} />
      </View>
    </Pressable>
  );
}

function ListHeader({ name }: { name?: string }) {
  const firstName = name?.split(" ")[0];

  return (
    <View style={s.listHeader}>
      <Text style={s.greeting}>{getGreeting()}{firstName ? "," : ""}</Text>
      {firstName && <Text style={s.greetingName}>{firstName}</Text>}

      <View style={s.sectionLabelRow}>
        <Text style={s.sectionLabel}>Upcoming</Text>
        <View style={s.sectionAccent} />
      </View>
    </View>
  );
}

export default function WorkshopListScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useWorkshops();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-12">
        <Ionicons name="cloud-offline-outline" size={48} color={colors.line} />
        <Text style={s.emptyTitle}>Unable to load</Text>
        <Text style={s.emptySubtitle}>Check your connection and try again</Text>
        <Pressable
          onPress={() => refetch()}
          accessibilityRole="button"
          accessibilityLabel="Retry loading workshops"
          className="mt-7 rounded-full border border-primary px-8 py-4"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text className="text-sm font-medium tracking-wide text-primary">
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <LinearGradient
        colors={[colors.canvas, colors.canvasDeep]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WorkshopCard workshop={item} />}
        testID="home.workshops.list"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: insets.top + 32,
          paddingBottom: 140,
        }}
        ListHeaderComponent={<ListHeader name={displayName(user)} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.line} />
            <Text style={s.emptyTitle}>Your schedule is clear</Text>
            <Text style={s.emptySubtitle}>
              Join a group to see its upcoming workshops here
            </Text>
            <Pressable
              onPress={() => router.push("/(app)/(tabs)/groups")}
              accessibilityRole="button"
              accessibilityLabel="Browse groups"
              className="mt-7 rounded-full border border-primary px-8 py-4"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text className="text-sm font-medium tracking-wide text-primary">
                Browse groups
              </Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  accentStrip: {
    width: 3,
    backgroundColor: "#566B52",
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "500",
    letterSpacing: 0.2,
    lineHeight: 24,
    color: "#2E2E2B",
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
    color: "#566B52",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: 0.2,
    color: "#57564F",
  },
  metaDot: {
    fontSize: 13,
    color: "#8C8A82",
    marginHorizontal: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    fontWeight: "400",
    color: "#8C8A82",
  },
  detailDot: {
    fontSize: 12,
    color: "#DDD9D1",
    marginHorizontal: 4,
  },
  chevronContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 16,
  },
  listHeader: {
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  greeting: {
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 0.3,
    color: "#8C8A82",
  },
  greetingName: {
    fontSize: 28,
    fontWeight: "300",
    letterSpacing: 0.5,
    lineHeight: 36,
    color: "#2E2E2B",
    marginTop: 2,
  },
  sectionLabelRow: {
    marginTop: 40,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 2,
    color: "#8C8A82",
    textTransform: "uppercase",
  },
  sectionAccent: {
    width: 24,
    height: 1.5,
    backgroundColor: "#566B52",
    borderRadius: 1,
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "300",
    letterSpacing: 0.3,
    color: "#57564F",
    marginTop: 20,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: "400",
    color: "#8C8A82",
    marginTop: 8,
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#566B52",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2E2E2B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
});
