/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg0: "#0a0a0d", bg1: "#131319", bg2: "#1c1c24", bg3: "#2a2a35",
        ink: "#f5f5f7",
        accent: "#ff3d00", accent2: "#ff8a3d",
        cyber: "#00d4ff",
        gold: "#ffd166", green: "#06d6a0", danger: "#ff5252",
      },
      fontFamily: {
        display: ["'Barlow Condensed'", "sans-serif"],
        editorial: ["'Fraunces'", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
