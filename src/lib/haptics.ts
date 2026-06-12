import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/** Light tap feedback for presses and tab switches. No-op on web. */
export function lightImpact(): void {
  if (Platform.OS === "web") return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Success feedback after a completed action (join, enroll, save). No-op on web. */
export function successFeedback(): void {
  if (Platform.OS === "web") return;
  void Haptics.notificationAsync(
    Haptics.NotificationFeedbackType.Success,
  ).catch(() => {});
}
