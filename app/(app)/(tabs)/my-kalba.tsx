import { useMemo, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import {
    useDeleteMyKalbaNotification,
    useMarkAllMyKalbaNotificationsRead,
    useMyKalbaDashboard,
    useMyKalbaNotifications,
    useMyKalbaSchedule,
    useUpdateMyKalbaGoal,
    useUpdateMyKalbaNotificationRead,
} from "@/hooks/useMyKalba";
import { SkeletonList } from "@/components/Skeleton";
import { listItemEntering } from "@/lib/entrance";
import { colors, fonts, shadows } from "@/theme/tokens";
import { formatMonthDayYear, formatTime, formatWeekdayShort } from "@/lib/date";

function clampTarget(value: number): number {
    return Math.max(1, Math.min(60, value));
}

type PillVariant = "active" | "inactive";

function getPillStyle(variant: PillVariant) {
    if (variant === "active") {
        return {
            container: [styles.filterPill, styles.filterPillActive],
            text: [styles.filterPillText, styles.filterPillTextActive],
        };
    }

    return {
        container: [styles.filterPill, styles.filterPillInactive],
        text: [styles.filterPillText, styles.filterPillTextInactive],
    };
}

export default function MyKalbaScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [unreadOnly, setUnreadOnly] = useState(true);

    const dashboard = useMyKalbaDashboard();
    const schedule = useMyKalbaSchedule(8);
    const notifications = useMyKalbaNotifications(unreadOnly);

    const updateGoal = useUpdateMyKalbaGoal();
    const updateRead = useUpdateMyKalbaNotificationRead();
    const deleteNotification = useDeleteMyKalbaNotification();
    const markAllRead = useMarkAllMyKalbaNotificationsRead();

    const goal = dashboard.data?.goal;
    const stats = dashboard.data?.stats;

    const canRender = dashboard.isSuccess && schedule.isSuccess && notifications.isSuccess;
    const isLoading = dashboard.isLoading || schedule.isLoading || notifications.isLoading;

    const progress = useMemo(() => {
        if (!stats) return 0;
        return Math.max(0, Math.min(100, stats.monthly_progress_percent));
    }, [stats]);

    const adjustGoal = (delta: number) => {
        if (!goal) return;
        const next = clampTarget(goal.monthly_target + delta);
        if (next === goal.monthly_target) return;
        updateGoal.mutate(next);
    };

    if (isLoading) {
        return (
            <View style={[styles.screen, { paddingTop: insets.top + 32 }]}>
                <SkeletonList />
            </View>
        );
    }

    if (!canRender || !goal || !stats) {
        return (
            <View style={styles.centeredState}>
                <Text style={styles.errorText}>{t("my_kalba.load_error")}</Text>
            </View>
        );
    }

    const unreadStyles = getPillStyle(unreadOnly ? "active" : "inactive");
    const allStyles = getPillStyle(!unreadOnly ? "active" : "inactive");

    return (
        <View style={styles.screen}>
            <LinearGradient
                colors={[colors.canvas, colors.canvasDeep]}
                locations={[0, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                contentContainerStyle={{
                    paddingTop: insets.top + 20,
                    paddingHorizontal: 20,
                    paddingBottom: insets.bottom + 100,
                    rowGap: 16,
                }}
            >
                <Text style={styles.title}>
                    {t("my_kalba.title")}
                </Text>

                <Animated.View entering={listItemEntering(0)} style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        {t("my_kalba.goal_title")}
                    </Text>
                    <Text style={styles.goalValue}>
                        {goal.monthly_target}
                    </Text>
                    <Text style={styles.subtleLabel}>{t("my_kalba.goal_hint")}</Text>

                    <View style={styles.goalActionsRow}>
                        <Pressable
                            style={styles.roundActionButton}
                            onPress={() => adjustGoal(-1)}
                            accessibilityRole="button"
                            accessibilityLabel={t("my_kalba.a11y_decrease_goal")}
                        >
                            <Ionicons name="remove" size={18} color={colors.primary} />
                        </Pressable>
                        <Pressable
                            style={styles.presetButton}
                            onPress={() => updateGoal.mutate(4)}
                            accessibilityRole="button"
                            accessibilityLabel={t("my_kalba.a11y_set_goal", { value: 4 })}
                        >
                            <Text style={styles.presetText}>4</Text>
                        </Pressable>
                        <Pressable
                            style={styles.presetButton}
                            onPress={() => updateGoal.mutate(8)}
                            accessibilityRole="button"
                            accessibilityLabel={t("my_kalba.a11y_set_goal", { value: 8 })}
                        >
                            <Text style={styles.presetText}>8</Text>
                        </Pressable>
                        <Pressable
                            style={styles.roundActionButton}
                            onPress={() => adjustGoal(1)}
                            accessibilityRole="button"
                            accessibilityLabel={t("my_kalba.a11y_increase_goal")}
                        >
                            <Ionicons name="add" size={18} color={colors.primary} />
                        </Pressable>
                    </View>
                </Animated.View>

                <Animated.View entering={listItemEntering(1)} style={styles.card}>
                    <Text style={styles.sectionTitle}>{t("my_kalba.stats_title")}</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statTile}>
                            <Text style={styles.statValue}>{stats.completed_this_week}</Text>
                            <Text style={styles.statLabel}>{t("my_kalba.this_week")}</Text>
                        </View>
                        <View style={styles.statTile}>
                            <Text style={styles.statValue}>{stats.completed_this_month}</Text>
                            <Text style={styles.statLabel}>{t("my_kalba.this_month")}</Text>
                        </View>
                        <View style={styles.statTile}>
                            <Text style={styles.statValue}>{progress}%</Text>
                            <Text style={styles.statLabel}>{t("my_kalba.goal_progress")}</Text>
                        </View>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                </Animated.View>

                <Animated.View entering={listItemEntering(2)} style={styles.card}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.sectionTitle}>{t("my_kalba.schedule_title")}</Text>
                    </View>
                    {schedule.data.length === 0 ? (
                        <Text style={styles.emptyText}>{t("my_kalba.schedule_empty")}</Text>
                    ) : (
                        schedule.data.map((item) => (
                            <Pressable
                                key={item.id}
                                style={styles.scheduleItem}
                                onPress={() => router.push(`/(app)/workshop/${item.id}`)}
                                accessibilityRole="button"
                                accessibilityLabel={t("my_kalba.a11y_open_workshop", { title: item.title })}
                            >
                                <View style={styles.flex1}>
                                    <Text style={styles.scheduleTitle}>{item.title}</Text>
                                    <Text style={styles.scheduleMeta}>
                                        {formatWeekdayShort(item.start_time)}, {formatMonthDayYear(item.start_time)} · {formatTime(item.start_time)}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
                            </Pressable>
                        ))
                    )}
                </Animated.View>

                <Animated.View entering={listItemEntering(3)} style={styles.card}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.sectionTitle}>
                            {t("my_kalba.notifications_title")}
                        </Text>
                        <Pressable
                            onPress={() => markAllRead.mutate()}
                            accessibilityRole="button"
                            accessibilityLabel={t("my_kalba.a11y_mark_all_read")}
                        >
                            <Text style={styles.markAllText}>
                                {t("my_kalba.mark_all_read")}
                            </Text>
                        </Pressable>
                    </View>

                    <View style={styles.filterRow}>
                        <Pressable
                            onPress={() => setUnreadOnly(true)}
                            style={unreadStyles.container}
                            accessibilityRole="button"
                            accessibilityLabel={t("my_kalba.a11y_filter_unread")}
                        >
                            <Text style={unreadStyles.text}>
                                {t("my_kalba.unread")}
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setUnreadOnly(false)}
                            style={allStyles.container}
                            accessibilityRole="button"
                            accessibilityLabel={t("my_kalba.a11y_filter_all")}
                        >
                            <Text style={allStyles.text}>
                                {t("my_kalba.all")}
                            </Text>
                        </Pressable>
                    </View>

                    {notifications.data.length === 0 ? (
                        <Text style={styles.emptyText}>{t("my_kalba.notifications_empty")}</Text>
                    ) : (
                        notifications.data.map((item) => (
                            <View key={item.id} style={styles.notificationItem}>
                                <View style={styles.flex1}>
                                    <Text style={[styles.notificationTitle, !item.is_read && styles.notificationTitleUnread]}>
                                        {item.title}
                                    </Text>
                                    <Text style={styles.notificationBody}>{item.body}</Text>
                                </View>

                                <View style={styles.notificationActions}>
                                    <Pressable
                                        style={styles.notificationActionButton}
                                        onPress={() => updateRead.mutate({ id: item.id, isRead: !item.is_read })}
                                        accessibilityRole="button"
                                        accessibilityLabel={
                                            item.is_read
                                                ? t("my_kalba.a11y_mark_unread", { title: item.title })
                                                : t("my_kalba.a11y_mark_read", { title: item.title })
                                        }
                                    >
                                        <Ionicons
                                            name={item.is_read ? "mail-open-outline" : "mail-unread-outline"}
                                            size={16}
                                            color={colors.primary}
                                        />
                                    </Pressable>
                                    <Pressable
                                        style={styles.notificationActionButton}
                                        onPress={() => deleteNotification.mutate(item.id)}
                                        accessibilityRole="button"
                                        accessibilityLabel={t("my_kalba.a11y_delete_notification", { title: item.title })}
                                    >
                                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                                    </Pressable>
                                </View>
                            </View>
                        ))
                    )}
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.canvas,
    },
    centeredState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.canvas,
    },
    errorText: {
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.danger,
    },
    title: {
        fontFamily: fonts.displayLight,
        fontSize: 30,
        lineHeight: 40,
        letterSpacing: 0.3,
        color: colors.ink,
        marginBottom: 4,
    },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.lineWhisper,
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 16,
        ...shadows.card,
    },
    sectionTitle: {
        fontFamily: fonts.displayMedium,
        fontSize: 17,
        lineHeight: 24,
        letterSpacing: 0.2,
        color: colors.ink,
    },
    goalValue: {
        marginTop: 8,
        fontFamily: fonts.display,
        fontSize: 48,
        lineHeight: 56,
        color: colors.primary,
    },
    subtleLabel: {
        marginTop: 4,
        fontFamily: fonts.body,
        fontSize: 14,
        lineHeight: 20,
        color: colors.inkMuted,
    },
    goalActionsRow: {
        marginTop: 12,
        flexDirection: "row",
        alignItems: "center",
        columnGap: 10,
    },
    roundActionButton: {
        width: 34,
        height: 34,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    presetButton: {
        minWidth: 34,
        height: 34,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.line,
        alignItems: "center",
        justifyContent: "center",
    },
    presetText: {
        fontFamily: fonts.bodyMedium,
        fontSize: 16,
        lineHeight: 20,
        color: colors.ink,
    },
    statsRow: {
        marginTop: 10,
        flexDirection: "row",
        columnGap: 8,
    },
    statTile: {
        flex: 1,
        borderRadius: 16,
        backgroundColor: colors.canvas,
        paddingHorizontal: 10,
        paddingVertical: 12,
    },
    statValue: {
        fontFamily: fonts.display,
        fontSize: 38,
        lineHeight: 46,
        color: colors.ink,
    },
    statLabel: {
        marginTop: 6,
        fontFamily: fonts.body,
        fontSize: 12,
        lineHeight: 16,
        color: colors.inkMuted,
    },
    progressTrack: {
        marginTop: 10,
        height: 10,
        borderRadius: 999,
        overflow: "hidden",
        backgroundColor: colors.lineWhisper,
    },
    progressFill: {
        height: "100%",
        backgroundColor: colors.primary,
    },
    rowBetween: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    emptyText: {
        marginTop: 10,
        fontFamily: fonts.body,
        fontSize: 13,
        lineHeight: 18,
        color: colors.inkMuted,
    },
    scheduleItem: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.lineWhisper,
        flexDirection: "row",
        alignItems: "center",
        columnGap: 8,
    },
    flex1: {
        flex: 1,
    },
    scheduleTitle: {
        fontFamily: fonts.bodyMedium,
        fontSize: 16,
        lineHeight: 22,
        color: colors.ink,
    },
    scheduleMeta: {
        marginTop: 4,
        fontFamily: fonts.body,
        fontSize: 13,
        lineHeight: 18,
        color: colors.inkMuted,
    },
    markAllText: {
        fontFamily: fonts.bodySemiBold,
        fontSize: 12,
        lineHeight: 16,
        color: colors.primary,
    },
    filterRow: {
        marginTop: 10,
        flexDirection: "row",
        alignItems: "center",
        columnGap: 10,
    },
    filterPill: {
        minHeight: 34,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    filterPillActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryWash,
    },
    filterPillInactive: {
        borderColor: colors.line,
        backgroundColor: "transparent",
    },
    filterPillText: {
        fontSize: 12,
        lineHeight: 16,
    },
    filterPillTextActive: {
        fontFamily: fonts.bodySemiBold,
        color: colors.primary,
    },
    filterPillTextInactive: {
        fontFamily: fonts.bodyMedium,
        color: colors.inkMuted,
    },
    notificationItem: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.lineWhisper,
        flexDirection: "row",
        columnGap: 8,
    },
    notificationTitle: {
        fontFamily: fonts.bodyMedium,
        fontSize: 16,
        lineHeight: 22,
        color: colors.ink,
    },
    notificationTitleUnread: {
        fontFamily: fonts.bodySemiBold,
    },
    notificationBody: {
        marginTop: 4,
        fontFamily: fonts.body,
        fontSize: 12,
        lineHeight: 16,
        color: colors.inkMuted,
    },
    notificationActions: {
        flexDirection: "row",
        alignItems: "center",
        columnGap: 8,
    },
    notificationActionButton: {
        width: 32,
        height: 32,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.canvas,
    },
});
