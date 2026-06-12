import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { colors, fonts, radii } from "@/theme/tokens";

interface DateBlockProps {
  /** Short weekday, e.g. "Wed". */
  weekday: string;
  /** Day of month, e.g. "14". */
  day: string | number;
}

/** Stacked weekday/day square in a soft sage wash — card date anchor. */
export function DateBlock({ weekday, day }: DateBlockProps) {
  return (
    <View style={styles.block}>
      <AppText variant="overline" style={styles.weekday}>
        {weekday}
      </AppText>
      <AppText style={styles.day}>{day}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    width: 56,
    height: 64,
    borderRadius: radii.input,
    backgroundColor: colors.primaryWash,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  weekday: {
    color: colors.primarySoft,
    letterSpacing: 1.2,
  },
  day: {
    fontFamily: fonts.displayMedium,
    fontSize: 22,
    lineHeight: 26,
    color: colors.primary,
  },
});
