import defaultTheme from "./default.json";
import nightTheme from "./night.json";
import themeRegistry from "./registry.json";
import warmDeepTheme from "./warm-deep.json";

/**
 * Theme registry. Every entry must expose the exact same colour keys —
 * `themes.test.ts` enforces that, because a key present in one theme and
 * missing in another would resolve to `undefined` and silently drop a style
 * (React Native treats `undefined` as "not set", not as an error).
 *
 * Add a theme by dropping a JSON file next to this one and registering it
 * in `registry.json` and adding its static import below. The Android build
 * preflight and `tailwind.config.js` read the same registry.
 */
export type ThemeName = keyof typeof themeRegistry;

export type ThemeColors = Readonly<typeof defaultTheme.colors>;

export const THEMES: Record<ThemeName, ThemeColors> = {
  default: defaultTheme.colors,
  "warm-deep": warmDeepTheme.colors,
  night: nightTheme.colors,
};

export const DEFAULT_THEME: ThemeName = "default";

export const THEME_NAMES = Object.keys(themeRegistry) as ThemeName[];

/**
 * Resolves the active theme from `EXPO_PUBLIC_THEME`.
 *
 * Metro inlines `EXPO_PUBLIC_*` at bundle time, so this is a build-time
 * switch: changing the theme requires a rebuild. That is deliberate for the
 * evaluation phase — it keeps the 19 module-level `StyleSheet.create` blocks
 * working, since they capture `colors` at import time.
 *
 * An unknown name throws instead of falling back, so a typo in a build script
 * fails the build rather than shipping the wrong palette.
 */
export function resolveThemeName(raw: string | undefined): ThemeName {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_THEME;
  }

  const name = raw.trim();

  if (!Object.prototype.hasOwnProperty.call(themeRegistry, name)) {
    throw new Error(
      `Unknown theme "${name}". Expected one of: ${THEME_NAMES.join(", ")}. ` +
        "Set EXPO_PUBLIC_THEME to a registered theme name.",
    );
  }

  return name as ThemeName;
}

export const themeName: ThemeName = resolveThemeName(
  process.env.EXPO_PUBLIC_THEME,
);

/**
 * Active palette. `Readonly<...>` restores the immutability that the previous
 * inline `as const` literals provided — JSON imports infer mutable `string`.
 */
export const colors: ThemeColors = THEMES[themeName];
