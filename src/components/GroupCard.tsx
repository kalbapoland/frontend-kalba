import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import type { Group } from "@/types/api";
import { colors } from "@/theme/tokens";

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
  const router = useRouter();
  const memberLabel = `${group.member_count ?? 0} ${
    (group.member_count ?? 0) === 1 ? "member" : "members"
  }`;

  return (
    <Pressable
      onPress={() => router.push(`/(app)/group/${group.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${group.title}, ${memberLabel}`}
      className="mb-4 flex-row overflow-hidden rounded-2xl border border-line-whisper bg-surface"
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.98 : 1 }],
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={s.accentStrip} />
      <View style={s.body}>
        <View style={s.titleRow}>
          <Text style={s.title} numberOfLines={1}>
            {group.title}
          </Text>
          {group.is_owner && (
            <View style={s.adminBadge}>
              <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
              <Text style={s.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>

        {group.description ? (
          <Text style={s.description} numberOfLines={2}>
            {group.description}
          </Text>
        ) : null}

        <View style={s.metaRow}>
          <Ionicons name="people-outline" size={13} color={colors.inkMuted} />
          <Text style={s.metaText}>{memberLabel}</Text>
        </View>
      </View>

      {onSubscribe ? (
        <Pressable
          onPress={onSubscribe}
          disabled={subscribing}
          accessibilityRole="button"
          accessibilityLabel={`Subscribe to ${group.title}`}
          style={({ pressed }) => [s.subscribeBtn, { opacity: pressed || subscribing ? 0.7 : 1 }]}
        >
          {subscribing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={s.subscribeText}>Subscribe</Text>
          )}
        </Pressable>
      ) : (
        <View style={s.chevron}>
          <Ionicons name="chevron-forward" size={14} color={colors.line} />
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  accentStrip: {
    width: 3,
    backgroundColor: "#566B52",
  },
  body: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "500",
    letterSpacing: 0.2,
    color: "#2E2E2B",
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#E8EDE5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: "#566B52",
    textTransform: "uppercase",
  },
  description: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    color: "#57564F",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "400",
    color: "#8C8A82",
  },
  subscribeBtn: {
    alignSelf: "center",
    marginRight: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#566B52",
  },
  subscribeText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
    color: "#566B52",
  },
  chevron: {
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 16,
  },
});
