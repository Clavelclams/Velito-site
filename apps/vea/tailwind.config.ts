import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vea: {
          // Fonds
          dark: "#0d0618",
          bg: "#120920",
          card: "#1a0f2e",
          "card-hover": "#231540",

          // Bordures
          border: "#2d1f4e",
          "border-bright": "#4a2d8a",

          // Couleur principale — Violet
          purple: "#7c3aed",
          "purple-light": "#a855f7",
          "purple-glow": "rgba(124,58,237,0.3)",

          // Couleur accent — Rouge VEA
          red: "#E63946",
          "red-light": "#ff4d5a",
          "red-glow": "rgba(230,57,70,0.3)",

          // Textes
          white: "#ffffff",
          "text-muted": "#8b7aaa",
          "text-dim": "#5a4d73",

          // Aliases rétrocompat (ancien → nouveau)
          accent: "#E63946",
          "accent-hover": "#d32f3f",
          navy: "#120920",
          darker: "#080410",
        },
        vena: {
          kaki: "#414C35",
          sage: "#b9e7cd",
          lavender: "#c3ccff",
        },
      },
    },
  },
  plugins: [],
};

export default config;
