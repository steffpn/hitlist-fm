import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // hitlist.fm "Gold Standard" — source of truth: packages/tokens/tokens.json
        // brand = amber gold. 500 = accent, 600 = accentDark (gradient start / pressed).
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
        // Big hero numbers / highlights (accentLight #FFD588).
        goldlight: "#FFD588",
        // LIVE + strongly-rising chart moves + the waveform detection marker.
        ember: { DEFAULT: "#FF5A34", light: "#FF8A5C" },
        // Negative trend / error — NEVER route through brand (brand is no longer red).
        down: "#FF7A6B",
        // Warm-ink surface family (semantic aliases).
        ink: { DEFAULT: "#12100E", surface: "#1B1714", light: "#26211C", hi: "#332B24" },
        // Warm the whole neutral ramp so existing zinc-* utilities read as warm ink.
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
      keyframes: {
        emberPing: {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "70%, 100%": { transform: "scale(2.6)", opacity: "0" },
        },
      },
      animation: {
        "ember-ping": "emberPing 1.8s ease-out infinite",
      },
    },
  },
  plugins: [forms],
};

export default config;
