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
