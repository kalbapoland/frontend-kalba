import { Text, type TextProps } from "react-native";

import { typography } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeColors } from "@/theme/themes";

type Variant = keyof typeof typography;

type Tone =
  | "ink"
  | "body"
  | "muted"
  | "primary"
  | "accent"
  | "danger"
  | "inverse";

/**
 * Tone → palette key lookup (module constant, zero per-render allocation —
 * review Minor #4): indexing `colors[key]` stays theme-reactive because
 * `colors` comes from the context, but no map object is built per render.
 */
const TONE_KEYS: Record<Tone, keyof ThemeColors> = {
  ink: "ink",
  body: "inkBody",
  muted: "inkMuted",
  primary: "primary",
  accent: "accent",
  danger: "danger",
  inverse: "elevated",
};

interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
}

/**
 * Single source of typography. Fraunces for display/title/heading moments,
 * Inter for body and below — see typography scale in src/theme/tokens.ts.
 * Tone colours resolve from the active theme at render time.
 */
export function AppText({
  variant = "body",
  tone = "ink",
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();

  return (
    <Text
      style={[typography[variant], { color: colors[TONE_KEYS[tone]] }, style]}
      {...rest}
    />
  );
}
