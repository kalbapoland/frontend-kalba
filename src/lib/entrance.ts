import { FadeInDown, ReduceMotion } from "react-native-reanimated";

import { motion } from "@/theme/tokens";

/**
 * Staggered fade+slide entrance for list items. Delay is capped at
 * motion.staggerMax items so long lists do not feel sluggish.
 * Respects the OS reduce-motion setting.
 */
export function listItemEntering(index: number) {
  return FadeInDown.duration(motion.base)
    .delay(Math.min(index, motion.staggerMax) * motion.staggerStep)
    .reduceMotion(ReduceMotion.System);
}
