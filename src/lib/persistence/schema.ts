import type { ThemeName } from "@/theme/themes";

/**
 * User-facing settings stored on the device. They are device-wide (not tied
 * to the logged-in account or to a backend URL) and are not secrets — that
 * is why they live in AsyncStorage rather than SecureStore or the auth
 * store's scoped keys. Add a field by extending this interface AND bumping
 * `SETTINGS_VERSION` with a migration in `migrate.ts`.
 */
export interface SettingsSchema {
  /** Selected appearance. `"system"` follows the OS light/dark switch. */
  themePreference: ThemeName | "system";
  /** Consent flags cached from the backend for UX gating only — the legal
   *  record of consents lives server-side. */
  consentsAccepted: string[];
}

export const SETTINGS_VERSION = 1;

/** Factory, not a constant: callers may mutate a working copy safely. */
export function defaultSettings(): SettingsSchema {
  return {
    themePreference: "system",
    consentsAccepted: [],
  };
}