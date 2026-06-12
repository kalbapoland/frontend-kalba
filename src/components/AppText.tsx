import { Text, type TextProps } from "react-native";

import { colors, typography } from "@/theme/tokens";

type Variant = keyof typeof typography;

type Tone =
  | "ink"
  | "body"
  | "muted"
  | "primary"
  | "accent"
  | "danger"
  | "inverse";

const TONE_COLORS: Record<Tone, string> = {
  ink: colors.ink,
  body: colors.inkBody,
  muted: colors.inkMuted,
  primary: colors.primary,
  accent: colors.accent,
  danger: colors.danger,
  inverse: colors.elevated,
};

interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
}

/**
 * Single source of typography. Fraunces for display/title/heading moments,
 * Inter for body and below — see typography scale in src/theme/tokens.ts.
 */
export function AppText({
  variant = "body",
  tone = "ink",
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      style={[typography[variant], { color: TONE_COLORS[tone] }, style]}
      {...rest}
    />
  );
}
