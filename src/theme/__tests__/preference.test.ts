import {
  DEFAULT_THEME,
  THEMES,
  THEME_NAMES,
  type ThemeName,
} from "@/theme/themes";
import { resolveTheme, type SystemScheme, type ThemePreference } from "@/theme/preference";

const SCHEMES: SystemScheme[] = ["light", "dark", null];

describe("resolveTheme", () => {
  test.each(SCHEMES)('preference "system" with scheme %s maps light→default, dark→night', (scheme) => {
    const result = resolveTheme("system", scheme);

    if (scheme === "dark") {
      expect(result).toBe("night");
    } else {
      // light AND null (scheme not yet known) stay on the light palette.
      expect(result).toBe(DEFAULT_THEME);
      expect(result).not.toBe("night");
    }
  });

  test.each(THEME_NAMES)('explicit preference "%s" wins over any system scheme', (theme) => {
    for (const scheme of SCHEMES) {
      expect(resolveTheme(theme, scheme)).toBe(theme);
    }
  });

  test("system maps to registered themes only", () => {
    for (const scheme of SCHEMES) {
      const result = resolveTheme("system", scheme);
      expect(THEME_NAMES).toContain(result);
    }
  });

  test("every registered theme is reachable via preference", () => {
    for (const name of THEME_NAMES) {
      expect(resolveTheme(name as ThemePreference, "light")).toBe(name);
    }
  });

  test("default palette is light (dark resolution requires explicit night)", () => {
    expect(DEFAULT_THEME).not.toBe("night");
    expect(THEMES[DEFAULT_THEME as ThemeName].canvas).toMatch(/^#[EF]/);
  });
});