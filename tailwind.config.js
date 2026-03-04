/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas:        "#F5F1EB",
        "canvas-deep": "#EDE8E0",
        surface:       "#FAF8F4",
        elevated:      "#FFFFFF",

        primary: {
          DEFAULT:     "#566B52",
          soft:        "#8A9A7E",
          wash:        "#E8EDE5",
        },

        accent: {
          DEFAULT:     "#B8877A",
          soft:        "#F2E4DE",
        },

        ink: {
          DEFAULT:     "#2E2E2B",
          body:        "#57564F",
          muted:       "#8C8A82",
        },

        line: {
          DEFAULT:     "#DDD9D1",
          whisper:     "#EDE9E2",
        },

        danger: {
          DEFAULT:     "#C4836E",
          wash:        "#F8EDE8",
        },
      },
    },
  },
  plugins: [],
};
