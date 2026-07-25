/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Identité ARENA (cf. manifest de la spec : fond sombre + violet).
      colors: {
        arena: {
          bg: "#0f0f1a",
          surface: "#16162a",
          border: "#232342",
          violet: "#7c3aed",
          lilac: "#c084fc",
          green: "#00E87A",
          red: "#E63946",
          gold: "#fbbf24",
        },
      },
    },
  },
  plugins: [],
};

export default config;
