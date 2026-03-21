const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

type ParseScheduleResult =
  | { ok: true; value: Date }
  | { ok: false; error: string };

export function parseWorkshopSchedule(
  dateInput: string,
  timeInput: string,
): ParseScheduleResult {
  const dateMatch = DATE_PATTERN.exec(dateInput.trim());
  if (!dateMatch) {
    return {
      ok: false,
      error: "Invalid date format. Use YYYY-MM-DD",
    };
  }

  const timeMatch = TIME_PATTERN.exec(timeInput.trim());
  if (!timeMatch) {
    return {
      ok: false,
      error: "Invalid time format. Use HH:MM (24-hour)",
    };
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  if (year < 2024 || year > 2100) {
    return {
      ok: false,
      error: "Year must be between 2024 and 2100",
    };
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));

  // Guard against JS Date rollover (e.g., 2026-02-31 -> 2026-03-03).
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day ||
    utcDate.getUTCHours() !== hours ||
    utcDate.getUTCMinutes() !== minutes
  ) {
    return {
      ok: false,
      error: "Invalid calendar date/time",
    };
  }

  return { ok: true, value: utcDate };
}

export function toUtcDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function toUtcTimeInput(iso: string): string {
  return new Date(iso).toISOString().slice(11, 16);
}
