/**
 * PostCSS config pour Tailwind v3
 *
 * 👉 Ce que fait PostCSS :
 * PostCSS transforme ton CSS avant qu'il arrive au navigateur.
 * Ici il fait 2 choses :
 * 1. tailwindcss : remplace @tailwind base/components/utilities par le vrai CSS
 * 2. autoprefixer : ajoute les préfixes navigateur (-webkit-, -moz-) automatiquement
 *
 * 👉 Différence avec v4 :
 * En v4, on utilisait "@tailwindcss/postcss" (un seul plugin).
 * En v3, on utilise "tailwindcss" + "autoprefixer" (deux plugins séparés).
 */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
