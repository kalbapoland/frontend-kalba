import { resolveBuildLock, useTheme, ThemeProvider, type ThemeContextValue } from "@/theme/ThemeProvider";
import { renderHook, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { THEMES } from "@/theme/themes";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

describe("resolveBuildLock", () => {
  test("unset or blank env leaves runtime switching unlocked", () => {
    expect(resolveBuildLock(undefined)).toBeNull();
    expect(resolveBuildLock("")).toBeNull();
    expect(resolveBuildLock("   ")).toBeNull();
  });

  test("a pinned name locks to that palette", () => {
    expect(resolveBuildLock("night")).toBe("night");
    expect(resolveBuildLock("warm-deep")).toBe("warm-deep");
    expect(resolveBuildLock("default")).toBe("default");
  });

  test("throws on an unregistered env name instead of silently unlocking", () => {
    // The guard's purpose: a typo'd build env fails loudly, never ships as an
    // unlocked build (which would silently change gallery determinism).
    expect(() => resolveBuildLock("warm-deepd")).toThrow(/not a registered palette/);
  });
});

describe("useTheme", () => {
  test("throws outside ThemeProvider (fail loud, not blank)", () => {
    expect(() => renderHook(() => useTheme())).toThrow(/useTheme must be used within ThemeProvider/);
  });

  test("inside the provider exposes palette, metadata and a live setter", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.themeName).toBe("default");
    expect(result.current.colors).toEqual(THEMES.default);
    expect(result.current.preference).toBe("system");
    expect(result.current.canChangeTheme).toBe(true);
    expect(typeof result.current.setPreference).toBe("function");
  });

  test("consumer components re-render with the theme context", () => {
    let captured: ThemeContextValue | undefined;
    function Probe() {
      captured = useTheme();
      return <Text testID="probe" />;
    }

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(captured?.themeName).toBeDefined();
    expect(captured?.colors.canvas).toBe(THEMES[captured?.themeName ?? "default"].canvas);
  });
});