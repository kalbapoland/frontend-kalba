import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors, motion } from "@/theme/tokens";

interface BreathingCircleProps {
  size?: number;
  style?: object;
}

/**
 * Decorative ambient element: two layered wash circles slowly pulsing on a
 * meditation-breath rhythm. Static when the OS reduce-motion setting is on.
 */
export function BreathingCircle({ size = 140, style }: BreathingCircleProps) {
  const reducedMotion = useReducedMotion();
  const breath = useSharedValue(0);

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
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breath.value * 0.06 }],
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

const styles = StyleSheet.create({
  outer: {
    backgroundColor: colors.primaryWash,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    backgroundColor: colors.accentSoft,
    opacity: 0.8,
  },
});
