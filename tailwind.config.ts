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
        // Official SIX SIGMA Brand Palette
        brick: {
          DEFAULT: "#8E2424",
          hover: "#751D1D",
          dark: "#5A1616",
          light: "#B23A3A",
          muted: "rgba(142, 36, 36, 0.15)",
          border: "rgba(142, 36, 36, 0.4)",
        },
        steel: {
          DEFAULT: "#1C1F23",
          light: "#252932",
          dark: "#14171B",
          border: "#252932",
        },
        accent: {
          green: "#7BA238",
          greenHover: "#6A8D2F",
          greenDark: "#4D6B21",
          greenLight: "#9AC44B",
          greenMuted: "rgba(123, 162, 56, 0.15)",
        },
        surface: {
          base: "#0E1116",
          card: "#14171D",
          panel: "#1C1F23",
          border: "#252932",
        },
        sixsigma: {
          dark: "#0E1116",
          card: "#14171D",
          border: "#252932",
          steel: "#1C1F23",
          brick: "#8E2424",
          brickHover: "#751D1D",
          green: "#7BA238",
          greenHover: "#6A8D2F",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
