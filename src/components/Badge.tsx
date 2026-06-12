import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { colors, radii } from "@/theme/tokens";

type Tone = "primary" | "accent" | "neutral" | "danger";

const TONES: Record<Tone, { background: string; text: string }> = {
  primary: { background: colors.primaryWash, text: colors.primary },
  accent: { background: colors.accentSoft, text: colors.accent },
  neutral: { background: colors.canvasDeep, text: colors.inkBody },
  danger: { background: colors.dangerWash, text: colors.danger },
};

interface BadgeProps {
  label: string;
  tone?: Tone;
  testID?: string;
}

/** Soft wash pill for prices, statuses, and tags. */
export function Badge({ label, tone = "primary", testID }: BadgeProps) {
  const palette = TONES[tone];

  return (
    <View
      style={[styles.badge, { backgroundColor: palette.background }]}
      testID={testID}
    >
      <AppText variant="captionMedium" style={{ color: palette.text }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.tag,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
});
