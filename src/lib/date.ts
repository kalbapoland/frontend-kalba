/**
 * Date formatting utilities — times are displayed in the viewer's device
 * timezone, formatted in the active i18n language. Polish gives genitive
 * month names ("3 maja"), English gives nominative ("May 3").
 */

import i18n from "./i18n";

// Viewer's local timezone — used for all display functions.
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

function localeTag(): string {
  return i18n.language?.startsWith("pl") ? "pl-PL" : "en-US";
}

export function formatWeekdayShort(iso: string): string {
  return new Date(iso).toLocaleDateString(localeTag(), {
    weekday: "short",
    timeZone: TZ,
  });
}

export function formatWeekdayLong(iso: string): string {
  return new Date(iso).toLocaleDateString(localeTag(), {
    weekday: "long",
    timeZone: TZ,
  });
}

export function formatDay(iso: string): number {
  return Number(
    new Date(iso).toLocaleDateString(localeTag(), {
      day: "numeric",
      timeZone: TZ,
    }),
  );
}

export function formatMonthLong(iso: string): string {
  return new Date(iso).toLocaleDateString(localeTag(), {
    month: "long",
    timeZone: TZ,
  });
}

export function formatMonthDay(iso: string): string {
  return new Date(iso).toLocaleDateString(localeTag(), {
    month: "long",
    day: "numeric",
    timeZone: TZ,
  });
}

export function formatMonthDayYear(iso: string): string {
  return new Date(iso).toLocaleDateString(localeTag(), {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: TZ,
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(localeTag(), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

/**
 * Formats time in a specific IANA timezone, with the short timezone abbreviation.
 * Example: "21:00 PDT"
 */
export function formatTimeWithTZ(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
    timeZoneName: "short",
  });
}
