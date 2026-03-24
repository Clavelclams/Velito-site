/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        velito: {
          darker: "#060e1e",
          dark: "#0a1628",
          navy: "#0d1f3c",
          card: "#112240",
          border: "#1e3a5f",
          accent: "#4d9fff",
          white: "#FAFAFA",
          "text-muted": "#8892a4",
          "text-dim": "#5a6478",
        },
        // Couleurs modules pour les badges
        vea: "#E63946",
        vena: "#414C35",
      },
    },
  },
  plugins: [],
};

export default config;
