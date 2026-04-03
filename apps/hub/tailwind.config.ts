/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cinema: {
          bg: "#04040e",
          surface: "#0a0a1a",
          border: "#10111e",
          purple: "#7c3aed",
          red: "#E63946",
          green: "#00E87A",
          cyan: "#4ECAFF",
          orange: "#fb923c",
          lilac: "#c084fc",
        },
      },
      fontFamily: {
        orbitron: ["Orbitron", "sans-serif"],
        exo: ['"Exo 2"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
