import { renderHook, act } from "@testing-library/react-native";
import { Appearance, AppState, Platform } from "react-native";

import { useSystemScheme } from "@/theme/useSystemScheme";

/**
 * The hook drives system-following AND the Android AppCompat pin (native
 * chrome re-themes from it). Contract under test:
 * - the OS scheme reaches state through the change listener,
 * - a foreground transition re-reads the scheme from the NATIVE module
 *   (bypassing RN's JS cache — a missed event leaves the cached value stale),
 * - a non-null pin is applied, and releasing it (`null`) restores FOLLOW_
 *   SYSTEM and re-reads synchronously so the raw OS scheme is readable.
 */

// jest.mock factory variables must be prefixed `mock` and read lazily.
const mockNativeScheme = { value: "light" as "light" | "dark" };

jest.mock("react-native/Libraries/TurboModule/TurboModuleRegistry", () => ({
  get: (name: string) =>
    name === "Appearance"
      ? {
          getColorScheme: () => mockNativeScheme.value,
          setColorScheme: () => undefined,
        }
      : null,
  getEnforcing: (name: string) =>
    name === "Appearance"
      ? {
          getColorScheme: () => mockNativeScheme.value,
          setColorScheme: () => undefined,
        }
      : null,
}));

describe("useSystemScheme", () => {
  const originalOS = Platform.OS;

  let changeListeners: Array<(p: { colorScheme: string }) => void>;
  let foregroundHandlers: Array<(state: string) => void>;

  const emitAppearance = (scheme: string) => {
    for (const listener of changeListeners) listener({ colorScheme: scheme });
  };
  const goForeground = () => {
    for (const handler of foregroundHandlers) handler("active");
  };
  const setNativeScheme = (scheme: "light" | "dark") => {
    mockNativeScheme.value = scheme;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // iOS unless a suite overrides — readNativeScheme takes the TurboModule
    // path for both native platforms; Platform.OS only gates the web branch
    // and the Android pin effect, so iOS exercises the same read path.
    (Platform as { OS: string }).OS = "ios";

    setNativeScheme("light");
    changeListeners = [];
    foregroundHandlers = [];

    jest.spyOn(Appearance, "addChangeListener").mockImplementation(
      ((listener: (p: { colorScheme: string }) => void) => {
        changeListeners.push(listener);
        return {
          remove: () => {
            changeListeners = changeListeners.filter((l) => l !== listener);
          },
        };
      }) as never,
    );

    jest.spyOn(AppState, "addEventListener").mockImplementation(((
      _event: string,
      handler: (state: string) => void,
    ) => {
      foregroundHandlers.push(handler);
      return { remove: () => undefined };
    }) as never);
  });

  afterAll(() => {
    (Platform as { OS: string }).OS = originalOS;
  });

  test("reports the initial native scheme", () => {
    const { result } = renderHook(() => useSystemScheme(null));

    expect(result.current).toBe("light");
  });

  test("change listener updates the scheme (live foreground toggles)", () => {
    const { result } = renderHook(() => useSystemScheme(null));

    act(() => {
      emitAppearance("dark");
    });

    expect(result.current).toBe("dark");
  });

  test("foreground return re-reads the NATIVE scheme after a missed event", () => {
    // Regression for the JS-cache staleness report: the OS toggles while the
    // app is in the background; no events arrive; RN's JS Appearance cache
    // stays stale. On foreground the hook must read the NATIVE module, not
    // the cache.
    const { result } = renderHook(() => useSystemScheme(null));

    act(() => {
      // The change happens without any change event.
      setNativeScheme("dark");
    });

    // Before the foreground transition the hook still holds the old value.
    expect(result.current).toBe("light");

    act(() => {
      goForeground();
    });

    expect(result.current).toBe("dark");
  });

  test("Android: a pin is applied and release re-reads the OS scheme", () => {
    (Platform as { OS: string }).OS = "android";
    const setColorScheme = jest
      .spyOn(Appearance, "setColorScheme")
      .mockImplementation(() => undefined);

    const { result, rerender } = renderHook(
      ({ pin }) => useSystemScheme(pin),
      { initialProps: { pin: "dark" as const } },
    );

    expect(setColorScheme).toHaveBeenCalledWith("dark");

    rerender({ pin: "light" as const });
    expect(setColorScheme).toHaveBeenCalledWith("light");

    // Releasing the pin must restore FOLLOW_SYSTEM (setColorScheme(null)) so
    // the raw OS scheme is readable again for the system-following resolver.
    rerender({ pin: null });
    expect(setColorScheme).toHaveBeenLastCalledWith(null);
    expect(result.current).toBe("light"); // fresh native read, not stale cache
  });
});