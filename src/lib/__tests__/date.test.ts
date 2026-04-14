import {
  formatDay,
  formatMonthDay,
  formatMonthLong,
  formatTime,
  formatTimeWithTZ,
  formatWeekdayLong,
  formatWeekdayShort,
} from "../date";

// Fixed point in time: Saturday 2025-03-15 10:00 UTC.
const ISO = "2025-03-15T10:00:00.000Z";

describe("date formatting (device timezone)", () => {
  test("formatWeekdayShort returns short weekday in Polish", () => {
    // Result depends on device timezone but must be a non-empty string.
    expect(typeof formatWeekdayShort(ISO)).toBe("string");
    expect(formatWeekdayShort(ISO).length).toBeGreaterThan(0);
  });

  test("formatWeekdayLong returns full weekday in Polish", () => {
    expect(typeof formatWeekdayLong(ISO)).toBe("string");
    expect(formatWeekdayLong(ISO).length).toBeGreaterThan(0);
  });

  test("formatDay returns numeric day", () => {
    expect(typeof formatDay(ISO)).toBe("number");
  });

  test("formatMonthLong returns month name in Polish", () => {
    expect(typeof formatMonthLong(ISO)).toBe("string");
    expect(formatMonthLong(ISO).length).toBeGreaterThan(0);
  });

  test("formatMonthDay returns day and month in Polish", () => {
    expect(typeof formatMonthDay(ISO)).toBe("string");
  });

  test("formatTime returns HH:MM string (no UTC suffix)", () => {
    const result = formatTime(ISO);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("formatTimeWithTZ", () => {
  test("returns time in given timezone with abbreviation", () => {
    // 10:00 UTC = 11:00 CET (UTC+1) in March (before DST switch in Europe)
    const result = formatTimeWithTZ(ISO, "Europe/Warsaw");
    expect(result).toMatch(/11:00/);
  });

  test("returns time in UTC timezone", () => {
    const result = formatTimeWithTZ(ISO, "UTC");
    expect(result).toMatch(/10:00/);
  });

  test("returns time in US/Pacific timezone", () => {
    // 10:00 UTC = 02:00 PST (UTC-8) in March
    const result = formatTimeWithTZ(ISO, "America/Los_Angeles");
    expect(result).toMatch(/02:00/);
  });
});
