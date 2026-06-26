import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";

import { useMyWorkshops } from "@/hooks/useMyWorkshops";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  startOfWeek,
} from "@/components/calendar/dateUtils";
import { colors, fonts } from "@/theme/tokens";

type ViewMode = "month" | "week" | "day";

function intlLocale(lng: string): string {
  // i18next stores short codes (`pl`, `en`); Intl is happy with either form,
  // but normalize to the regioned variant so date formatting picks the right
  // calendar conventions (week start, separators).
  if (lng.startsWith("pl")) return "pl-PL";
  return "en-US";
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

function formatRangeTitle(mode: ViewMode, d: Date, locale: string): string {
  const monthLong = new Intl.DateTimeFormat(locale, { month: "long" });
  const monthShort = new Intl.DateTimeFormat(locale, { month: "short" });
  const weekdayLong = new Intl.DateTimeFormat(locale, { weekday: "long" });

  if (mode === "month") {
    return `${capitalize(monthLong.format(d))} ${d.getFullYear()}`;
  }
  if (mode === "week") {
    const s = startOfWeek(d);
    const e = endOfWeek(d);
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()}–${e.getDate()} ${monthLong.format(s)}`;
    }
    return `${s.getDate()} ${monthShort.format(s)} – ${e.getDate()} ${monthShort.format(e)}`;
  }
  return `${capitalize(weekdayLong.format(d))}, ${d.getDate()} ${monthLong.format(d)}`;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const locale = intlLocale(i18n.language);
  const [mode, setMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState<Date>(new Date());

  const { data, isLoading, error } = useMyWorkshops();
  const workshops = data ?? [];

  const title = useMemo(
    () => formatRangeTitle(mode, cursor, locale),
    [mode, cursor, locale],
  );

  const step = (direction: -1 | 1) => {
    if (mode === "month") setCursor((d) => addMonths(d, direction));
    else if (mode === "week") setCursor((d) => addWeeks(d, direction));
    else setCursor((d) => addDays(d, direction));
  };

  const goToToday = () => setCursor(new Date());

  return (
    <View style={s.screen}>
      <LinearGradient
        colors={[colors.canvas, colors.canvasDeep]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <View style={s.headerRow}>
          <Pressable
            testID="calendar.nav.prev"
            onPress={() => step(-1)}
            style={({ pressed }) => [s.iconButton, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Previous"
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <Text testID="calendar.header.title" style={s.title}>{title}</Text>
          <Pressable
            testID="calendar.nav.next"
            onPress={() => step(1)}
            style={({ pressed }) => [s.iconButton, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Next"
          >
            <Ionicons name="chevron-forward" size={22} color={colors.ink} />
          </Pressable>
        </View>

        <Pressable
          testID="calendar.nav.today"
          onPress={goToToday}
          style={({ pressed }) => [s.todayPill, pressed && { opacity: 0.7 }]}
        >
          <Text style={s.todayPillText}>{t("calendar.today")}</Text>
        </Pressable>

        <View style={s.switcher}>
          {(["month", "week", "day"] as const).map((m) => (
            <Pressable
              key={m}
              testID={`calendar.mode.${m}`}
              onPress={() => setMode(m)}
              accessibilityRole="button"
              accessibilityLabel={t(`calendar.${m}`)}
              accessibilityState={{ selected: mode === m }}
              style={[s.switchOption, mode === m && s.switchOptionActive]}
            >
              <Text
                style={[
                  s.switchOptionText,
                  mode === m && s.switchOptionTextActive,
                ]}
              >
                {t(`calendar.${m}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View testID="calendar.content" style={s.content}>
        {isLoading ? (
          <View style={s.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View style={s.centered}>
            <Text style={s.errorText}>{t("calendar.load_error")}</Text>
          </View>
        ) : mode === "month" ? (
          <MonthView
            workshops={workshops}
            selectedDate={cursor}
            onSelectDate={setCursor}
            emptyLabel={t("calendar.no_events")}
          />
        ) : mode === "week" ? (
          <WeekView
            workshops={workshops}
            date={cursor}
            onSelectDay={(d) => {
              setCursor(d);
              setMode("day");
            }}
          />
        ) : (
          <DayView
            workshops={workshops}
            date={cursor}
            emptyLabel={t("calendar.no_events")}
          />
        )}
      </View>

      {/* Legend */}
      <View style={[s.legend, { bottom: insets.bottom + 96 }]} pointerEvents="none">
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={s.legendText}>{t("calendar.legend_owner")}</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={s.legendText}>{t("calendar.legend_enrolled")}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.lineWhisper,
    backgroundColor: "transparent",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: 0.3,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  todayPill: {
    alignSelf: "center",
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  todayPillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  switcher: {
    flexDirection: "row",
    marginTop: 12,
    backgroundColor: colors.lineWhisper,
    borderRadius: 999,
    padding: 3,
  },
  switchOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 999,
  },
  switchOptionActive: {
    backgroundColor: colors.surface,
  },
  switchOptionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkMuted,
  },
  switchOptionTextActive: { fontFamily: fonts.bodySemiBold, color: colors.primary },
  content: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontFamily: fonts.body, fontSize: 14, color: colors.danger },
  legend: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, letterSpacing: 0.3 },
});
