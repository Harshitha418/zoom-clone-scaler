import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Zoom brand blue
        zoom: {
          DEFAULT: "#2D8CFF",
          dark: "#1F6FD6",
          light: "#E8F2FF",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F5F7FA",
          border: "#E5E7EB",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
      },
    },
  },
  plugins: [],
};

export default config;
