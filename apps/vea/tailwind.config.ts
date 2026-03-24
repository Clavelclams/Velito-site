import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 👉 Palette VEA — direction artistique navy/bleu
        vea: {
          // Fonds (du plus sombre au plus clair)
          darker: "#060e1e",     // TopBar, Footer
          dark: "#0a1628",       // Fond principal, Navbar
          navy: "#0d1f3c",       // Sections alternées
          card: "#112240",       // Cards, surfaces
          border: "#1e3a5f",     // Bordures subtiles
          // Accents
          accent: "#4d9fff",     // Bleu principal (boutons, titres accent)
          "accent-hover": "#3a8fee", // Hover bouton
          // Texte
          white: "#FAFAFA",
          "text-muted": "#8892a4", // Texte secondaire
          "text-dim": "#5a6478",   // Texte très discret
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
