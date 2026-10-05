import {
  DEFAULT_THEME,
  THEMES,
  THEME_NAMES,
  type ThemeName,
} from "@/theme/themes";
import {
  resolveTheme,
  isDarkTheme,
  type SystemScheme,
  type ThemeSelection,
} from "@/theme/preference";

const SCHEMES: SystemScheme[] = ["light", "dark", null];

describe("resolveTheme", () => {
  test('"system" maps dark→night, light/null→default', () => {
    for (const scheme of SCHEMES) {
      const result = resolveTheme("system", scheme);
      if (scheme === "dark") {
        expect(result).toBe("night");
      } else {
        // light AND null (scheme not yet known) stay on the light palette.
        expect(result).toBe(DEFAULT_THEME);
      }
    }
  });

  test('"light" pins the light palette regardless of the OS switch', () => {
    for (const scheme of SCHEMES) {
      expect(resolveTheme("light", scheme)).toBe(DEFAULT_THEME);
    }
  });

  test.each(THEME_NAMES)("a pinned name (%s) wins over any system scheme", (theme) => {
    for (const scheme of SCHEMES) {
      expect(resolveTheme(theme as ThemeSelection, scheme)).toBe(theme);
    }
  });

  test("every selection result is a registered theme", () => {
    const selections: ThemeSelection[] = ["system", "light", ...THEME_NAMES];
    for (const selection of selections) {
      for (const scheme of SCHEMES) {
        expect(THEME_NAMES).toContain(resolveTheme(selection, scheme));
      }
    }
  });

  test("isDarkTheme agrees with the dark mapping (chrome flips with palette)", () => {
    expect(isDarkTheme(resolveTheme("system", "dark"))).toBe(true);
    expect(isDarkTheme(resolveTheme("system", "light"))).toBe(false);
    expect(isDarkTheme(resolveTheme("light", "dark"))).toBe(false);
    expect(isDarkTheme("night")).toBe(true);
    expect(isDarkTheme("default")).toBe(false);
    expect(isDarkTheme("warm-deep")).toBe(false);
  });

  test("default palette is light (dark resolution requires system+dark or night pin)", () => {
    expect(DEFAULT_THEME).not.toBe("night");
    expect(THEMES[DEFAULT_THEME as ThemeName].canvas).toMatch(/^#[EF]/);
  });
});