import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useThemedStyles } from "@/theme/useThemedStyles";
import type { ThemeColors } from "@/theme/themes";

interface SectionHeaderProps {
  label: string;
  testID?: string;
}

function buildStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 8,
    },
    accent: {
      width: 24,
      height: 1.5,
      backgroundColor: c.primary,
      borderRadius: 1,
    },
  });
}

/** Uppercase overline label with a short sage accent underline. */
export function SectionHeader({ label, testID }: SectionHeaderProps) {
  const styles = useThemedStyles(buildStyles);

  return (
    <View style={styles.container} testID={testID}>
      <AppText variant="overline" tone="muted">
        {label}
      </AppText>
      <View style={styles.accent} />
    </View>
  );
}
