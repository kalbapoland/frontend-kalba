import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import { registerPushToken } from "@/api/endpoints";
import { useAuthStore } from "@/store/auth";
import type { PushTokenPlatform } from "@/types/api";

/**
 * Requests push-notification permission and registers the Expo push token
 * with the backend. Idempotent — safe to call on every app launch while
 * the user is authenticated.
 *
 * Web is intentionally skipped (Phase 1 covers iOS/Android only).
 * The registered token is kept in the Zustand auth store so that
 * `signOut` can unregister it before clearing the session.
 */
export function usePushRegistration(): void {
    const setPushToken = useAuthStore((s) => s.setPushToken);

    useEffect(() => {
        if (Platform.OS === "web") {
            return;
        }

        void (async () => {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== "granted") {
                console.log("[push] Permission not granted — skipping registration");
                return;
            }

            const expoExtra = Constants.expoConfig?.extra as
                | { easProjectId?: string; eas?: { projectId?: string } }
                | undefined;
            const projectId: string =
                expoExtra?.easProjectId ??
                expoExtra?.eas?.projectId ??
                Constants.easConfig?.projectId ??
                "";

            if (!projectId) {
                console.warn(
                    "[push] Missing Expo projectId (EXPO_PUBLIC_EAS_PROJECT_ID / EAS config) — skipping push token registration",
                );
                return;
            }

            let tokenString: string;
            try {
                const tokenData = await Notifications.getExpoPushTokenAsync({
                    projectId,
                });
                tokenString = tokenData.data;
            } catch (err) {
                console.warn("[push] Failed to get push token:", err);
                return;
            }

            const platform: PushTokenPlatform =
                Platform.OS === "ios" ? "ios" : "android";

            try {
                await registerPushToken({ token: tokenString, platform });
                setPushToken(tokenString);
            } catch (err) {
                // Non-fatal — app still works without push tokens
                console.warn("[push] Failed to register push token with backend:", err);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
