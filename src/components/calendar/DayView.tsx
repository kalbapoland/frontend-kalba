import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useMemo } from "react";
import { useRouter } from "expo-router";

import type { Workshop } from "@/types/api";
import { colors } from "@/theme/tokens";
import { formatTime } from "@/lib/date";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  HOUR_PX,
  minutesSinceDayStart,
  pxFromMinutes,
  sameDay,
} from "./dateUtils";

type Props = {
  workshops: Workshop[];
  date: Date;
  emptyLabel: string;
};

export function DayView({ workshops, date, emptyLabel }: Props) {
  const router = useRouter();

  const dayEvents = useMemo(
    () =>
      workshops
        .filter((w) => sameDay(new Date(w.start_time), date))
        .sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
        ),
    [workshops, date],
  );

  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) out.push(h);
    return out;
  }, []);

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.grid}>
        {hours.map((h) => (
          <View key={h} style={s.hourRow}>
            <Text style={s.hourLabel}>{String(h).padStart(2, "0")}:00</Text>
            <View style={s.hourLine} />
          </View>
        ))}

        {dayEvents.length === 0 ? (
          <Text style={s.emptyText}>{emptyLabel}</Text>
        ) : (
          dayEvents.map((w) => {
            const start = new Date(w.start_time);
            const top = pxFromMinutes(Math.max(0, minutesSinceDayStart(start)));
            const height = Math.max(28, pxFromMinutes(w.duration_minutes));
            return (
              <Pressable
                key={w.id}
                onPress={() => router.push(`/(app)/workshop/${w.id}`)}
                style={({ pressed }) => [
                  s.event,
                  {
                    top,
                    height,
                    backgroundColor: w.is_owner ? colors.primaryWash : colors.accentSoft,
                    borderLeftColor: w.is_owner ? colors.primary : colors.accent,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={s.eventTitle} numberOfLines={2}>
                  {w.title}
                </Text>
                <Text style={s.eventTime}>
                  {formatTime(w.start_time)} · {w.duration_minutes} min
                </Text>
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const HOUR_LABEL_WIDTH = 56;

const s = StyleSheet.create({
  scroll: { flex: 1 },
  grid: {
    paddingTop: 8,
    paddingHorizontal: 16,
    position: "relative",
  },
  hourRow: {
    height: HOUR_PX,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  hourLabel: {
    width: HOUR_LABEL_WIDTH,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: -6,
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.lineWhisper,
    marginTop: 6,
  },
  event: {
    position: "absolute",
    left: HOUR_LABEL_WIDTH + 16,
    right: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.ink,
  },
  eventTime: {
    fontSize: 11,
    color: colors.inkBody,
    marginTop: 2,
  },
  emptyText: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 13,
    color: colors.inkMuted,
  },
});
