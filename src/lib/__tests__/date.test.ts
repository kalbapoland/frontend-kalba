import {
  formatDay,
  formatMonthDay,
  formatMonthLong,
  formatTime,
  formatWeekdayLong,
  formatWeekdayShort,
} from "../date";

// Fixed point in time: Saturday 2025-03-15 10:00 UTC.
const ISO = "2025-03-15T10:00:00.000Z";

describe("date formatting (UTC timezone)", () => {
  test("formatWeekdayShort returns short weekday in Polish", () => {
    expect(formatWeekdayShort(ISO)).toBe("sob.");
  });

  test("formatWeekdayLong returns full weekday in Polish", () => {
    expect(formatWeekdayLong(ISO)).toBe("sobota");
  });

  test("formatDay returns numeric day", () => {
    expect(formatDay(ISO)).toBe(15);
  });

  test("formatMonthLong returns month name in Polish", () => {
    expect(formatMonthLong(ISO)).toBe("marzec");
  });

  test("formatMonthDay returns day and month in Polish", () => {
    expect(formatMonthDay(ISO)).toBe("15 marca");
  });

  test("formatTime returns HH:MM UTC", () => {
    expect(formatTime(ISO)).toBe("10:00 UTC");
  });
});
