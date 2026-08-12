/** @type {import('tailwindcss').Config} */

// ============================================================================
// Identité ARENA — thème CLAIR (refonte du 12/08/2026).
//
// Pourquoi être passé du sombre au clair : le fond sombre donnait un rendu
// générique de dashboard, celui qu'on retrouve sur toutes les plateformes de
// tournoi, et il est plus fatigant à lire dans un local éclairé au néon, sur
// un téléphone, en plein tournoi. Le blanc rend aussi les impressions
// (feuille de match, QR code) lisibles sans retoucher les styles.
//
// Les couleurs de texte et d'état sont validées à au moins 4.5:1 sur fond
// blanc ou sur fond `surface` (seuil WCAG AA). Ce n'est pas cosmétique pour
// une association d'inclusion : c'est ce qui rend le site utilisable par
// quelqu'un qui voit mal. C'est aussi pour ça que l'or est un ocre foncé et
// non un jaune : sur blanc, un jaune vif est illisible.
// ============================================================================
const config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        arena: {
          // --- Surfaces ---
          bg: "#FFFFFF",
          surface: "#F6F5FB",
          "surface-fort": "#EDEBF7",
          border: "#E2E0EF",

          // --- Texte, nommé par RÔLE et non par nuance ---
          ink: "#191627",
          muted: "#55506B",
          faint: "#6F6A85",

          // --- Accent Velito ---
          violet: "#6D28D9",
          "violet-fonce": "#5B21B6",
          "violet-pale": "#F1EBFD",
          // `lilac` gardait son nom d'origine dans une quarantaine d'endroits :
          // on le repointe au lieu de renommer partout, ça évite un diff inutile.
          lilac: "#6D28D9",

          // --- États ---
          green: "#046C4E",
          "green-pale": "#E7F4EF",
          red: "#B4232E",
          "red-pale": "#FBECEC",
          gold: "#8A5A08",
          "gold-pale": "#FBF3E3",
        },
      },
      boxShadow: {
        // Sur fond clair, c'est l'ombre qui détache une carte, là où le thème
        // sombre utilisait une bordure lumineuse.
        carte: "0 1px 2px rgba(25, 22, 39, 0.05), 0 1px 3px rgba(25, 22, 39, 0.06)",
        "carte-active": "0 4px 14px rgba(109, 40, 217, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
