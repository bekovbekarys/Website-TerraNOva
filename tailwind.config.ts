import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terra: {
          50: "#f0f9f4",
          100: "#dbf0e3",
          200: "#b9e0cb",
          300: "#8acca8",
          400: "#54ad7f",
          500: "#2f9160",
          600: "#1f744c",
          700: "#1a5c3f",
          800: "#174a34",
          900: "#143d2c",
          950: "#0a2218",
        },
        ocean: {
          50: "#eff8ff",
          100: "#dcefff",
          200: "#b3dfff",
          300: "#6ac4ff",
          400: "#1aa6ff",
          500: "#008cf0",
          600: "#006fcc",
          700: "#0058a5",
          800: "#054b88",
          900: "#0a3f70",
          950: "#07284a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 2px 20px -4px rgba(20, 61, 44, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
