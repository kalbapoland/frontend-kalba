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

import { colors, radii, shadows, spacing } from "@/theme/tokens";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: object;
}

/** Soft opacity-pulse placeholder block in canvas tones. */
export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = radii.tag,
  style,
}: SkeletonProps) {
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
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.elementGap,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.lineWhisper,
    padding: spacing.cardPadding,
    marginBottom: spacing.elementGap,
    ...shadows.card,
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
