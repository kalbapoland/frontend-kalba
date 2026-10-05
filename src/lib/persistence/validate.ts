import { THEME_NAMES } from "@/theme/themes";
import { defaultSettings, type SettingsSchema } from "./schema";
import { isTestBuild } from "@/lib/buildVariant";

/**
 * Field-level validation of a migrated settings blob. Anything that does not
 * match is replaced with the schema default — a corrupt or partial blob must
 * never crash startup, only degrade to defaults (and be repaired on next
 * persist). No external validation library: the schema surface is tiny and
 * stays typed by `SettingsSchema` (re-exported for convenience).
 */
export type { SettingsSchema };

export function validateSettings(
  input: unknown,
  testMode: boolean = isTestBuild,
): SettingsSchema {
  const defaults = defaultSettings();
  const result: SettingsSchema = { ...defaults, consentsAccepted: [] };

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return result;
  }

  const candidate = input as Record<string, unknown>;

  // v1 stored concrete palette names here too; the v2 switch accepts the two
  // policies only — anything else (or a pre-v2 palette name like "night")
  // degrades to system-following.
  if (candidate.themePreference === "system" || candidate.themePreference === "light") {
    result.themePreference = candidate.themePreference;
  }

  // v2+ dev override: valid registered name or null (no override). Enforced
  // at the STATE layer, not just UI (review Major #1): AsyncStorage survives
  // app replacement, so a device that ran a -test build and set an override
  // would otherwise hydrate it in a production install and get stuck in a
  // palette with no way to clear it (dev section hidden there). `testMode`
  // defaults to the build flag — tests pass it explicitly.
  if (testMode) {
    const override = candidate.devThemeOverride;
    if (
      override === null
      || (typeof override === "string" && (THEME_NAMES as readonly string[]).includes(override))
    ) {
      result.devThemeOverride = override as SettingsSchema["devThemeOverride"];
    }
  }
  // else: production build — the override can never drive resolution.

  if (Array.isArray(candidate.consentsAccepted)) {
    result.consentsAccepted = candidate.consentsAccepted.filter(
      (entry): entry is string => typeof entry === "string",
    );
  }

  return result;
}