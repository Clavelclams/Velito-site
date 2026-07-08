/**
 * PostCSS config pour Tailwind v3 (même pattern que vea).
 * 1. tailwindcss : transforme les directives @tailwind en vrai CSS
 * 2. autoprefixer : ajoute les préfixes navigateur automatiquement
 */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
