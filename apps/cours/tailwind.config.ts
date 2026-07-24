import type { Config } from "tailwindcss";

/**
 * Config Tailwind — Velito Cours.
 * DA sobre "carnet d'étude" : fond clair (philosophie écosystème), accent
 * indigo studieux, et trois couleurs de blocs CDA réutilisées partout
 * (badges, stats) pour ancrer visuellement le référentiel.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cours: {
          bg: "#F8F8FC",
          surface: "#FFFFFF",
          border: "#E5E4F0",
          text: "#1A1A1A",
          "text-muted": "#5B5A6E",
          accent: "#4F46E5",
          "accent-hover": "#4338CA",
          bloc1: "#0E7490", // Bloc 1 — développer (cyan foncé)
          bloc2: "#7C3AED", // Bloc 2 — concevoir (violet)
          bloc3: "#B45309", // Bloc 3 — déployer (ambre foncé)
        },
      },
    },
  },
  plugins: [],
};

export default config;
