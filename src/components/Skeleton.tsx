import { useEffect } from "react";
import { StyleSheet, View, type DimensionValue } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { radii, cardShadow, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { useThemedStyles } from "@/theme/useThemedStyles";
import type { ThemeColors } from "@/theme/themes";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: object;
}

function buildStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.elementGap,
      backgroundColor: c.surface,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: c.lineWhisper,
      padding: spacing.cardPadding,
      marginBottom: spacing.elementGap,
      ...cardShadow(c),
    },
    cardBody: {
      flex: 1,
      gap: 10,
    },
    list: {
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.sectionGap,
    },
  });
}

/** Soft opacity-pulse placeholder block in canvas tones. */
export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = radii.tag,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    pulse.value = withRepeat(
      withTiming(0.45, { duration: 900 }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: colors.canvasDeep },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Placeholder mirroring the workshop card layout for list loading states. */
export function SkeletonCard() {
  const styles = useThemedStyles(buildStyles);

  return (
    <View style={styles.card}>
      <Skeleton width={56} height={64} borderRadius={radii.input} />
      <View style={styles.cardBody}>
        <Skeleton width="80%" height={18} />
        <Skeleton width="55%" height={13} />
        <Skeleton width="40%" height={13} />
      </View>
    </View>
  );
}

/** Full-screen list of card skeletons, used while a list query loads. */
export function SkeletonList({ count = 4 }: { count?: number }) {
  const styles = useThemedStyles(buildStyles);

  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
