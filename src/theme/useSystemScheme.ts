import { useEffect, useState } from "react";
import { Appearance, AppState, Platform } from "react-native";

import type { SystemScheme } from "./preference";

/**
 * Native Appearance module, bypassing React Native's JS-side cache.
 *
 * `Appearance.getColorScheme()` memoises the value in JS
 * (Libraries/Utilities/Appearance.js `state.appearance`) and refreshes it
 * ONLY through events or setColorScheme — a re-read after a missed event
 * returns stale data. The underlying TurboModule reads the LIVE native
 * configuration on Android (UiModeUtils) and the notification-maintained
 * value on iOS, so it is the correct source for the foreground re-read.
 */
function readNativeScheme(): SystemScheme {
  if (Platform.OS === "web") {
    return Appearance.getColorScheme() ?? null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TurboModuleRegistry =
      require("react-native/Libraries/TurboModule/TurboModuleRegistry") as {
        get: <T>(name: string) => T | null;
      };
    const nativeModule =
      TurboModuleRegistry.get<{ getColorScheme: () => string | null }>(
        "Appearance",
      );

    const value = nativeModule?.getColorScheme() ?? null;
    return value === "dark" ? "dark" : value === "light" ? "light" : null;
  } catch (error) {
    // TurboModule unavailable (old arch, unusual preload) — fall back to the
    // cached path; it is at least as fresh as before this hook existed.
    console.warn("[theme] native scheme read failed, using cached:", error);
    return Appearance.getColorScheme() ?? null;
  }
}

/**
 * System light/dark scheme with foreground re-sync.
 *
 * Native `appearanceChanged` events are not reliably (re-)delivered across a
 * backgrounded state change: Android drops the emit while the react context
 * is inactive (the module still advances its dedupe cache, so nothing is
 * re-sent on return), and iOS suppresses the trait-change notification while
 * the application is in the background. A system toggle made while the app
 * was backgrounded therefore never reaches `Appearance.addChangeListener`.
 * Re-reading the scheme on every foreground transition closes that window;
 * live foreground toggles keep flowing through the change listener.
 *
 * Android: `androidPin` mirrors the RESOLVED app appearance into AppCompat's
 * process-wide day/night mode, so native chrome (Alert dialogs, the system
 * DateTimePicker, values-night resources under the DayNight activity theme)
 * re-themes with the app instead of the raw OS setting — which would
 * otherwise overlay our palette when the Appearance switch pins light.
 * `Appearance.getColorScheme` reads that pinned mode back rather than the OS
 * switch, so the pin is released (`null`) whenever the app follows the
 * system, and the scheme is re-read right after release.
 */
export function useSystemScheme(
  androidPin: "dark" | "light" | null,
): SystemScheme {
  const [scheme, setScheme] = useState<SystemScheme>(
    () => readNativeScheme() ?? null,
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener((preferences) => {
      setScheme(preferences.colorScheme ?? null);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      // rn-web drives the listener above through a matchMedia query, which
      // fires live — no AppState round-trip needed (and rn-web AppState does
      // not emit a useful "change" payload).
      return;
    }

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        // Bypass the JS appearance cache: the missed event left it stale.
        setScheme(readNativeScheme() ?? null);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    if (androidPin === null) {
      // Release: MODE_NIGHT_FOLLOW_SYSTEM again. Native getColorScheme is a
      // live resource read (Android), so the true OS scheme becomes readable
      // again — re-read synchronously (bypassing the JS cache) so the pin
      // flip cannot leave stale state.
      Appearance.setColorScheme(null);
      setScheme(readNativeScheme() ?? null);
      return;
    }

    Appearance.setColorScheme(androidPin);
  }, [androidPin]);

  return scheme;
}