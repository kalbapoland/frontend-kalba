import {
  DEFAULT_THEME,
  type ThemeName,
} from "@/theme/themes";

/**
 * Resolved appearance policy:
 * - `"system"` — switch ON: follow the OS light/dark toggle.
 * - `"light"` — switch OFF: always the light (default) palette.
 *
 * A dev override (test builds) layers above this; the "system" sentinel is
 * reserved and can never be a registered palette name (parity-tested).
 */
export type ThemePreference = "system" | "light";

export type SystemScheme = "light" | "dark" | null;

/**
 * Pure resolution of the active theme. Kept free of side effects and React
 * so the full matrix is testable in one place.
 *
 * `selection` (after lock and dev override in the provider) may be:
 * - a concrete ThemeName → pinned,
 * - `"system"` → OS dark → `night`, light-or-unknown → `default`
 * - `"light"` → always the light (default) palette.
 */
export type ThemeSelection = ThemeName | "system" | "light";

export function resolveTheme(
  selection: ThemeSelection,
  systemScheme: SystemScheme,
): ThemeName {
  if (selection !== "system" && selection !== "light") {
    return selection;
  }

  if (selection === "light") {
    return DEFAULT_THEME;
  }

  return systemScheme === "dark" ? "night" : DEFAULT_THEME;
}

/**
 * Single source of "which palettes render dark chrome". Used by the OS
 * mapping above and by native chrome consumers (status bar, blur tint), so a
 * second dark palette never silently misses a flip.
 */
export function isDarkTheme(name: ThemeName): boolean {
  return name === "night";
}