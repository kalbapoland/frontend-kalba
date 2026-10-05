import {
  DEFAULT_THEME,
  type ThemeName,
} from "@/theme/themes";

/** What the user picked — or a signal to follow the OS. */
export type ThemePreference = ThemeName | "system";

export type SystemScheme = "light" | "dark" | null;

/**
 * Pure resolution of the active theme from user preference and the OS scheme.
 * Kept free of side effects and React so the full matrix is testable in one
 * place.
 *
 * Mapping decision: system light → `default`, system dark → `night`.
 * `warm-deep` is a deliberate manual choice only.
 */
export function resolveTheme(
  preference: ThemePreference,
  systemScheme: SystemScheme,
): ThemeName {
  if (preference !== "system") {
    return preference;
  }

  return systemScheme === "dark" ? "night" : DEFAULT_THEME;
}

/**
 * "system" is a RESERVED preference sentinel — see comment on isDarkTheme.
 * OS dark maps to the night palette; that mapping and isDarkTheme must use
 * the same definition of "dark palette".
 */
export function isDarkTheme(name: ThemeName): boolean {
  return name === "night";
}