/**
 * robots.ts — Robots.txt Next.js dynamique.
 *
 * Indique aux bots de crawler tout le site PUBLIC, mais d'eviter les
 * routes admin / auth / API.
 */
import type { MetadataRoute } from "next";

const SITE_URL = "https://vea.velito.fr";

// [12/11/2026] Même politique que velito.fr, hub, Arena et venaball.fr :
// robots d'ENTRAÎNEMENT d'IA refusés, moteurs et robots de RECHERCHE des IA
// autorisés.
const ROBOTS_ENTRAINEMENT_IA = [
  "GPTBot", "ClaudeBot", "anthropic-ai", "CCBot", "Google-Extended", "Applebot-Extended",
  "Bytespider", "Meta-ExternalAgent", "Amazonbot", "cohere-ai", "Diffbot", "omgili",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: ROBOTS_ENTRAINEMENT_IA, disallow: "/" },
      {
        userAgent: "*",
        allow: "/",
        // [12/11/2026] "/_next/" retiré : il interdisait à Google de charger
        // le JavaScript et le CSS du site. Google rend les pages comme un
        // navigateur ; sans ces fichiers il voit une page cassée, ce qui
        // pénalise le référencement (consigne Google : ne pas bloquer les
        // ressources nécessaires à l'affichage).
        disallow: ["/admin", "/admin/*", "/api/*", "/auth/*", "/profil", "/scan"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
