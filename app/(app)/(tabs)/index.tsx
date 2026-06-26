import { View, FlatList, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { useWorkshops } from "@/hooks/useWorkshops";
import { useAuthStore } from "@/store/auth";
import { displayName } from "@/lib/user";
import { listItemEntering } from "@/lib/entrance";
import type { Workshop } from "@/types/api";
import {
  formatWeekdayShort,
  formatDay,
  formatMonthLong,
  formatTime,
} from "@/lib/date";
import { AppText } from "@/components/AppText";
import { Badge } from "@/components/Badge";
import { BreathingCircle } from "@/components/BreathingCircle";
import { DateBlock } from "@/components/DateBlock";
import { EmptyState } from "@/components/EmptyState";
import { PressableScale } from "@/components/PressableScale";
import { SectionHeader } from "@/components/SectionHeader";
import { SkeletonList } from "@/components/Skeleton";
import { colors, radii, shadows, spacing } from "@/theme/tokens";
import { toAutomationSlug } from "@/lib/automationId";

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "home.greeting_morning";
  if (hour < 17) return "home.greeting_afternoon";
  return "home.greeting_evening";
}

function useFormatPrice() {
  const { t } = useTranslation();
  return (price: string | number): string => {
    const n = Number(price);
    if (n === 0) return t("free");
    return `$${n % 1 === 0 ? n : n.toFixed(2)}`;
  };
}

function WorkshopCard({
  workshop,
  index,
}: {
  workshop: Workshop;
  index: number;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const formatPrice = useFormatPrice();
  const weekday = formatWeekdayShort(workshop.start_time);
  const day = formatDay(workshop.start_time);
  const month = formatMonthLong(workshop.start_time);
  const time = formatTime(workshop.start_time);
  const price = formatPrice(workshop.price);
  const isFree = Number(workshop.price) === 0;

  return (
    <Animated.View entering={listItemEntering(index)}>
      <PressableScale
        onPress={() => router.push(`/(app)/workshop/${workshop.id}`)}
        haptic
        accessibilityRole="button"
        accessibilityLabel={`${workshop.title}, ${weekday} ${day} ${month} at ${time}, ${price}`}
        testID={`home.workshop.card.${toAutomationSlug(workshop.title)}`}
        style={s.card}
      >
        <DateBlock weekday={weekday} day={day} />

        <View style={s.cardBody}>
          <AppText variant="heading" numberOfLines={2}>
            {workshop.title}
          </AppText>

          <View style={s.metaRow}>
            <Ionicons name="time-outline" size={13} color={colors.inkMuted} />
            <AppText variant="caption" tone="body">
              {time}
            </AppText>
            <AppText variant="caption" tone="muted" style={s.metaDot}>
              ·
            </AppText>
            <AppText variant="caption" tone="body">
              {t("home.duration_min", { count: workshop.duration_minutes })}
            </AppText>
          </View>

          <View style={s.metaRow}>
            <Ionicons
              name="people-outline"
              size={13}
              color={colors.inkMuted}
            />
            <AppText variant="caption" tone="muted">
              {t("home.spots_count", { count: workshop.max_participants })}
            </AppText>
          </View>
        </View>

        <View style={s.cardSide}>
          <Badge label={price} tone={isFree ? "primary" : "neutral"} />
          <Ionicons name="chevron-forward" size={14} color={colors.line} />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

function ListHeader({ name }: { name?: string }) {
  const { t } = useTranslation();
  const firstName = name?.split(" ")[0];

  return (
    <View style={s.listHeader}>
      <BreathingCircle size={150} style={s.headerDecor} />

      <AppText variant="caption" tone="muted" style={s.greeting}>
        {t(getGreetingKey())}
        {firstName ? "," : ""}
      </AppText>
      {firstName && <AppText variant="display">{firstName}</AppText>}

      <View style={s.sectionLabelRow}>
        <SectionHeader label={t("home.upcoming")} />
      </View>
    </View>
  );
}

export default function WorkshopListScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useWorkshops();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top + 32 }}>
        <SkeletonList />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center bg-canvas">
        <EmptyState
          icon="cloud-offline-outline"
          title={t("home.error_title")}
          subtitle={t("home.error_subtitle")}
          actionLabel={t("home.try_again")}
          onAction={() => refetch()}
          actionAccessibilityLabel={t("home.retry_a11y")}
        />
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
        renderItem={({ item, index }) => (
          <WorkshopCard workshop={item} index={index} />
        )}
        testID="home.workshops.list"
        contentContainerStyle={{
          paddingHorizontal: spacing.screenPadding,
          paddingTop: insets.top + spacing.sectionGap,
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
          <EmptyState
            icon="calendar-outline"
            title={t("home.empty_title")}
            subtitle={t("home.empty_subtitle")}
            actionLabel={t("home.browse_groups")}
            onAction={() => router.push("/(app)/(tabs)/groups")}
          />
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.elementGap,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.lineWhisper,
    padding: spacing.cardPadding,
    marginBottom: spacing.elementGap,
    ...shadows.card,
  },
  cardBody: {
    flex: 1,
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaDot: {
    marginHorizontal: 2,
  },
  cardSide: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    alignSelf: "stretch",
    paddingVertical: 2,
  },
  listHeader: {
    marginBottom: spacing.sectionGap,
    paddingHorizontal: 4,
  },
  headerDecor: {
    position: "absolute",
    top: -40,
    right: -60,
  },
  greeting: {
    marginBottom: 2,
  },
  sectionLabelRow: {
    marginTop: 40,
  },
});
