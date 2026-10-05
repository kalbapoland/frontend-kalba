import {
  getOrCreateCachedStyles,
} from "@/theme/useThemedStyles";
import { THEMES, type ThemeColors } from "@/theme/themes";

// Factories must be stable references (as the hook requires in real use),
// so the tests declare them at module level too.
const buildA = (c: ThemeColors) => ({ bg: c.canvas });
const buildB = (c: ThemeColors) => ({ bg: c.surface });

describe("getOrCreateCachedStyles", () => {
  test("same palette + same factory returns the identical object", () => {
    const colors = THEMES.default;

    const first = getOrCreateCachedStyles(colors, buildA);
    const second = getOrCreateCachedStyles(colors, buildA);

    expect(second).toBe(first);
  });

  test("a changed palette instance rebuilds (new styles object)", () => {
    const a = getOrCreateCachedStyles(THEMES.default, buildA);
    const b = getOrCreateCachedStyles(THEMES.night, buildA);

    expect(b).not.toBe(a);
    expect(b.bg).toBe(THEMES.night.canvas);
  });

  test("a different factory gets its own entry for the same palette", () => {
    const colors = THEMES.default;

    const a = getOrCreateCachedStyles(colors, buildA);
    const b = getOrCreateCachedStyles(colors, buildB);

    expect(b).not.toBe(a);
    expect(a.bg).toBe(colors.canvas);
    expect(b.bg).toBe(colors.surface);
  });

  test("re-using an earlier palette returns the original cached instance again", () => {
    const one = getOrCreateCachedStyles(THEMES.default, buildA);
    getOrCreateCachedStyles(THEMES.night, buildA);
    const again = getOrCreateCachedStyles(THEMES.default, buildA);

    expect(again).toBe(one);
  });
});