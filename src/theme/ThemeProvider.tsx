import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { makeMutable, type SharedValue } from "react-native-reanimated";

import { useSettingsStore } from "@/store/settings";
import {
  resolveTheme,
  isDarkTheme,
  type ThemePreference,
  type ThemeSelection,
  type SystemScheme,
} from "@/theme/preference";
import type { ThemeName } from "@/theme/themes";
import {
  THEMES,
  DEFAULT_THEME,
  THEME_NAMES,
  type ThemeColors,
} from "@/theme/themes";
import { isTestBuild as buildIsTest } from "@/lib/buildVariant";

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
  /** Appearance switch value (Profile): "system" | "light". */
  appearancePolicy: ThemePreference;
  /** Effective selection for display: lock > override > switch value. */
  preference: ThemeSelection;
  systemScheme: SystemScheme;
  /** True when the resolved appearance follows the OS (no lock/override). */
  systemFollowing: boolean;
  /** TEST builds only: developer options section visibility. */
  isTestBuild: boolean;
  /** False when a build-time lock overrides the preference. */
  canChangeTheme: boolean;
  setPreference: (preference: ThemePreference) => void;
  /** Developer options: concrete palette override (ignored on locked builds). */
  setDevOverride: (theme: ThemeName | null) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Shared value mirroring the active palette for Reanimated worklets —
 * worklets cannot observe React context, so colour consumers (BreathingCircle,
 * FloatingTabBar) read backgrounds from here.
 *
 * Created with `makeMutable` (Reanimated's public non-hook factory, review
 * Major #1): a plain `{ value }` object would be cloned ONCE into the UI
 * runtime and never updated — worklets would pin the default palette forever.
 * A real shared value flows through the serializable cache as a live input,
 * so `useDerivedValue(() => themeColorsSV.value)` re-fires on every change.
 */
export const themeColorsSV: SharedValue<ThemeColors> =
  makeMutable<ThemeColors>(THEMES[DEFAULT_THEME]);

function useThemeState(): ThemeContextValue {
  const locked = buildLock;
  const settings = useSettingsStore((s) => s.settings);
  const setFollowSystem = useSettingsStore((s) => s.setFollowSystem);
  const setDevThemeOverride = useSettingsStore((s) => s.setDevThemeOverride);
  const systemScheme = useColorScheme() as SystemScheme;

  // Lock (build-time) > dev override (test builds) > appearance switch.
  const appearancePolicy: ThemePreference = settings.themePreference;
  const activeOverride: ThemeName | null = locked ?? settings.devThemeOverride;
  const preference: ThemeSelection = activeOverride ?? appearancePolicy;
  const themeName = resolveTheme(preference, systemScheme);
  const colors = THEMES[themeName];

  /** Appearance switch from Profile: ON = follow system, OFF = light. */
  const setPreference = useCallback(
    (next: ThemePreference) => {
      if (locked) {
        console.warn("[theme] preference locked by build, ignoring change:", next);
        return;
      }

      void setFollowSystem(next === "system");
    },
    [locked, setFollowSystem],
  );

  /** Developer options: set/clear the palette override (test builds). */
  const setDevOverride = useCallback(
    (theme: ThemeName | null) => {
      if (locked) {
        console.warn("[theme] preference locked by build, ignoring dev override:", theme);
        return;
      }

      void setDevThemeOverride(theme);
    },
    [locked, setDevThemeOverride],
  );

  /**
   * Worklet colour-mirror sync (consumed by BreathingCircle and
   * FloatingTabBar) + native chrome effects (PR 3):
   * status-bar text flip and the SystemUI root window background follow the
   * resolved palette. One effect keeps light/dark transitions atomic.
   */
  const dark = isDarkTheme(themeName);
  useEffect(() => {
    themeColorsSV.value = colors;
    void SystemUI.setBackgroundColorAsync(colors.canvas).catch((error) => {
      console.warn("[theme] native background update failed:", error);
    });
  }, [colors, dark]);

  const systemFollowing = locked === null && settings.devThemeOverride === null && settings.themePreference === "system";

  const value = useMemo(
    () => ({
      colors,
      themeName,
      appearancePolicy,
      preference,
      systemScheme,
      systemFollowing,
      isTestBuild: buildIsTest,
      canChangeTheme: locked === null,
      setPreference,
      setDevOverride,
    }),
    [
      colors,
      themeName,
      appearancePolicy,
      preference,
      systemScheme,
      systemFollowing,
      locked,
      setPreference,
      setDevOverride,
    ],
  );

  return value;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const state = useThemeState();

  return (
    <ThemeContext.Provider value={state}>
      {/* Status-bar text follows the palette; the effect above covers the
          root-window background so the pair stays atomic. */}
      <StatusBar style={isDarkTheme(state.themeName) ? "light" : "dark"} />
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

export { isDarkTheme, resolveTheme };
export type { ThemePreference } from "@/theme/preference";