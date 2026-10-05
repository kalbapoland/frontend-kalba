import {
  defaultSettings,
  SETTINGS_VERSION,
  type SettingsSchema,
} from "@/lib/persistence/schema";
import { parseAndMigrate } from "@/lib/persistence/migrate";
import { validateSettings } from "@/lib/persistence/validate";

/**
 * These tests exercise the validation contract itself, not the build flag:
 * `testMode: true` reflects the TEST build the dev override belongs to. The
 * production-behaviour case (override dropped) is asserted explicitly in the
 * settings store suite via the same parameter.
 */
const TEST_BUILD = true;

function blob(settings: Record<string, unknown>, version: number = SETTINGS_VERSION): string {
  return JSON.stringify({ version, settings });
}

/** Migration with an explicit test-build mode. */
function migrateTest(raw: string | null, version?: number) {
  return parseAndMigrate(raw, version, TEST_BUILD);
}

describe("parseAndMigrate", () => {
  test("null/corrupt/non-object blobs degrade to defaults (never throw)", () => {
    for (const raw of [null, "", "{not-json", "[]", "42", '"string"', blob({ version: "x" })]) {
      expect(() => migrateTest(raw)).not.toThrow();
      expect(migrateTest(raw)).toEqual(defaultSettings());
    }
  });

  test("missing blob wrapper fields degrade to defaults", () => {
    expect(migrateTest(JSON.stringify({ settings: {} }))).toEqual(defaultSettings());
    expect(migrateTest(JSON.stringify({ version: SETTINGS_VERSION }))).toEqual(defaultSettings());
  });

  test("a valid v2 blob round-trips (dev override + consents)", () => {
    const settings = { themePreference: "system", devThemeOverride: "night", consentsAccepted: ["tos_v1"] };
    const result = migrateTest(blob(settings));

    expect(result.themePreference).toBe("system");
    expect(result.devThemeOverride).toBe("night");
    expect(result.consentsAccepted).toEqual(["tos_v1"]);
  });

  test("unknown devThemeOverride falls back to null, valid one is kept", () => {
    expect(migrateTest(blob({ devThemeOverride: "neon-cyberpunk" })).devThemeOverride).toBeNull();
    expect(migrateTest(blob({ devThemeOverride: "system" })).devThemeOverride).toBeNull();
    expect(migrateTest(blob({ devThemeOverride: "warm-deep" })).devThemeOverride).toBe("warm-deep");
    expect(migrateTest(blob({ devThemeOverride: null })).devThemeOverride).toBeNull();
  });

  test("non-string consent entries are filtered, not dropped", () => {
    const result = migrateTest(blob({ consentsAccepted: ["tos_v1", 42, null, "privacy_v2"] }));

    expect(result.consentsAccepted).toEqual(["tos_v1", "privacy_v2"]);
  });

  test("blob from a NEWER app version is still parsed (fields validated)", () => {
    const settings = { themePreference: "system", devThemeOverride: "night", futureField: { a: 1 } };
    const result = migrateTest(blob(settings, SETTINGS_VERSION + 1));

    expect(result.devThemeOverride).toBe("night");
  });

  test("blob from an OLDER app version parses without migration errors", () => {
    const result = migrateTest(blob({ themePreference: "light" }, 0));

    expect(result.themePreference).toBe("light");
    expect(result.devThemeOverride).toBeNull();
  });

  test("invalid devThemeOverride type degrades to null", () => {
    for (const bad of [5, true, ["night"], { themePreference: "night" }]) {
      expect(migrateTest(blob({ devThemeOverride: bad })).devThemeOverride).toBeNull();
    }
  });

  test("validateSettings on garbage returns clean defaults", () => {
    for (const input of [undefined, null, true, 5, "x", [], { themePreference: 7 }]) {
      const result = validateSettings(input);
      expect(result.themePreference).toBe(defaultSettings().themePreference);
      expect(result.consentsAccepted).toEqual([]);
    }
  });

  test("validateSettings never returns the caller's object (no aliasing)", () => {
    const input = { themePreference: "night", consentsAccepted: ["a"] };
    const result = validateSettings(input);

    expect(result).not.toBe(input as unknown as SettingsSchema);
  });
});