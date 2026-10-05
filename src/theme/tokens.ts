import type { TextStyle, ViewStyle } from "react-native";

import fontFamilies from "./fonts.json";
import { colors as activeColors, themeName, type ThemeColors } from "./themes";

/**
 * Colour values live in `src/theme/themes/*.json` — one file per theme, all
 * sharing the same key set. `themes/index.ts` picks the active one from
 * `EXPO_PUBLIC_THEME` at bundle time; `tailwind.config.js` reads the same
 * files so NativeWind classes and these tokens stay in sync.
 *
 * Edit the theme JSON, never the values here.
 */
export const colors = activeColors;

/** Name of the active theme — useful for diagnostics and test assertions. */
export { themeName };

export type { ThemeColors };

export const spacing = {
  screenPadding: 24,
  cardPadding:   20,
  sectionGap:    32,
  elementGap:    16,
  itemGap:       12,
} as const;

export const radii = {
  card:    20,
  button:  999,
  input:   16,
  tag:     10,
} as const;

export const layout = {
  tabBarHeight:     64,
  fabSize:          56,
  touchMinimum:     44,
  headerTopPadding: 12,
} as const;

/**
 * Font families. Loaded in app/_layout.tsx via @expo-google-fonts.
 * Fraunces (warm serif) for display moments, Inter for body text.
 * Shared across themes — typography is not part of the theme switch.
 */
export const fonts: Readonly<typeof fontFamilies> = fontFamilies;

/**
 * Typography scale used by <AppText>. Airy line-heights on purpose —
 * the design language is calm, never cramped.
 */
export const typography = {
  display: {
    fontFamily: fonts.displayLight,
    fontSize: 30,
    lineHeight: 40,
    letterSpacing: 0.3,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: 0.2,
  },
  heading: {
    fontFamily: fonts.displayMedium,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0.1,
  },
  bodyMedium: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0.1,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0.2,
  },
  captionMedium: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0.2,
  },
  overline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
} as const satisfies Record<string, TextStyle>;

/**
 * Soft elevation presets. The presets are **functions of the palette** (PR 3:
 * review Minor #5) — shadow tint follows the active theme's ink, so a night
 * switch does not leave light-theme glow behind translucent cards. The legacy
 * `shadows.card`/`shadows.raised` constants stay for consumers not yet on the
 * runtime pipeline (workshop/call.tsx keeps its own chrome).
 */
export function cardShadow(c: ThemeColors): ViewStyle {
  return {
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  };
}

export function raisedShadow(c: ThemeColors): ViewStyle {
  return {
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  };
}

/** Build-time presets for non-runtime consumers (see note above). */
export const shadows = {
  card: cardShadow(colors),
  raised: raisedShadow(colors),
} as const satisfies Record<string, ViewStyle>;

/** Motion durations (ms) and stagger settings for list entrances. */
export const motion = {
  fast:          150,
  base:          280,
  slow:          450,
  breath:        5200,
  staggerStep:   55,
  staggerMax:    8,
} as const;
