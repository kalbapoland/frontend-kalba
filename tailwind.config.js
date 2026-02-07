/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#7C8B72",
        "primary-soft": "#A3B18A",
        secondary: "#9A8E80",
        surface: "#FAFAF7",
        canvas: "#F5F2ED",
        muted: "#B0AEA6",
        subtle: "#E8E4DE",
        ink: "#3D3D3D",
        "ink-light": "#6B6B66",
        "ink-faint": "#8A8A85",
        danger: "#C4836E",
        "danger-light": "#F0E0D8",
      },
    },
  },
  plugins: [],
};
