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

/** Returns the IANA timezone of the current device. */
export function getDeviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Returns the date part (YYYY-MM-DD) of an ISO string in the given IANA timezone. */
export function toLocalDateInput(iso: string, timezone: string): string {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Returns the time part (HH:MM) of an ISO string in the given IANA timezone. */
export function toLocalTimeInput(iso: string, timezone: string): string {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour");
  // Some locales return "24" for midnight — normalise to "00"
  return `${hour === "24" ? "00" : hour}:${get("minute")}`;
}

/**
 * Parses a date + time entered in the given IANA timezone and converts it to a
 * UTC Date. This is the timezone-aware replacement for parseWorkshopSchedule.
 */
export function localTimeToUTC(
  dateInput: string,
  timeInput: string,
  timezone: string,
): ParseScheduleResult {
  const dateMatch = DATE_PATTERN.exec(dateInput.trim());
  if (!dateMatch) {
    return { ok: false, error: "Invalid date format. Use YYYY-MM-DD" };
  }

  const timeMatch = TIME_PATTERN.exec(timeInput.trim());
  if (!timeMatch) {
    return { ok: false, error: "Invalid time format. Use HH:MM (24-hour)" };
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  if (year < 2024 || year > 2100) {
    return { ok: false, error: "Year must be between 2024 and 2100" };
  }

  try {
    // Step 1: Treat the local time as UTC to get a reference point.
    const approxUTC = Date.UTC(year, month - 1, day, hours, minutes);
    const approxDate = new Date(approxUTC);

    // Step 2: Format that UTC instant in the target timezone.
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(approxDate);
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? "0");
    const tzH = get("hour");
    const localAsUTCMs = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      tzH === 24 ? 0 : tzH,
      get("minute"),
    );

    // Step 3: offset = localAsUTCMs − approxUTC; result = approxUTC − offset
    const resultDate = new Date(2 * approxUTC - localAsUTCMs);

    // Step 4: Verify the round-trip to guard against invalid/DST-gap times.
    const verifyParts = fmt.formatToParts(resultDate);
    const vget = (type: string) =>
      Number(verifyParts.find((p) => p.type === type)?.value ?? "0");
    const vH = vget("hour");
    if (
      vget("year") !== year ||
      vget("month") !== month ||
      vget("day") !== day ||
      (vH === 24 ? 0 : vH) !== hours ||
      vget("minute") !== minutes
    ) {
      return { ok: false, error: "Invalid calendar date/time" };
    }

    return { ok: true, value: resultDate };
  } catch {
    return { ok: false, error: "Invalid timezone" };
  }
}
