/**
 * Date formatting utilities — times are displayed in the viewer's device timezone.
 */

// Viewer's local timezone — used for all display functions.
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function formatWeekdayShort(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    weekday: "short",
    timeZone: TZ,
  });
}

export function formatWeekdayLong(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    weekday: "long",
    timeZone: TZ,
  });
}

export function formatDay(iso: string): number {
  return Number(
    new Date(iso).toLocaleDateString("pl-PL", {
      day: "numeric",
      timeZone: TZ,
    }),
  );
}

export function formatMonthLong(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    month: "long",
    timeZone: TZ,
  });
}

export function formatMonthDay(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    month: "long",
    day: "numeric",
    timeZone: TZ,
  });
}

export function formatMonthDayYear(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: TZ,
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pl-PL", {
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
