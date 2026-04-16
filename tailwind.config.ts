import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          pink: "#ff0090",
          cyan: "#00e5ff",
          green: "#00ff65",
          yellow: "#ffe600",
          red: "#ff3355",
        },
        dark: {
          bg: "#0d0b1a",
          surface: "#16132e",
          surface2: "#1e1945",
          border: "rgba(100,80,200,0.3)",
        },
        brand: {
          50: "#f0e6ff",
          100: "#e0ccff",
          200: "#c099ff",
          300: "#9966ff",
          400: "#ff0090",
          500: "#ff0090",
          600: "#cc0073",
          700: "#990056",
          800: "#1e1945",
          900: "#16132e",
          950: "#0d0b1a",
        },
      },
      fontFamily: {
        display: ["var(--font-bebas)", "'Bebas Neue'", "sans-serif"],
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(255,0,144,0.4)" },
          "50%": { boxShadow: "0 0 25px rgba(255,0,144,0.8)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
