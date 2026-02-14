/**
 * Date formatting utilities — all times displayed in Europe/Warsaw timezone.
 */

const TZ = "Europe/Warsaw";

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

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}
