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

    test("converts to Los Angeles time (UTC-8 in March)", () => {
        expect(toLocalTimeInput(ISO_UTC_NOON, "America/Los_Angeles")).toBe("04:00");
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

    test("converts Los Angeles local time to UTC (UTC-8 in March)", () => {
        // 04:00 LA = 12:00 UTC in March
        const result = localTimeToUTC("2026-03-15", "04:00", "America/Los_Angeles");
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

    test("handles DST transition — summer time in Warsaw (UTC+2)", () => {
        // 11:00 Warsaw CEST = 09:00 UTC in June
        const result = localTimeToUTC("2026-06-15", "11:00", "Europe/Warsaw");
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.toISOString()).toBe("2026-06-15T09:00:00.000Z");
        }
    });

    test("returns error for year out of range", () => {
        const result = localTimeToUTC("2099-01-01", "10:00", "UTC");
        expect(result.ok).toBe(false);
    });
});
