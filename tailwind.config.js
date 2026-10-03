/** @type {import('tailwindcss').Config} */
const palette = require("./src/theme/palette.json");

/**
 * Tailwind silently drops a utility when its value is `undefined`, so a
 * renamed or removed key in palette.json would ship a missing class with a
 * green build. Fail loudly at config load instead.
 */
function token(group, key) {
  const value = palette[group]?.[key];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `palette.json is missing ${group}.${key}. ` +
        "Update src/theme/palette.json — tailwind.config.js and " +
        "src/theme/tokens.ts both read from it.",
    );
  }

  return value;
}

module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Values come from src/theme/palette.json — the single source of truth
      // shared with src/theme/tokens.ts. Edit the JSON, not this file.
      colors: {
        canvas: token("colors", "canvas"),
        "canvas-deep": token("colors", "canvasDeep"),
        surface: token("colors", "surface"),
        elevated: token("colors", "elevated"),

        primary: {
          DEFAULT: token("colors", "primary"),
          soft: token("colors", "primarySoft"),
          wash: token("colors", "primaryWash"),
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
