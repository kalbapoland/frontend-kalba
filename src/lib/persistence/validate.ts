import { THEME_NAMES } from "@/theme/themes";
import { defaultSettings, type SettingsSchema } from "./schema";

/**
 * Field-level validation of a migrated settings blob. Anything that does not
 * match is replaced with the schema default — a corrupt or partial blob must
 * never crash startup, only degrade to defaults (and be repaired on next
 * persist). No external validation library: the schema surface is tiny and
 * stays typed by `SettingsSchema` (re-exported for convenience).
 */
export type { SettingsSchema };

export function validateSettings(input: unknown): SettingsSchema {
  const defaults = defaultSettings();
  const result: SettingsSchema = { ...defaults, consentsAccepted: [] };

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return result;
  }

  const candidate = input as Record<string, unknown>;
  const preference = candidate.themePreference;
  const validThemeNames: readonly string[] = [...THEME_NAMES, "system"];

  if (typeof preference === "string" && validThemeNames.includes(preference)) {
    result.themePreference = preference as SettingsSchema["themePreference"];
  }

  if (Array.isArray(candidate.consentsAccepted)) {
    result.consentsAccepted = candidate.consentsAccepted.filter(
      (entry): entry is string => typeof entry === "string",
    );
  }

  return result;
}