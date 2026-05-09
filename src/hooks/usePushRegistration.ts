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
    const token = useAuthStore((s) => s.token);
    const isRestoringToken = useAuthStore((s) => s.isRestoringToken);
    const setPushToken = useAuthStore((s) => s.setPushToken);

    useEffect(() => {
        if (Platform.OS === "web") {
            return;
        }

        // Avoid a startup race where this effect runs before auth token restore/sign-in completes.
        if (isRestoringToken || !token) {
            return;
        }

        void (async () => {
            const currentPermissions = await Notifications.getPermissionsAsync();
            const permissions = currentPermissions.granted
                ? currentPermissions
                : await Notifications.requestPermissionsAsync();

            if (!permissions.granted) {
                console.warn(
                    "[push] Notifications permission not granted; skipping push token registration",
                    permissions,
                );
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

            let tokenString: string;
            try {
                const tokenData = projectId
                    ? await Notifications.getExpoPushTokenAsync({ projectId })
                    : await Notifications.getExpoPushTokenAsync();
                tokenString = tokenData.data;
            } catch (err) {
                console.warn(
                    "[push] Failed to get push token:",
                    {
                        hasProjectId: Boolean(projectId),
                        projectId: projectId || "<empty>",
                        expoExtra,
                        easProjectId: Constants.easConfig?.projectId,
                    },
                    err,
                );
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
    }, [isRestoringToken, setPushToken, token]);
}
