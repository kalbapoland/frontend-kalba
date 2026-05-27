import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useMemo } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import type { Workshop } from "@/types/api";
import { colors } from "@/theme/tokens";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  HOUR_PX,
  addDays,
  minutesSinceDayStart,
  pxFromMinutes,
  sameDay,
  startOfWeek,
} from "./dateUtils";

const HOUR_LABEL_WIDTH = 44;

type Props = {
  workshops: Workshop[];
  date: Date;
  onSelectDay: (d: Date) => void;
};

export function WeekView({ workshops, date, onSelectDay }: Props) {
  const router = useRouter();
  const { i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const columnWidth = (width - 32 - HOUR_LABEL_WIDTH) / 7;

  const weekStart = useMemo(() => startOfWeek(date), [date]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const today = new Date();
  // Locale-aware weekday header (e.g. "pon" / "Mon"). The Intl formatter is
  // cheap to construct, but cache it so re-renders during scroll stay tight.
  const weekdayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language.startsWith("pl") ? "pl-PL" : "en-US", {
        weekday: "short",
      }),
    [i18n.language],
  );

  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) out.push(h);
    return out;
  }, []);

  const byDay = useMemo(() => {
    const map: Workshop[][] = days.map(() => []);
    for (const w of workshops) {
      const start = new Date(w.start_time);
      const idx = days.findIndex((d) => sameDay(d, start));
      if (idx >= 0) map[idx].push(w);
    }
    return map;
  }, [workshops, days]);

  return (
    <View style={s.container}>
      {/* Day header strip */}
      <View style={[s.header, { paddingLeft: HOUR_LABEL_WIDTH + 16 }]}>
        {days.map((d, i) => {
          const isToday = sameDay(d, today);
          return (
            <Pressable
              key={i}
              onPress={() => onSelectDay(d)}
              style={[s.dayHeader, { width: columnWidth }]}
            >
              <Text style={[s.dayWeekday, isToday && { color: colors.primary }]}>
                {weekdayFormatter.format(d)}
              </Text>
              <View
                style={[
                  s.dayNumberPill,
                  isToday && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    s.dayNumber,
                    isToday && { color: colors.surface, fontWeight: "600" },
                  ]}
                >
                  {d.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.grid}>
          {/* Hour rows + horizontal lines */}
          {hours.map((h) => (
            <View key={h} style={s.hourRow}>
              <Text style={s.hourLabel}>{String(h).padStart(2, "0")}</Text>
              <View style={s.hourLine} />
            </View>
          ))}

          {/* Vertical column separators */}
          {days.map((_, i) => (
            <View
              key={i}
              style={[
                s.columnDivider,
                {
                  left: HOUR_LABEL_WIDTH + 16 + columnWidth * i,
                },
              ]}
            />
          ))}

          {/* Events */}
          {byDay.map((events, dayIdx) =>
            events.map((w) => {
              const start = new Date(w.start_time);
              const top = pxFromMinutes(Math.max(0, minutesSinceDayStart(start)));
              const height = Math.max(24, pxFromMinutes(w.duration_minutes));
              return (
                <Pressable
                  key={w.id}
                  onPress={() => router.push(`/(app)/workshop/${w.id}`)}
                  style={({ pressed }) => [
                    s.event,
                    {
                      top,
                      height,
                      left: HOUR_LABEL_WIDTH + 16 + columnWidth * dayIdx + 2,
                      width: columnWidth - 4,
                      backgroundColor: w.is_owner
                        ? colors.primaryWash
                        : colors.accentSoft,
                      borderLeftColor: w.is_owner ? colors.primary : colors.accent,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={s.eventTitle} numberOfLines={2}>
                    {w.title}
                  </Text>
                </Pressable>
              );
            }),
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineWhisper,
  },
  dayHeader: { alignItems: "center", gap: 4 },
  dayWeekday: {
    fontSize: 10,
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayNumberPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: { fontSize: 14, color: colors.ink },
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
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: -4,
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.lineWhisper,
    marginTop: 6,
  },
  columnDivider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.lineWhisper,
  },
  event: {
    position: "absolute",
    borderRadius: 8,
    borderLeftWidth: 2,
    paddingHorizontal: 4,
    paddingVertical: 3,
    overflow: "hidden",
  },
  eventTitle: { fontSize: 11, fontWeight: "500", color: colors.ink },
});
