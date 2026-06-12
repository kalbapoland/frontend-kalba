import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useEffect, useMemo } from "react";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Ionicons from "@expo/vector-icons/Ionicons";

import type { Workshop } from "@/types/api";
import { colors, fonts } from "@/theme/tokens";
import { formatTime } from "@/lib/date";
import { sameDay, toISODate } from "./dateUtils";

// react-native-calendars stores locale tables on a module-level singleton.
// Register Polish once at import (the English default is built-in); the
// active locale is then picked at render time based on i18next's language so
// switching languages flips the grid labels.
LocaleConfig.locales["pl"] = {
  monthNames: [
    "Styczeń",
    "Luty",
    "Marzec",
    "Kwiecień",
    "Maj",
    "Czerwiec",
    "Lipiec",
    "Sierpień",
    "Wrzesień",
    "Październik",
    "Listopad",
    "Grudzień",
  ],
  monthNamesShort: [
    "Sty",
    "Lut",
    "Mar",
    "Kwi",
    "Maj",
    "Cze",
    "Lip",
    "Sie",
    "Wrz",
    "Paź",
    "Lis",
    "Gru",
  ],
  dayNames: [
    "Niedziela",
    "Poniedziałek",
    "Wtorek",
    "Środa",
    "Czwartek",
    "Piątek",
    "Sobota",
  ],
  dayNamesShort: ["N", "P", "W", "Ś", "C", "P", "S"],
  today: "Dziś",
};

type Props = {
  workshops: Workshop[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  emptyLabel: string;
};

export function MonthView({ workshops, selectedDate, onSelectDate, emptyLabel }: Props) {
  const router = useRouter();
  const { i18n } = useTranslation();

  // Flip the calendar grid labels (weekday + month) to match the active i18n
  // language. The english locale ships as a default with the library, so we
  // only register PL above.
  useEffect(() => {
    LocaleConfig.defaultLocale = i18n.language.startsWith("pl") ? "pl" : "";
  }, [i18n.language]);

  const markedDates = useMemo(() => {
    const marks: Record<string, { dots: { key: string; color: string }[] }> = {};
    for (const w of workshops) {
      const key = toISODate(new Date(w.start_time));
      if (!marks[key]) marks[key] = { dots: [] };
      const color = w.is_owner ? colors.primary : colors.accent;
      // Keep at most 3 dots per day to avoid clutter.
      if (marks[key].dots.length < 3) {
        marks[key].dots.push({ key: w.id, color });
      }
    }
    const selectedKey = toISODate(selectedDate);
    return {
      ...marks,
      [selectedKey]: {
        ...(marks[selectedKey] ?? { dots: [] }),
        selected: true,
        selectedColor: colors.primary,
      },
    } as Record<string, unknown>;
  }, [workshops, selectedDate]);

  const dayWorkshops = useMemo(
    () =>
      workshops
        .filter((w) => sameDay(new Date(w.start_time), selectedDate))
        .sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
        ),
    [workshops, selectedDate],
  );

  return (
    <View style={s.container}>
      <Calendar
        // react-native-calendars reads `current` only at mount time and then
        // owns the displayed month internally. Since we hid its arrows and
        // the parent screen drives navigation, we need to remount the grid
        // whenever the month changes — keying on the year-month does that.
        key={toISODate(selectedDate).slice(0, 7)}
        current={toISODate(selectedDate)}
        markingType="multi-dot"
        markedDates={markedDates as any}
        onDayPress={(day) => {
          // react-native-calendars returns day-as-numbers in the displayed
          // grid; build a local-midnight Date. All downstream consumers
          // (sameDay, startOfWeek, startOfDay) only care about the calendar
          // day, so the time-of-day component is irrelevant.
          const d = new Date(day.year, day.month - 1, day.day);
          onSelectDate(d);
        }}
        firstDay={1}
        hideArrows
        // The parent screen owns month navigation (header arrows + "Dziś").
        // Hiding the built-in arrows avoids two competing controls that fall
        // out of sync — internal nav changes only the visible month, not the
        // selected day or our cursor.
        renderHeader={() => null}
        theme={{
          calendarBackground: "transparent",
          textSectionTitleColor: colors.inkMuted,
          dayTextColor: colors.ink,
          monthTextColor: colors.ink,
          todayTextColor: colors.primary,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: colors.surface,
          arrowColor: colors.primary,
          textMonthFontWeight: "400",
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 11,
        }}
      />
      <ScrollView
        style={s.dayList}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {dayWorkshops.length === 0 ? (
          <Text style={s.emptyText}>{emptyLabel}</Text>
        ) : (
          dayWorkshops.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => router.push(`/(app)/workshop/${w.id}`)}
              style={({ pressed }) => [
                s.card,
                {
                  borderLeftColor: w.is_owner ? colors.primary : colors.accent,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={s.cardHead}>
                <Text style={s.cardTitle} numberOfLines={1}>
                  {w.title}
                </Text>
                <Text style={s.cardTime}>{formatTime(w.start_time)}</Text>
              </View>
              <View style={s.cardMeta}>
                <Ionicons name="time-outline" size={12} color={colors.inkMuted} />
                <Text style={s.cardMetaText}>{w.duration_minutes} min</Text>
                <Text style={s.cardMetaDot}>·</Text>
                <Ionicons name="people-outline" size={12} color={colors.inkMuted} />
                <Text style={s.cardMetaText}>
                  {w.enrolled_count ?? 0}/{w.max_participants}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  dayList: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  emptyText: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center",
    paddingVertical: 40,
  },
  card: {
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderLeftWidth: 3,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineWhisper,
  },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
    letterSpacing: 0.2,
  },
  cardTime: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  cardMetaText: { fontSize: 12, color: colors.inkMuted },
  cardMetaDot: { fontSize: 12, color: colors.line, marginHorizontal: 2 },
});
