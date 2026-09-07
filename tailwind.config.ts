import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        sixsigma: {
          dark: "#0F172A",
          slate: "#1E293B",
          card: "#182234",
          border: "#334155",
          red: "#991B1B",
          redDark: "#7F1D1D",
          redLight: "#B91C1C",
          redAccent: "#881337",
          amber: "#D97706",
          emerald: "#059669",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
