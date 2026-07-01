import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ON AIR accent scale — source of truth: packages/tokens/tokens.json
        // 400 = accentLight/error, 500 = accent/live, 600 = accentDark (gradient start)
        brand: {
          50: "#FFF5F4",
          100: "#FFE9E8",
          200: "#FFCFCC",
          300: "#FFADA6",
          400: "#FF8A80",
          500: "#FF4B45",
          600: "#D92D26",
          700: "#B2221C",
          800: "#8A1A15",
          900: "#63120E",
          950: "#3D0A08",
        },
      },
      fontFamily: {
        sans: ["var(--font-sora)", ...defaultTheme.fontFamily.sans],
        display: ["var(--font-sora)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-plex-mono)", ...defaultTheme.fontFamily.mono],
      },
    },
  },
  plugins: [forms],
};

export default config;
