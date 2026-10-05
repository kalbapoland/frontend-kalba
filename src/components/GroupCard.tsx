import { View, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";

import type { Group } from "@/types/api";
import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/PressableScale";
import { fonts, radii, shadows, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { useThemedStyles } from "@/theme/useThemedStyles";
import type { ThemeColors } from "@/theme/themes";

function toAutomationSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: c.lineWhisper,
      marginBottom: spacing.itemGap,
      paddingLeft: spacing.elementGap,
      ...shadows.card,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.primaryWash,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitial: {
      fontFamily: fonts.displayMedium,
      fontSize: 20,
      lineHeight: 26,
      color: c.primary,
    },
    body: {
      flex: 1,
      paddingHorizontal: spacing.elementGap,
      paddingVertical: spacing.elementGap,
      gap: 5,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    title: {
      flex: 1,
    },
    adminBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: c.primaryWash,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.tag,
    },
    adminBadgeText: {
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 0.6,
      color: c.primary,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 2,
    },
    subscribeBtn: {
      alignSelf: "center",
      marginRight: 14,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.button,
      borderWidth: 1,
      borderColor: c.primary,
      minHeight: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    chevron: {
      alignItems: "center",
      justifyContent: "center",
      paddingRight: spacing.elementGap,
    },
  });
}

export function GroupCard({
  group,
  onSubscribe,
  subscribing,
}: {
  group: Group;
  /** When provided, renders a Subscribe button (Discover section). */
  onSubscribe?: () => void;
  subscribing?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useThemedStyles(buildStyles);
  const memberLabel = t("group.member_count", { count: group.member_count ?? 0 });
  const initial = group.title.trim().charAt(0).toUpperCase();

  return (
    <PressableScale
      onPress={() => router.push(`/(app)/group/${group.id}`)}
      haptic
      accessibilityRole="button"
      accessibilityLabel={`${group.title}, ${memberLabel}`}
      testID={`group.card.${toAutomationSlug(group.title)}`}
      style={s.card}
    >
      <View style={s.avatar}>
        <AppText style={s.avatarInitial}>{initial}</AppText>
      </View>

      <View style={s.body}>
        <View style={s.titleRow}>
          <AppText variant="heading" numberOfLines={1} style={s.title}>
            {group.title}
          </AppText>
          {group.is_owner && (
            <View style={s.adminBadge}>
              <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
              <AppText variant="overline" style={s.adminBadgeText}>
                {t("group.admin")}
              </AppText>
            </View>
          )}
        </View>

        {group.description ? (
          <AppText variant="caption" tone="body" numberOfLines={2}>
            {group.description}
          </AppText>
        ) : null}

        <View style={s.metaRow}>
          <Ionicons name="people-outline" size={13} color={colors.inkMuted} />
          <AppText variant="caption" tone="muted">
            {memberLabel}
          </AppText>
        </View>
      </View>

      {onSubscribe ? (
        <Pressable
          onPress={onSubscribe}
          disabled={subscribing}
          accessibilityRole="button"
          accessibilityLabel={t("group.subscribe_to_name", { title: group.title })}
          testID={`group.subscribe.button.${toAutomationSlug(group.title)}`}
          style={({ pressed }) => [s.subscribeBtn, { opacity: pressed || subscribing ? 0.7 : 1 }]}
        >
          {subscribing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <AppText variant="captionMedium" tone="primary">
              {t("group.subscribe")}
            </AppText>
          )}
        </Pressable>
      ) : (
        <View style={s.chevron}>
          <Ionicons name="chevron-forward" size={14} color={colors.line} />
        </View>
      )}
    </PressableScale>
  );
}
