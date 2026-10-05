import themeRegistry from "@/theme/themes/registry.json";
import { isDarkTheme, resolveTheme } from "@/theme/preference";
import {
  DEFAULT_THEME,
  THEMES,
  THEME_NAMES,
  resolveThemeName,
} from "@/theme/themes";

/** Every theme must define exactly the same colour keys. */
describe("theme registry", () => {
  const referenceKeys = Object.keys(THEMES[DEFAULT_THEME]).sort();

  test("registers at least the default theme", () => {
    expect(THEME_NAMES).toContain(DEFAULT_THEME);
    expect(THEME_NAMES.length).toBeGreaterThan(0);
  });

  test("registry and runtime palettes list exactly the same themes", () => {
    expect(Object.keys(themeRegistry).sort()).toEqual(Object.keys(THEMES).sort());

    for (const [name, paletteFile] of Object.entries(themeRegistry)) {
      expect(paletteFile).toBe(`${name}.json`);
    }
  });

  test('"system" is reserved and can never be a registered palette', () => {
    // `system` is the preference sentinel for OS-following; a palette under
    // that name would be permanently shadowed by resolveTheme and rejected
    // by the build script — catch it at the registry level instead.
    expect(THEME_NAMES).not.toContain("system");
  });

  test.each(THEME_NAMES)("%s defines the same colour keys as default", (name) => {
    // A key present in one theme and missing in another resolves to
    // `undefined`, which React Native treats as "not set" — the style is
    // silently dropped instead of failing. Catch it here.
    expect(Object.keys(THEMES[name]).sort()).toEqual(referenceKeys);
  });

  test.each(THEME_NAMES)("%s uses well-formed colour values", (name) => {
    for (const [key, value] of Object.entries(THEMES[name])) {
      // Hex (#RRGGBB) or a tightly-bounded rgba(): channels 0-255, alpha
      // 0-1 with optional fraction. Out-of-range or half-formed values must
      // fail loudly — they would ship an invalid style silently otherwise.
      expect(`${name}.${key}: ${value}`).toMatch(
        /: (#[0-9A-F]{6}|rgba\((1?\d?\d|2[0-4]\d|25[0-5]),\s*(1?\d?\d|2[0-4]\d|25[0-5]),\s*(1?\d?\d|2[0-4]\d|25[0-5]),\s*(0|1)(\.\d+)?\))$/i,
      );
    }
  });

  test("falls back to the default theme when unset or blank", () => {
    expect(resolveThemeName(undefined)).toBe(DEFAULT_THEME);
    expect(resolveThemeName("")).toBe(DEFAULT_THEME);
    expect(resolveThemeName("   ")).toBe(DEFAULT_THEME);
  });

  test("accepts every registered theme name", () => {
    for (const name of THEME_NAMES) {
      expect(resolveThemeName(name)).toBe(name);
    }
  });

  test("throws on an unknown theme instead of silently falling back", () => {
    // A typo in a build script must fail the build, not ship the wrong palette.
    expect(() => resolveThemeName("unregistered")).toThrow(/unregistered/);
  });

  test("isDarkTheme agrees with the system-dark mapping", () => {
    // resolveTheme maps OS dark to "night" — the same predicate must classify
    // night as dark, or the status bar would flip against the palette.
    expect(isDarkTheme(resolveTheme("system", "dark"))).toBe(true);
    expect(isDarkTheme(resolveTheme("system", "light"))).toBe(false);
    expect(isDarkTheme(resolveTheme("system", null))).toBe(false);
    expect(isDarkTheme("night")).toBe(true);
    expect(isDarkTheme("default")).toBe(false);
    expect(isDarkTheme("warm-deep")).toBe(false);
  });

  test.each(THEME_NAMES)("the active palette matches EXPO_PUBLIC_THEME=%s", (name) => {
    const originalTheme = process.env.EXPO_PUBLIC_THEME;
    process.env.EXPO_PUBLIC_THEME = name;

    try {
      jest.isolateModules(() => {
        const { colors, themeName } = require("@/theme/tokens") as typeof import("@/theme/tokens");

        expect(themeName).toBe(name);
        expect(colors).toEqual(THEMES[name]);
      });
    } finally {
      if (originalTheme === undefined) {
        delete process.env.EXPO_PUBLIC_THEME;
      } else {
        process.env.EXPO_PUBLIC_THEME = originalTheme;
      }
    }
  });
});
