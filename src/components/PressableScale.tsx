import { forwardRef } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { lightImpact } from "@/lib/haptics";
import { motion } from "@/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  /** Scale applied while pressed. Keep subtle. */
  pressedScale?: number;
  /** Fire a light haptic tap on press (native only). */
  haptic?: boolean;
}

/**
 * Standard pressed-state feedback: a soft animated scale-down with an
 * optional light haptic. Replaces the per-screen inline transform pattern.
 */
export const PressableScale = forwardRef<View, PressableScaleProps>(
  function PressableScale(
    { pressedScale = 0.97, haptic = false, onPressIn, onPress, style, ...rest },
    ref,
  ) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <AnimatedPressable
        ref={ref}
        onPressIn={(e) => {
          scale.value = withTiming(pressedScale, { duration: motion.fast });
          onPressIn?.(e);
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: motion.fast });
        }}
        onPress={(e) => {
          if (haptic) lightImpact();
          onPress?.(e);
        }}
        style={[animatedStyle, style]}
        {...rest}
      />
    );
  },
);
