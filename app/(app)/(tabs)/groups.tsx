import { useMemo } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { useGroups, useMyGroups, useSubscribeGroup } from "@/hooks/useGroups";
import { useAuthStore } from "@/store/auth";
import { GroupCard } from "@/components/GroupCard";
import { AppText } from "@/components/AppText";
import { EmptyState } from "@/components/EmptyState";
import { PressableScale } from "@/components/PressableScale";
import { SectionHeader } from "@/components/SectionHeader";
import { SkeletonList } from "@/components/Skeleton";
import { listItemEntering } from "@/lib/entrance";
import type { Group } from "@/types/api";
import { colors, layout, shadows, spacing } from "@/theme/tokens";

function EmptyHint({ text }: { text: string }) {
  return (
    <AppText variant="caption" tone="muted" style={s.emptyHint}>
      {text}
    </AppText>
  );
}

export default function GroupsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const isTrainer = user?.role === "trainer";

  const mine = useMyGroups();
  const all = useGroups();
  const subscribe = useSubscribeGroup();

  const discover = useMemo<Group[]>(
    () => (all.data ?? []).filter((g) => !g.is_member && !g.is_owner),
    [all.data],
  );

  const isLoading = mine.isLoading || all.isLoading;
  const isRefetching = mine.isRefetching || all.isRefetching;
  const refetch = () => {
    void mine.refetch();
    void all.refetch();
  };

  const handleSubscribe = (group: Group) => {
    subscribe.mutate(group.id, {
      onError: () => {
        const msg = t("group.subscribe_failed");
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert(t("errors.title"), msg);
      },
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top + 32 }}>
        <SkeletonList />
      </View>
    );
  }

  if (mine.error || all.error) {
    return (
      <View className="flex-1 justify-center bg-canvas">
        <EmptyState
          icon="cloud-offline-outline"
          title={t("group.unable_to_load")}
          subtitle={t("group.check_connection")}
          actionLabel={t("group.try_again")}
          onAction={refetch}
          actionAccessibilityLabel={t("group.retry_loading_groups")}
        />
      </View>
    );
  }

  const myGroups = mine.data ?? [];

  return (
    <View className="flex-1 bg-canvas">
      <LinearGradient
        colors={[colors.canvas, colors.canvasDeep]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.screenPadding,
          paddingTop: insets.top + spacing.sectionGap,
          paddingBottom: 140,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        <AppText variant="display" style={s.pageTitle}>
          {t("groups")}
        </AppText>

        {/* Section A: My Groups */}
        <View style={s.sectionLabelRow}>
          <SectionHeader label={t("group.my_groups")} />
        </View>
        {myGroups.length === 0 ? (
          <EmptyHint text={t("group.empty_my_groups")} />
        ) : (
          myGroups.map((g, i) => (
            <Animated.View key={g.id} entering={listItemEntering(i)}>
              <GroupCard group={g} />
            </Animated.View>
          ))
        )}

        {/* Section B: Discover */}
        <View style={[s.sectionLabelRow, { marginTop: spacing.cardPadding }]}>
          <SectionHeader label={t("group.discover_groups")} />
        </View>
        {discover.length === 0 ? (
          <EmptyHint text={t("group.empty_discover_groups")} />
        ) : (
          discover.map((g, i) => (
            <Animated.View key={g.id} entering={listItemEntering(i)}>
              <GroupCard
                group={g}
                onSubscribe={() => handleSubscribe(g)}
                subscribing={subscribe.isPending && subscribe.variables === g.id}
              />
            </Animated.View>
          ))
        )}
      </ScrollView>

      {isTrainer && (
        <PressableScale
          onPress={() => router.push("/(app)/create-group")}
          haptic
          accessibilityRole="button"
          accessibilityLabel={t("group.create_new_group")}
          testID="trainer.create.group.button"
          style={[s.fab, { bottom: insets.bottom + 80 }]}
        >
          <Ionicons name="add" size={26} color={colors.surface} />
        </PressableScale>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  pageTitle: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionLabelRow: {
    marginTop: spacing.cardPadding,
    marginBottom: spacing.elementGap,
    paddingHorizontal: 4,
  },
  emptyHint: {
    paddingHorizontal: 4,
  },
  fab: {
    position: "absolute",
    right: spacing.screenPadding,
    width: layout.fabSize,
    height: layout.fabSize,
    borderRadius: layout.fabSize / 2,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.raised,
  },
});
