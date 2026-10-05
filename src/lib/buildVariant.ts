/**
 * Whether this build exposes the Profile "Developer options" section.
 *
 * The Android build helper stamps `EXPO_PUBLIC_APP_VARIANT` for EVERY build
 * (`test` or `production`) and Metro inlines it, so the flag is always
 * present and fail-safe: missing/unknown value means production (review
 * Minor #3 — no secondary unvalidated switch exists on purpose).
 */
export const isTestBuild: boolean =
  process.env.EXPO_PUBLIC_APP_VARIANT === "test";