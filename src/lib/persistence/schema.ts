import type { ThemeName } from "@/theme/themes";

/**
 * User-facing settings stored on the device. They are device-wide (not tied
 * to the logged-in account or to a backend URL) and are not secrets — that
 * is why they live in AsyncStorage rather than SecureStore or the auth
 * store's scoped keys.
 *
 * v2: adds `devThemeOverride` — a TEST-build-only palette override managed by
 * Profile → Developer options (null = respect themePreference). Production
 * builds never render that UI, so the field stays null there forever.
 */
export interface SettingsSchema {
  /** Appearance switch: "system" follows the OS; "light" pins light mode. */
  themePreference: "system" | "light";
  /** TEST builds only: concrete palette overriding the appearance switch. */
  devThemeOverride: ThemeName | null;
  /** Consent flags cached from the backend for UX gating only — the legal
   *  record of consents lives server-side. */
  consentsAccepted: string[];
}

export const SETTINGS_VERSION = 2;

/** Factory, not a constant: callers may mutate a working copy safely. */
export function defaultSettings(): SettingsSchema {
  return {
    themePreference: "system",
    devThemeOverride: null,
    consentsAccepted: [],
  };
}