import type { Config } from "tailwindcss";

/**
 * Config Tailwind VEA — refonte fond clair (16/05/2026).
 *
 * Avant : palette violet sombre #0d0618 + glows neon -> effrayant pour
 * mon public (parents, jeunes, financeurs publics).
 *
 * Apres : fond creme clair + accent rouge VEA conserve. Inspire de mabb.fr
 * et france-esports.org : sobre, aere, photos d'humains, partenaires visibles.
 *
 * Le violet n'est PLUS dans VEA (DA propre). Il reste dans le hub Velito
 * (signature dev). Coherence d'ecosysteme = chaque module a son ambiance,
 * mais tous partagent la philosophie "fond clair partout sauf le hub".
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vea: {
          bg: "#FAFAF7",
          surface: "#FFFFFF",
          "surface-soft": "#F4F4F1",
          border: "#E5E5E1",
          "border-strong": "#D4D4D0",
          text: "#1A1A1A",
          "text-muted": "#525252",
          "text-dim": "#737373",
          accent: "#E63946",
          "accent-hover": "#C92D3A",
          "accent-soft": "#FEE2E4",
          "accent-dim": "#B91C2A",
          dark: "#FAFAF7",
          card: "#FFFFFF",
          "card-hover": "#F4F4F1",
          white: "#1A1A1A",
          navy: "#FAFAF7",
          darker: "#F4F4F1",
          red: "#E63946",
          "red-light": "#EF4D5A",
          "red-glow": "rgba(230,57,70,0.15)",
          purple: "#E63946",
          "purple-light": "#EF4D5A",
          "purple-glow": "rgba(230,57,70,0.15)",
          "border-bright": "#D4D4D0",
        },
        vena: {
          kaki: "#414C35",
          sage: "#b9e7cd",
          lavender: "#c3ccff",
        },
      },
      boxShadow: {
        "card-soft": "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
        "card-hover": "0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)",
        "btn-accent": "0 4px 12px rgba(230,57,70,0.25)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
