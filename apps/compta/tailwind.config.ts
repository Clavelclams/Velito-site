import type { Config } from "tailwindcss";

/**
 * Config Tailwind — Velito Compta.
 *
 * Philosophie DA écosystème : "fond clair partout sauf le hub".
 * Compta est un outil de gestion interne : palette neutre, sobre,
 * lisibilité maximale (on lit des chiffres toute la journée).
 * Un seul accent (vert finance) + deux couleurs sémantiques :
 * recette (vert) / dépense (rouge). Pas de décoratif.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        compta: {
          bg: "#F8FAF9",            // fond principal : blanc cassé légèrement vert
          surface: "#FFFFFF",       // cartes, tableaux
          border: "#E3E8E5",        // bordures douces
          text: "#1A1A1A",          // texte principal
          "text-muted": "#5A6360",  // texte secondaire
          accent: "#0F766E",        // teal sobre : actions, liens, boutons
          "accent-hover": "#0D5F58",
          recette: "#15803D",       // vert : montants entrants
          depense: "#B91C1C",       // rouge : montants sortants
        },
      },
    },
  },
  plugins: [],
};

export default config;
