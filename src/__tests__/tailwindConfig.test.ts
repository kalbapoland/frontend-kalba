// The Tailwind config is plain CommonJS consumed by Node, so it is not
// covered by `tsc`. This suite loads it the same way the bundler does and
// fails when a token is missing or resolves to nothing — Tailwind silently
// drops a utility whose value is undefined, which would ship a missing class
// with a green build.
const tailwindConfig = require("../../tailwind.config.js");
const fraunces = require("@expo-google-fonts/fraunces");
const inter = require("@expo-google-fonts/inter");

type ColorValue = string | Record<string, string>;

type TailwindConfig = {
  theme: {
    extend: {
      colors: Record<string, ColorValue>;
      fontFamily: Record<string, string[]>;
    };
  };
};

const config = tailwindConfig as TailwindConfig;

/**
 * Frozen token sets. A removed or renamed token must fail with a named diff
 * rather than silently shrinking the theme.
 */
const EXPECTED_COLOR_TOKENS = [
  "canvas",
  "canvas-deep",
  "surface",
  "elevated",
  "primary.DEFAULT",
  "primary.soft",
  "primary.wash",
  "primary.deep",
  "accent.DEFAULT",
  "accent.soft",
  "ink.DEFAULT",
  "ink.body",
  "ink.muted",
  "line.DEFAULT",
  "line.whisper",
  "danger.DEFAULT",
  "danger.wash",
  "signal.DEFAULT",
  "signal.wash",
  "deep",
];

const EXPECTED_FONT_TOKENS = [
  "display-light",
  "display",
  "display-medium",
  "body",
  "body-medium",
  "body-semibold",
];

/** Family names the font packages actually export — the real source of truth. */
const KNOWN_FAMILIES = [
  ...Object.keys(fraunces),
  ...Object.keys(inter),
].filter((key) => /^(Fraunces|Inter)_/.test(key));

/**
 * Flattens the colour map to `token -> value` pairs. A group that is empty or
 * not an object is kept as a single entry so the value assertion reports it
 * by name instead of skipping it.
 */
function flattenColors(
  colors: Record<string, ColorValue>,
): Array<[string, string]> {
  const entries: Array<[string, string]> = [];

  for (const [name, value] of Object.entries(colors)) {
    if (typeof value === "string") {
      entries.push([name, value]);
      continue;
    }

    if (value === null || typeof value !== "object") {
      entries.push([name, String(value)]);
      continue;
    }

    for (const [shade, hex] of Object.entries(value)) {
      entries.push([`${name}.${shade}`, hex]);
    }
  }

  return entries;
}

describe("tailwind.config.js", () => {
  test("rejects themes absent from the shared registry", () => {
    const originalTheme = process.env.EXPO_PUBLIC_THEME;
    process.env.EXPO_PUBLIC_THEME = "unregistered";

    try {
      jest.isolateModules(() => {
        expect(() => require("../../tailwind.config.js")).toThrow(
          /Unknown theme "unregistered"/,
        );
      });
    } finally {
      if (originalTheme === undefined) {
        delete process.env.EXPO_PUBLIC_THEME;
      } else {
        process.env.EXPO_PUBLIC_THEME = originalTheme;
      }
    }
  });

  test("loads and exposes the theme extensions", () => {
    expect(config.theme?.extend?.colors).toBeDefined();
    expect(config.theme?.extend?.fontFamily).toBeDefined();
  });

  test("defines exactly the expected colour tokens", () => {
    const keys = flattenColors(config.theme.extend.colors).map(([key]) => key);

    expect(keys.sort()).toEqual([...EXPECTED_COLOR_TOKENS].sort());
  });

  test("every colour token resolves to a hex value", () => {
    for (const [key, hex] of flattenColors(config.theme.extend.colors)) {
      expect(`${key}: ${hex}`).toMatch(/#[0-9A-Fa-f]{6}$/);
    }
  });

  test("defines exactly the expected font tokens", () => {
    const keys = Object.keys(config.theme.extend.fontFamily);

    expect(keys.sort()).toEqual([...EXPECTED_FONT_TOKENS].sort());
  });

  test("every font family is exported by its package", () => {
    // Resolving against the packages catches a misspelled weight, which a
    // name-pattern check would let through, and allows new families without
    // editing this test.
    for (const [name, value] of Object.entries(
      config.theme.extend.fontFamily,
    )) {
      expect(Array.isArray(value)).toBe(true);
      expect(value.length).toBeGreaterThan(0);

      for (const family of value) {
        expect(KNOWN_FAMILIES).toContain(family);
      }
    }
  });
});
