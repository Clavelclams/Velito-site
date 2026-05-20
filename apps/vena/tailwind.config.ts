/**
 * Tailwind config VENA — palette définie par la charte officielle (mai 2026).
 *
 * Couleur principale : Kaki #414C35 (logo, accents forts).
 * Fond : crème / écru (calme, professionnel, pas sombre).
 * Palette pastel digitale : 6 couleurs utilisées pour les accents secondaires
 * et pour différencier les services / cards. Toujours sur fond clair.
 *
 * Règle stricte de la charte : pas de mix digital + textile, le logo reste
 * toujours en kaki. Le site web utilise la palette pastel librement.
 */
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vena: {
          // Identité — toujours présent
          kaki: "#414C35",
          "kaki-dark": "#2f3826",
          "kaki-soft": "#eef0e7",
          // Fonds
          cream: "#f8f5ef",      // fond crème (lifestyle)
          ecru: "#ecdfc8",        // écru (combo signature)
          // Palette digitale pastel
          "tilleul": "#eaf998",   // vert tilleul
          "peche": "#ffc3a0",     // pêche
          "jaune-pale": "#ffffa1",
          "lavande": "#c3ccff",   // bleu lavande
          "vert-eau": "#b9e7cd",
          "mauve": "#f3dbff",
          // Textes
          text: "#1a1d15",         // quasi-noir, lisible sur crème
          "text-muted": "#5c6051",
          "text-dim": "#8a8e80",
          border: "#d8d5cb",
        },
      },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
        display: ["'Bricolage Grotesque'", "'Inter'", "sans-serif"],
      },
      boxShadow: {
        "card-clean": "0 1px 2px rgba(20, 20, 15, 0.04), 0 4px 12px rgba(20, 20, 15, 0.04)",
        "card-hover": "0 2px 4px rgba(20, 20, 15, 0.06), 0 8px 24px rgba(20, 20, 15, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
