import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { radii } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeColors } from "@/theme/themes";

type Tone = "primary" | "accent" | "neutral" | "danger";

/** Zero-allocation tone lookup (palette key, not value) — see AppText. */
const TONE_KEYS: Record<Tone, { background: keyof ThemeColors; text: keyof ThemeColors }> = {
  primary: { background: "primaryWash", text: "primary" },
  accent: { background: "accentSoft", text: "accent" },
  neutral: { background: "canvasDeep", text: "inkBody" },
  danger: { background: "dangerWash", text: "danger" },
};

interface BadgeProps {
  label: string;
  tone?: Tone;
  testID?: string;
}

/** Soft wash pill for prices, statuses, and tags. */
export function Badge({ label, tone = "primary", testID }: BadgeProps) {
  const { colors } = useTheme();
  const keys = TONE_KEYS[tone];

  return (
    <View
      style={[styles.badge, { backgroundColor: colors[keys.background] }]}
      testID={testID}
    >
      <AppText variant="captionMedium" style={{ color: colors[keys.text] }}>
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
