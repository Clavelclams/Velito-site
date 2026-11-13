/** @type {import('tailwindcss').Config} */

// ============================================================================
// Identité « Boîtes à livres » (13/11/2026).
//
// Un site public, lu dehors, sur un téléphone, par tous les âges. D'où :
//  - fond papier (crème) plutôt que blanc pur : moins éblouissant au soleil ;
//  - encre brun très foncé pour le texte : contraste supérieur à 12:1 ;
//  - un seul accent, vert « reliure », validé à au moins 4.5:1 sur le papier
//    (seuil WCAG AA), pour les liens et les boutons ;
//  - des couleurs d'état NOMMÉES par leur sens (bon, vide, abîmée), pour que
//    le code dise ce qu'il montre.
// ============================================================================
const config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        livre: {
          papier: "#FBF7EF",
          carte: "#FFFFFF",
          trait: "#E6DCC8",
          encre: "#2A2118",
          doux: "#5E5243",
          vert: "#1F6B4A",
          "vert-fonce": "#174F37",
          "vert-pale": "#E5F1EA",
          // États d'une boîte
          bon: "#1F6B4A",
          vide: "#8A5A08",
          "vide-pale": "#FBF1DC",
          abimee: "#A3262A",
          "abimee-pale": "#FBEAEA",
        },
      },
    },
  },
  plugins: [],
};

export default config;
