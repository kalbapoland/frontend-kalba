/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#5E6B5A",
        "primary-soft": "#8A9A7E",
        secondary: "#9A8E80",
        surface: "#FAF9F6",
        canvas: "#F5F2ED",
        "canvas-deep": "#EDE8E0",
        muted: "#B5B0A8",
        subtle: "#EBE7E1",
        ink: "#3D3D3D",
        "ink-light": "#6B6B66",
        "ink-faint": "#9A9590",
        danger: "#C4836E",
        "danger-light": "#F0E0D8",
      },
    },
  },
  plugins: [],
};
