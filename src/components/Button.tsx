import { ActivityIndicator, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/PressableScale";
import { layout, radii } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { useThemedStyles } from "@/theme/useThemedStyles";
import type { ThemeColors } from "@/theme/themes";

type Variant = "primary" | "secondary" | "ghost" | "danger";

/** Zero-allocation variant lookup (palette key, not value) — see AppText. */
const TEXT_COLOR_KEYS: Record<Variant, keyof ThemeColors> = {
  primary: "elevated",
  secondary: "primary",
  ghost: "inkBody",
  danger: "danger",
};

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

function buildStyles(c: ThemeColors) {
  return StyleSheet.create({
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
      backgroundColor: c.primary,
    },
    secondary: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: c.primary,
    },
    ghost: {
      backgroundColor: "transparent",
    },
    danger: {
      backgroundColor: c.dangerWash,
    },
    inactive: {
      opacity: 0.5,
    },
  });
}

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
  const { colors } = useTheme();
  const styles = useThemedStyles(buildStyles);
  const inactive = disabled || loading;
  const textColor = colors[TEXT_COLOR_KEYS[variant]];

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