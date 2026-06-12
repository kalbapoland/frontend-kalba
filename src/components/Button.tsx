import { ActivityIndicator, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/PressableScale";
import { colors, layout, radii } from "@/theme/tokens";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to the container width. */
  fullWidth?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

const TEXT_COLORS: Record<Variant, string> = {
  primary: colors.elevated,
  secondary: colors.primary,
  ghost: colors.inkBody,
  danger: colors.danger,
};

/**
 * Pill button with pressed-scale + light haptic. Variants:
 * primary (filled sage), secondary (sage outline), ghost (borderless),
 * danger (terracotta outline).
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const inactive = disabled || loading;
  const textColor = TEXT_COLORS[variant];

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      haptic
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      style={[
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={17} color={textColor} />}
          <AppText
            variant="bodyMedium"
            style={[styles.label, { color: textColor }]}
          >
            {label}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.touchMinimum + 6,
    borderRadius: radii.button,
    paddingHorizontal: 28,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    letterSpacing: 0.4,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: colors.dangerWash,
  },
  inactive: {
    opacity: 0.5,
  },
});
