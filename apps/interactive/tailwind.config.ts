/**
 * Tailwind config — Velito Interactive.
 *
 * Identité : "arcade néon" sur fond très sombre. Volontairement à l'opposé du
 * crème VENA et du rouge/navy VEA — Interactive est une marque distincte,
 * pensée pour être projetée sur une TV dans un bar (contraste fort, lisible
 * de loin) et pour des manettes mobiles (couleurs vives, fun).
 *
 * Les couleurs "ink-*" = fonds sombres. Les "neon-*" = accents vifs.
 * Le theming par établissement (multi-tenant) se fait via des variables CSS
 * (--tenant-accent, cf globals.css) que le tenant peut surcharger.
 */
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0a0b14", // fond principal (presque noir, légère teinte bleue)
          800: "#11132099",
          700: "#1a1c2e",
          600: "#262945",
        },
        neon: {
          violet: "#8b5cf6",
          cyan: "#22d3ee",
          pink: "#ec4899",
          lime: "#a3e635",
          amber: "#fbbf24",
        },
        // Accent piloté par le tenant (fallback violet). Utiliser bg-tenant, text-tenant…
        tenant: "var(--tenant-accent, #8b5cf6)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(139,92,246,.4), 0 0 24px -4px rgba(139,92,246,.6)",
        "neon-cyan": "0 0 0 1px rgba(34,211,238,.4), 0 0 24px -4px rgba(34,211,238,.6)",
      },
      backgroundImage: {
        "grid-ink":
          "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
