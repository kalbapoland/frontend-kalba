import {
  defaultSettings,
  SETTINGS_VERSION,
  type SettingsSchema,
} from "@/lib/persistence/schema";
import { parseAndMigrate } from "@/lib/persistence/migrate";
import { validateSettings } from "@/lib/persistence/validate";

function blob(settings: Record<string, unknown>, version: number = SETTINGS_VERSION): string {
  return JSON.stringify({ version, settings });
}

describe("parseAndMigrate", () => {
  test("null/corrupt/non-object blobs degrade to defaults (never throw)", () => {
    for (const raw of [null, "", "{not-json", "[]", "42", '"string"', blob({ version: "x" })]) {
      expect(() => parseAndMigrate(raw)).not.toThrow();
      expect(parseAndMigrate(raw)).toEqual(defaultSettings());
    }
  });

  test("missing blob wrapper fields degrade to defaults", () => {
    expect(parseAndMigrate(JSON.stringify({ settings: {} }))).toEqual(defaultSettings());
    expect(parseAndMigrate(JSON.stringify({ version: SETTINGS_VERSION }))).toEqual(defaultSettings());
  });

  test("a valid v1 blob round-trips", () => {
    const settings = { themePreference: "night", consentsAccepted: ["tos_v1"] };
    const result = parseAndMigrate(blob(settings));

    expect(result.themePreference).toBe("night");
    expect(result.consentsAccepted).toEqual(["tos_v1"]);
  });

  test("unknown themePreference falls back to default, valid one is kept", () => {
    expect(parseAndMigrate(blob({ themePreference: "neon-cyberpunk" })).themePreference).toBe(
      defaultSettings().themePreference,
    );
    expect(parseAndMigrate(blob({ themePreference: "system" })).themePreference).toBe("system");
    expect(parseAndMigrate(blob({ themePreference: "warm-deep" })).themePreference).toBe("warm-deep");
  });

  test("non-string consent entries are filtered, not dropped", () => {
    const result = parseAndMigrate(blob({ consentsAccepted: ["tos_v1", 42, null, "privacy_v2"] }));

    expect(result.consentsAccepted).toEqual(["tos_v1", "privacy_v2"]);
  });

  test("blob from a NEWER app version is still parsed (fields validated)", () => {
    const settings = { themePreference: "night", futureField: { a: 1 } };
    const result = parseAndMigrate(blob(settings, SETTINGS_VERSION + 1));

    expect(result.themePreference).toBe("night");
  });

  test("blob from an OLDER app version parses without migration errors", () => {
    const result = parseAndMigrate(blob({ themePreference: "warm-deep" }, 0));

    expect(result.themePreference).toBe("warm-deep");
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