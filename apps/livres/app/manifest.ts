/**
 * Manifeste d'application web (13/11/2026) : c'est lui qui permet
 * « Ajouter à l'écran d'accueil » sur Android et iPhone. Le site s'ouvre alors
 * en plein écran, comme une app, sans passer par un store (pas de compte
 * développeur, pas de validation à attendre, une seule base de code).
 */
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Boîtes à livres d'Amiens",
    short_name: "Boîtes à livres",
    description: "Trouver, remplir et faire vivre les boîtes à livres d'Amiens.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF7EF",
    theme_color: "#1F6B4A",
    lang: "fr",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
