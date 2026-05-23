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
          // Refonte DA 22/05/2026 : neutres gris-creme -> rosé tres subtil et chaud.
          // L'accent rouge #E63946 est conservé. Le rose harmonise avec le rouge
          // (même famille chaude) sans crier -> rendu institutionnel + chaleureux.
          bg: "#FBF5F4",            // fond principal : blanc casse legerement rose
          surface: "#FFFFFF",       // cartes conservees (agenda/joueurs/prestations/profil)
          "surface-soft": "#F6ECEB", // sections alternees : rose un cran plus profond
          border: "#ECDFDE",        // bordure douce, teintee chaud
          "border-strong": "#DECECD",
          text: "#1A1A1A",
          "text-muted": "#525252",
          "text-dim": "#6E6A69",     // legerement chaud pour coller au fond rose
          accent: "#E63946",
          "accent-hover": "#C92D3A",
          "accent-soft": "#FCE7E7",  // pastille accent, teintee rose
          "accent-dim": "#B91C2A",
          dark: "#FBF5F4",
          card: "#FFFFFF",
          "card-hover": "#F6ECEB",
          white: "#1A1A1A",
          navy: "#FBF5F4",
          darker: "#F6ECEB",
          red: "#E63946",
          "red-light": "#EF4D5A",
          "red-glow": "rgba(230,57,70,0.15)",
          purple: "#E63946",
          "purple-light": "#EF4D5A",
          "purple-glow": "rgba(230,57,70,0.15)",
          "border-bright": "#DECECD",
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
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        // Police d'affichage à caractère pour les gros titres (anti "template IA").
        // Chargée via next/font dans layout.tsx (variable --font-display).
        display: ["var(--font-display)", "Space Grotesk", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
