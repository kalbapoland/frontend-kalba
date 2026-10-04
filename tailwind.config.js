/** @type {import('tailwindcss').Config} */
const fs = require("fs");
const path = require("path");

/**
 * Theme resolution mirrors `src/theme/themes/index.ts`. Both read the shared
 * registry and palette files so NativeWind classes and runtime tokens cannot
 * drift apart.
 *
 * Keep the two resolvers in sync: this one is CommonJS (Tailwind loads it
 * without a transpiler), the other is TypeScript (Metro bundles it).
 */
const THEMES_DIR = path.join(__dirname, "src", "theme", "themes");
const themeRegistry = require(path.join(THEMES_DIR, "registry.json"));
const DEFAULT_THEME = "default";

function resolveThemeName(raw) {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_THEME;
  }

  const name = raw.trim();
  if (!Object.prototype.hasOwnProperty.call(themeRegistry, name)) {
    const available = Object.keys(themeRegistry).sort();
    throw new Error(
      `Unknown theme "${name}". Expected one of: ${available.join(", ")}. ` +
        "Set EXPO_PUBLIC_THEME to a registered theme name.",
    );
  }

  return name;
}

const themeName = resolveThemeName(process.env.EXPO_PUBLIC_THEME);
const paletteFile = themeRegistry[themeName];
if (typeof paletteFile !== "string" || !fs.existsSync(path.join(THEMES_DIR, paletteFile))) {
  throw new Error(`Theme "${themeName}" has no palette file in src/theme/themes/registry.json.`);
}
const palette = require(path.join(THEMES_DIR, paletteFile));
const fonts = require("./src/theme/fonts.json");

/**
 * Tailwind silently drops a utility when its value is `undefined`, so a
 * renamed or removed key in a theme file would ship a missing class with a
 * green build. Fail loudly at config load instead.
 */
function token(group, key) {
  const source = group === "fonts" ? fonts : palette[group];
  const value = source?.[key];

  if (typeof value !== "string" || value.length === 0) {
    const origin =
      group === "fonts"
        ? "src/theme/fonts.json"
        : `src/theme/themes/${themeName}.json`;

    throw new Error(
      `Missing ${group}.${key} in ${origin}. ` +
        "tailwind.config.js and src/theme/tokens.ts both read from it.",
    );
  }

  return value;
}

module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Values come from src/theme/themes/<active>.json — the single source of
      // truth shared with src/theme/tokens.ts. Edit the JSON, not this file.
      colors: {
        canvas: token("colors", "canvas"),
        "canvas-deep": token("colors", "canvasDeep"),
        surface: token("colors", "surface"),
        elevated: token("colors", "elevated"),

        primary: {
          DEFAULT: token("colors", "primary"),
          soft: token("colors", "primarySoft"),
          wash: token("colors", "primaryWash"),
          deep: token("colors", "primaryDeep"),
        },

        accent: {
          DEFAULT: token("colors", "accent"),
          soft: token("colors", "accentSoft"),
        },

        ink: {
          DEFAULT: token("colors", "ink"),
          body: token("colors", "inkBody"),
          muted: token("colors", "inkMuted"),
        },

        line: {
          DEFAULT: token("colors", "line"),
          whisper: token("colors", "lineWhisper"),
        },

        danger: {
          DEFAULT: token("colors", "danger"),
          wash: token("colors", "dangerWash"),
        },

        signal: {
          DEFAULT: token("colors", "signal"),
          wash: token("colors", "signalWash"),
        },

        deep: token("colors", "deep"),
      },

      fontFamily: {
        "display-light": [token("fonts", "displayLight")],
        display: [token("fonts", "display")],
        "display-medium": [token("fonts", "displayMedium")],
        body: [token("fonts", "body")],
        "body-medium": [token("fonts", "bodyMedium")],
        "body-semibold": [token("fonts", "bodySemiBold")],
      },
    },
  },
  plugins: [],
};
