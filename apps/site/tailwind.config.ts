import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // hitlist.fm "Gold Standard" — mirrors packages/tokens/tokens.json.
        brand: {
          50: "#FEF9EE",
          100: "#FBEFCD",
          200: "#F6DD9B",
          300: "#F1C968",
          400: "#F3C863",
          500: "#F5B13D",
          600: "#D68C24",
          700: "#AE6E1D",
          800: "#8B571A",
          900: "#714718",
          950: "#422709",
        },
        goldlight: "#FFD588",
        ember: { DEFAULT: "#FF5A34", light: "#FF8A5C" },
        down: "#FF7A6B",
        ink: { DEFAULT: "#12100E", surface: "#1B1714", light: "#26211C", hi: "#332B24" },
        zinc: {
          50: "#FBF8F2",
          100: "#F7F2E9",
          200: "#E4DDD0",
          300: "#C9C0B4",
          400: "#B6ADA0",
          500: "#8B8175",
          600: "#6E655B",
          700: "#332B24",
          800: "#26211C",
          900: "#1B1714",
          950: "#12100E",
        },
      },
      fontFamily: {
        sans: ["var(--font-sora)", ...defaultTheme.fontFamily.sans],
        display: ["var(--font-sora)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-plex-mono)", ...defaultTheme.fontFamily.mono],
      },
      maxWidth: {
        content: "1120px",
      },
      keyframes: {
        emberPing: {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "70%, 100%": { transform: "scale(2.6)", opacity: "0" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "ember-ping": "emberPing 1.8s ease-out infinite",
        rise: "rise 0.6s cubic-bezier(0.2,0.8,0.2,1) both",
      },
    },
  },
  plugins: [forms],
};

export default config;
