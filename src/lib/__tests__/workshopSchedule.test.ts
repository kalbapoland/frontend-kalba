import {
    getDeviceTimezone,
    localTimeToUTC,
    toLocalDateInput,
    toLocalTimeInput,
    toUtcDateInput,
    toUtcTimeInput,
} from "../workshopSchedule";

// Fixed ISO timestamps for assertions
const ISO_UTC_NOON = "2026-03-15T12:00:00.000Z"; // 12:00 UTC = 13:00 CET = 04:00 PST

describe("toUtcDateInput / toUtcTimeInput", () => {
    test("extracts UTC date from ISO string", () => {
        expect(toUtcDateInput(ISO_UTC_NOON)).toBe("2026-03-15");
    });

    test("extracts UTC time from ISO string", () => {
        expect(toUtcTimeInput(ISO_UTC_NOON)).toBe("12:00");
    });
});

describe("toLocalDateInput / toLocalTimeInput", () => {
    test("returns date in given IANA timezone (UTC stays same)", () => {
        expect(toLocalDateInput(ISO_UTC_NOON, "UTC")).toBe("2026-03-15");
    });

    test("returns time in UTC", () => {
        expect(toLocalTimeInput(ISO_UTC_NOON, "UTC")).toBe("12:00");
    });

    test("converts to Warsaw time (UTC+1 in March before DST)", () => {
        // March 15 = before DST switch in Europe (last Sunday of March)
        expect(toLocalTimeInput(ISO_UTC_NOON, "Europe/Warsaw")).toBe("13:00");
    });

    test("converts to Los Angeles time (UTC-7 in March after DST)", () => {
        // March 15 is after US DST starts (second Sunday of March) → PDT = UTC-7
        expect(toLocalTimeInput(ISO_UTC_NOON, "America/Los_Angeles")).toBe("05:00");
    });
});

describe("getDeviceTimezone", () => {
    test("returns a non-empty IANA timezone string", () => {
        const tz = getDeviceTimezone();
        expect(typeof tz).toBe("string");
        expect(tz.length).toBeGreaterThan(0);
    });
});

describe("localTimeToUTC", () => {
    test("returns error for invalid date format", () => {
        const result = localTimeToUTC("15/03/2026", "12:00", "UTC");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toMatch(/date/i);
    });

    test("returns error for invalid time format", () => {
        const result = localTimeToUTC("2026-03-15", "25:00", "UTC");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toMatch(/time/i);
    });

    test("converts UTC local time correctly", () => {
        const result = localTimeToUTC("2026-03-15", "12:00", "UTC");
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.toISOString()).toBe("2026-03-15T12:00:00.000Z");
        }
    });

    test("converts Warsaw local time to UTC (UTC+1 in March)", () => {
        // 13:00 Warsaw = 12:00 UTC in March (before DST)
        const result = localTimeToUTC("2026-03-15", "13:00", "Europe/Warsaw");
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.toISOString()).toBe("2026-03-15T12:00:00.000Z");
        }
    });

    test("converts Los Angeles local time to UTC (UTC-7 in March after DST)", () => {
        // March 15 is after US DST starts → PDT = UTC-7; 05:00 PDT = 12:00 UTC
        const result = localTimeToUTC("2026-03-15", "05:00", "America/Los_Angeles");
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.toISOString()).toBe("2026-03-15T12:00:00.000Z");
        }
    });

    test("round-trips: local -> UTC -> local gives same date/time", () => {
        const tz = "Europe/Warsaw";
        const inputDate = "2026-06-20"; // summer time = UTC+2
        const inputTime = "09:30";
        const result = localTimeToUTC(inputDate, inputTime, tz);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(toLocalDateInput(result.value.toISOString(), tz)).toBe(inputDate);
            expect(toLocalTimeInput(result.value.toISOString(), tz)).toBe(inputTime);
        }
    });

    // Regression guard for the original bug: a workshop entered at 17:10 in
    // Warsaw summer time (CEST, UTC+2) must be saved as 15:10 UTC — not 16:10,
    // which is what the removed bare-Date fast path produced on Hermes.
    test("regression: Warsaw 17:10 in summer (CEST) saves as 15:10 UTC", () => {
        const result = localTimeToUTC("2026-06-28", "17:10", "Europe/Warsaw");
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.toISOString()).toBe("2026-06-28T15:10:00.000Z");
        }
    });

    test("regression: Warsaw 17:10 in winter (CET) saves as 16:10 UTC", () => {
        const result = localTimeToUTC("2026-01-15", "17:10", "Europe/Warsaw");
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.toISOString()).toBe("2026-01-15T16:10:00.000Z");
        }
    });

    test("rejects a non-existent local time in the spring-forward DST gap", () => {
        // 2026-03-29 the Warsaw clock jumps 02:00 -> 03:00, so 02:30 never exists.
        const result = localTimeToUTC("2026-03-29", "02:30", "Europe/Warsaw");
        expect(result.ok).toBe(false);
    });

    test("returns error for year out of range", () => {
        const result = localTimeToUTC("2101-01-01", "10:00", "UTC");
        expect(result.ok).toBe(false);
    });
});

describe("toLocalDateInput / toLocalTimeInput — device timezone", () => {
    test("round-trips a UTC instant through the device timezone via Intl", () => {
        // Device-timezone path now goes through the same Intl algorithm as any
        // other zone; assert a full round-trip rather than a specific offset so
        // the test stays independent of the machine's timezone.
        const ISO = "2026-06-20T08:30:00.000Z";
        const tz = getDeviceTimezone();
        const date = toLocalDateInput(ISO, tz);
        const time = toLocalTimeInput(ISO, tz);
        const back = localTimeToUTC(date, time, tz);
        expect(back.ok).toBe(true);
        if (back.ok) {
            expect(back.value.toISOString()).toBe(ISO);
        }
    });
});
