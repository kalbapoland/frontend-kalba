import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { SkeletonList } from "@/components/Skeleton";
import { successFeedback } from "@/lib/haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import type { AxiosError } from "axios";

import { translateApiError } from "@/lib/apiErrors";
import {
  useGroup,
  useGroupMembers,
  useGroupWorkshops,
  useSubscribeGroup,
  useUnsubscribeGroup,
  useRemoveGroupMember,
  useDeleteGroup,
} from "@/hooks/useGroups";
import type { Workshop } from "@/types/api";
import {
  formatWeekdayShort,
  formatDay,
  formatMonthLong,
  formatTime,
} from "@/lib/date";
import { colors, fonts } from "@/theme/tokens";

function toAutomationSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function SectionLabel({ children }: { children: string }) {
  return (
    <View style={s.sectionLabelRow}>
      <SectionHeader label={children} />
    </View>
  );
}

function WorkshopRow({ workshop }: { workshop: Workshop }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/(app)/workshop/${workshop.id}`)}
      accessibilityRole="button"
      accessibilityLabel={workshop.title}
      testID={`group.workshop.row.${toAutomationSlug(workshop.title)}`}
      style={({ pressed }) => [s.workshopRow, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.workshopTitle} numberOfLines={1}>
          {workshop.title}
        </Text>
        <View style={s.workshopMetaRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.inkMuted} />
          <Text style={s.workshopMeta}>
            {formatWeekdayShort(workshop.start_time)}, {formatDay(workshop.start_time)}{" "}
            {formatMonthLong(workshop.start_time)}
          </Text>
          <Text style={s.workshopDot}>·</Text>
          <Text style={s.workshopMeta}>{formatTime(workshop.start_time)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.line} />
    </Pressable>
  );
}

export default function GroupDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const group = useGroup(id!);
  const members = useGroupMembers(id!);
  const canSeeWorkshops = !!(group.data?.is_member || group.data?.is_owner);
  const workshops = useGroupWorkshops(id!, canSeeWorkshops);
  const subscribe = useSubscribeGroup();
  const unsubscribe = useUnsubscribeGroup();
  const removeMember = useRemoveGroupMember(id!);
  const deleteGroup = useDeleteGroup();

  const showError = (msg: string) => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(t("errors.title"), msg);
  };

  const refetch = () => {
    void group.refetch();
    void members.refetch();
    void workshops.refetch();
  };

  if (group.isLoading) {
    return (
      <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top + 32 }}>
        <SkeletonList count={3} />
      </View>
    );
  }

  if (group.error || !group.data) {
    return (
      <View className="flex-1 justify-center bg-canvas">
        <EmptyState
          icon="cloud-offline-outline"
          title={t("group.group_not_found")}
          actionLabel={t("workshop.go_back")}
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const g = group.data;
  const memberCount = g.member_count ?? members.data?.length ?? 0;

  const handleDeleteGroup = () => {
    const doDelete = () => {
      deleteGroup.mutate(g.id, {
        onSuccess: () => router.back(),
        onError: (err) => {
          const detail = (err as AxiosError<{ detail?: string }>).response?.data?.detail;
          showError(translateApiError(detail, t, t("group.failed_delete")));
        },
      });
    };
    if (Platform.OS === "web") {
      if (window.confirm(t("group.delete_confirm_body"))) doDelete();
    } else {
      Alert.alert(t("group.delete_confirm_title"), t("group.delete_confirm_body"), [
        { text: t("cancel"), style: "cancel" },
        { text: t("delete"), style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const confirmRemove = (memberUserId: string, name: string) => {
    const doRemove = () =>
      removeMember.mutate(memberUserId, {
        onError: () => showError(t("group.remove_member_failed")),
      });
    if (Platform.OS === "web") {
      if (window.confirm(t("group.remove_member_confirm", { name }))) doRemove();
    } else {
      Alert.alert(t("group.remove_member_title"), t("group.remove_member_confirm", { name }), [
        { text: t("cancel"), style: "cancel" },
        { text: t("group.remove"), style: "destructive", onPress: doRemove },
      ]);
    }
  };

  return (
    <View className="flex-1 bg-canvas">
      <LinearGradient
        colors={[colors.canvas, colors.canvasDeep]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("workshop.go_back")}
          style={({ pressed }) => [s.backButton, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        {g.is_owner && (
          <Pressable
            onPress={() =>
              router.push({ pathname: "/(app)/group/edit", params: { id: g.id } })
            }
            accessibilityRole="button"
            accessibilityLabel={t("group.edit_group")}
            testID="group.edit.button"
            style={({ pressed }) => [s.editButton, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={s.editButtonText}>{t("edit")}</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl
            refreshing={group.isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        <View style={s.titleRow}>
          <Text style={s.title}>{g.title}</Text>
          {g.is_owner && (
            <View style={s.adminBadge}>
              <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
              <Text style={s.adminBadgeText}>{t("group.admin")}</Text>
            </View>
          )}
        </View>

        <View style={s.metaRow}>
          <Ionicons name="people-outline" size={14} color={colors.inkMuted} />
          <Text style={s.metaText}>{t("group.member_count", { count: memberCount })}</Text>
        </View>

        {g.description ? (
          <Text style={s.description}>{g.description}</Text>
        ) : (
          <Text style={s.descriptionMuted}>{t("group.no_description")}</Text>
        )}

        {/* Subscribe / Unsubscribe — hidden for the owner */}
        {!g.is_owner &&
          (g.is_member ? (
            <Pressable
              onPress={() =>
                unsubscribe.mutate(g.id, {
                  onSuccess: () => successFeedback(),
                  onError: () => showError(t("group.unsubscribe_failed")),
                })
              }
              disabled={unsubscribe.isPending}
              accessibilityRole="button"
              accessibilityLabel={t("group.unsubscribe_from_group")}
              testID="group.unsubscribe.button"
              style={({ pressed }) => [
                s.secondaryButton,
                { opacity: pressed || unsubscribe.isPending ? 0.7 : 1 },
              ]}
            >
              <Text style={s.secondaryButtonText}>
                {unsubscribe.isPending ? t("group.leaving") : t("group.unsubscribe")}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() =>
                subscribe.mutate(g.id, {
                  onSuccess: () => successFeedback(),
                  onError: () => showError(t("group.subscribe_failed")),
                })
              }
              disabled={subscribe.isPending}
              accessibilityRole="button"
              accessibilityLabel={t("group.subscribe_to_group")}
              testID="group.subscribe.button"
              style={({ pressed }) => [
                s.primaryButton,
                { opacity: pressed || subscribe.isPending ? 0.85 : 1 },
              ]}
            >
              <Text style={s.primaryButtonText}>
                {subscribe.isPending ? t("group.joining") : t("group.subscribe")}
              </Text>
            </Pressable>
          ))}

        {/* Workshops in this group — members and the owner only */}
        {canSeeWorkshops ? (
          <>
            <SectionLabel>{t("workshops")}</SectionLabel>
            {g.is_owner && (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(app)/create-workshop",
                    params: { groupId: g.id },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={t("group.create_workshop_in_group")}
                testID="trainer.create.workshop.button"
                style={({ pressed }) => [s.createWorkshopBtn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={s.createWorkshopText}>{t("create_workshop.label")}</Text>
              </Pressable>
            )}
            {workshops.isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
            ) : (workshops.data ?? []).length === 0 ? (
              <Text style={s.emptyHint}>{t("group.no_workshops_in_group")}</Text>
            ) : (
              (workshops.data ?? []).map((w) => <WorkshopRow key={w.id} workshop={w} />)
            )}
          </>
        ) : (
          <>
            <SectionLabel>{t("workshops")}</SectionLabel>
            <Text style={s.emptyHint}>
              {t("group.subscribe_to_see_workshops")}
            </Text>
          </>
        )}

        {/* Members */}
        <SectionLabel>{t("group.members")}</SectionLabel>
        {members.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
        ) : (members.data ?? []).length === 0 ? (
          <Text style={s.emptyHint}>{t("group.no_members")}</Text>
        ) : (
          (members.data ?? []).map((m) => (
            <View key={m.id} style={s.memberRow}>
              <View style={s.memberAvatar}>
                <Ionicons name="person" size={14} color={colors.primary} />
              </View>
              <Text style={s.memberName} numberOfLines={1}>
                {m.full_name || t("group.member_fallback")}
              </Text>
              {g.is_owner && (
                <Pressable
                  onPress={() =>
                    confirmRemove(m.user_id, m.full_name || t("group.member_fallback"))
                  }
                  accessibilityRole="button"
                  accessibilityLabel={t("group.remove_member_a11y", {
                    name: m.full_name || t("group.member_fallback"),
                  })}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6 })}
                >
                  <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
                </Pressable>
              )}
            </View>
          ))
        )}

        {g.is_owner && (
          <Pressable
            onPress={handleDeleteGroup}
            disabled={deleteGroup.isPending}
            accessibilityRole="button"
            accessibilityLabel={t("group.delete_group")}
            testID="trainer.delete.group.button"
            style={({ pressed }) => [s.deleteGroupButton, { opacity: pressed || deleteGroup.isPending ? 0.7 : 1 }]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={s.deleteGroupButtonText}>
              {deleteGroup.isPending ? t("group.deleting") : t("group.delete_group")}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -4,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primary,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 8,
  },
  title: {
    flex: 1,
    fontFamily: fonts.displayLight,
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: 0.4,
    color: colors.ink,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  adminBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.primary,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkBody,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.inkBody,
    marginTop: 16,
  },
  descriptionMuted: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontStyle: "italic",
    color: colors.inkMuted,
    marginTop: 16,
  },
  primaryButton: {
    height: 50,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  primaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    letterSpacing: 0.3,
    color: colors.surface,
  },
  secondaryButton: {
    height: 50,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  secondaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    letterSpacing: 0.3,
    color: colors.primary,
  },
  sectionLabelRow: {
    marginTop: 32,
    marginBottom: 14,
  },
  emptyHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  createWorkshopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 12,
    marginBottom: 14,
  },
  createWorkshopText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    letterSpacing: 0.2,
    color: colors.primary,
  },
  workshopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineWhisper,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  workshopTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ink,
  },
  workshopMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  workshopMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
  },
  workshopDot: {
    fontSize: 12,
    color: colors.inkMuted,
    marginHorizontal: 2,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryWash,
    alignItems: "center",
    justifyContent: "center",
  },
  memberName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  deleteGroupButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 32,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteGroupButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.danger,
  },
});
