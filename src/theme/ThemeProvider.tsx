import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

import { useSettingsStore } from "@/store/settings";
import {
  resolveTheme,
  isDarkTheme,
  type ThemePreference,
  type SystemScheme,
} from "@/theme/preference";
import {
  THEMES,
  THEME_NAMES,
  type ThemeName,
  type ThemeColors,
} from "@/theme/themes";

/**
 * Build-time lock policy, extracted for testability: Metro inlines
 * `EXPO_PUBLIC_*` before any module executes, so the value is static per
 * bundle. A present, non-empty name pins that palette and locks the in-app
 * switch (screen-flow galleries, smoke builds); unset/empty leaves runtime
 * switching unlocked.
 *
 * Pure by design: validates the RAW env string against THEME_NAMES here
 * (instead of reading themes/index.ts's already-resolved `themeName`, which
 * would change meaning with the test process's env).
 */
export function resolveBuildLock(raw: string | undefined): ThemeName | null {
  if (raw === undefined || raw.trim() === "") {
    return null;
  }

  const candidate = raw.trim() as ThemeName;

  if (!THEME_NAMES.includes(candidate)) {
    // Fail loud: themes/index.ts resolves the palette independently and has
    // already thrown for the same input by the time this runs in an app
    // build; the check here keeps the lock path self-contained.
    throw new Error(
      `[theme] EXPO_PUBLIC_THEME="${candidate}" is not a registered palette. ` +
        `Registered: ${THEME_NAMES.join(", ")}.`,
    );
  }

  return candidate;
}

const buildLock: ThemeName | null = resolveBuildLock(process.env.EXPO_PUBLIC_THEME);

export type ThemeContextValue = {
  colors: ThemeColors;
  themeName: ThemeName;
  preference: ThemePreference;
  systemScheme: SystemScheme;
  /** False when a build-time lock overrides the preference. */
  canChangeTheme: boolean;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function useThemeState(): ThemeContextValue {
  const locked = buildLock;
  const settings = useSettingsStore((s) => s.settings);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);
  const systemScheme = useColorScheme() as SystemScheme;

  const preference: ThemePreference = locked ?? settings.themePreference;
  const themeName = resolveTheme(preference, systemScheme);
  const colors = THEMES[themeName];

  const setPreference = useCallback(
    (next: ThemePreference) => {
      if (locked) {
        console.warn("[theme] preference locked by build, ignoring change:", next);
        return;
      }

      void setThemePreference(next);
    },
    [locked, setThemePreference],
  );

  /**
   * PR 1 scope cut (review Major #1): the provider RESOLVES and exposes the
   * theme but performs NO native side effects — status bar, SystemUI root
   * background and worklet colour-mirroring land in PR 3, together with the
   * screen migration that makes screens actually consume this context.
   * Until then, acting on the resolution would re-colour only system chrome
   * and desynchronise it from the (still static) app surfaces.
   */
  const value = useMemo(
    () => ({
      colors,
      themeName,
      preference,
      systemScheme,
      canChangeTheme: locked === null,
      setPreference,
    }),
    [colors, themeName, preference, systemScheme, locked, setPreference],
  );

  return value;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const state = useThemeState();

  return (
    <ThemeContext.Provider value={state}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Access the active theme. Throws outside the provider — fail loud, not blank. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);

  if (ctx === null) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return ctx;
}

export { isDarkTheme };