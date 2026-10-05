import { StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { useThemedStyles } from "@/theme/useThemedStyles";
import type { ThemeColors } from "@/theme/themes";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionTestID?: string;
  actionAccessibilityLabel?: string;
}

function buildStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      paddingTop: 48,
      paddingHorizontal: 40,
    },
    iconStage: {
      width: 128,
      height: 128,
      alignItems: "center",
      justifyContent: "center",
    },
    blob: {
      position: "absolute",
      borderRadius: 999,
    },
    blobOuter: {
      width: 128,
      height: 128,
      backgroundColor: c.accentSoft,
      opacity: 0.55,
      transform: [{ translateX: 8 }, { translateY: -6 }],
    },
    blobInner: {
      width: 96,
      height: 96,
      backgroundColor: c.primaryWash,
    },
    title: {
      marginTop: spacing.cardPadding,
      textAlign: "center",
    },
    subtitle: {
      marginTop: 8,
      textAlign: "center",
      maxWidth: 250,
    },
    action: {
      marginTop: 28,
    },
  });
}

/**
 * Shared empty/error state: layered wash circles behind the icon,
 * serif headline, soft subcopy, optional filled CTA.
 */
export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  actionTestID,
  actionAccessibilityLabel,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(buildStyles);

  return (
    <View style={styles.container}>
      <View style={styles.iconStage}>
        <View style={[styles.blob, styles.blobOuter]} />
        <View style={[styles.blob, styles.blobInner]} />
        <Ionicons name={icon} size={34} color={colors.primarySoft} />
      </View>

      <AppText variant="title" tone="body" style={styles.title}>
        {title}
      </AppText>

      {subtitle && (
        <AppText variant="caption" tone="muted" style={styles.subtitle}>
          {subtitle}
        </AppText>
      )}

      {actionLabel && onAction && (
        <View style={styles.action}>
          <Button
            label={actionLabel}
            onPress={onAction}
            testID={actionTestID}
            accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
          />
        </View>
      )}
    </View>
  );
}
