import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { motion } from "@/theme/tokens";
import { themeColorsSV, useTheme } from "@/theme/ThemeProvider";
import { useThemedStyles } from "@/theme/useThemedStyles";
import type { ThemeColors } from "@/theme/themes";

interface BreathingCircleProps {
  size?: number;
  style?: object;
}

function buildStyles(c: ThemeColors) {
  return StyleSheet.create({
    outer: {
      backgroundColor: c.primaryWash,
      alignItems: "center",
      justifyContent: "center",
    },
    inner: {
      backgroundColor: c.accentSoft,
      opacity: 0.8,
    },
  });
}

/**
 * Decorative ambient element: two layered wash circles slowly pulsing on a
 * meditation-breath rhythm. Static when the OS reduce-motion setting is on.
 *
 * Colours come from the worklet-shared palette mirror (`themeColorsSV`) —
 * worklets cannot observe React context, so background re-colours flow
 * through the shared value that ThemeProvider keeps in sync.
 */
export function BreathingCircle({ size = 140, style }: BreathingCircleProps) {
  const reducedMotion = useReducedMotion();
  const styles = useThemedStyles(buildStyles);
  const breath = useSharedValue(0);
  // Derived per-frame: when themeColorsSV.value changes, the worklet picks up
  // the new colours on the next animated frame without a React re-render.
  const svColors = useDerivedValue(() => themeColorsSV.value);

  useEffect(() => {
    if (reducedMotion) return;
    breath.value = withRepeat(
      withTiming(1, {
        duration: motion.breath,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(breath);
  }, [breath, reducedMotion]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breath.value * 0.12 }],
    opacity: 0.5 + breath.value * 0.25,
    backgroundColor: svColors.value.primaryWash,
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breath.value * 0.06 }],
    backgroundColor: svColors.value.accentSoft,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.outer,
        { width: size, height: size, borderRadius: size / 2 },
        outerStyle,
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.inner,
          {
            width: size * 0.68,
            height: size * 0.68,
            borderRadius: (size * 0.68) / 2,
          },
          innerStyle,
        ]}
      />
    </Animated.View>
  );
}
