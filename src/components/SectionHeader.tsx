import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { colors } from "@/theme/tokens";

interface SectionHeaderProps {
  label: string;
  testID?: string;
}

/** Uppercase overline label with a short sage accent underline. */
export function SectionHeader({ label, testID }: SectionHeaderProps) {
  return (
    <View style={styles.container} testID={testID}>
      <AppText variant="overline" tone="muted">
        {label}
      </AppText>
      <View style={styles.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  accent: {
    width: 24,
    height: 1.5,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
});
