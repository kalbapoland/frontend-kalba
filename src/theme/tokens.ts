import type { TextStyle, ViewStyle } from "react-native";

export const colors = {
  canvas:        "#F5F1EB",
  canvasDeep:    "#EDE8E0",
  surface:       "#FAF8F4",
  elevated:      "#FFFFFF",

  primary:       "#566B52",
  primarySoft:   "#8A9A7E",
  primaryWash:   "#E8EDE5",

  accent:        "#B8877A",
  accentSoft:    "#F2E4DE",

  ink:           "#2E2E2B",
  inkBody:       "#57564F",
  inkMuted:      "#8C8A82",

  line:          "#DDD9D1",
  lineWhisper:   "#EDE9E2",

  danger:        "#C4836E",
  dangerWash:    "#F8EDE8",
} as const;

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
 */
export const fonts = {
  displayLight:  "Fraunces_300Light",
  display:       "Fraunces_400Regular",
  displayMedium: "Fraunces_500Medium",
  body:          "Inter_400Regular",
  bodyMedium:    "Inter_500Medium",
  bodySemiBold:  "Inter_600SemiBold",
} as const;

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

/** Soft elevation presets — low opacity, large radius. */
export const shadows = {
  card: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  raised: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
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
