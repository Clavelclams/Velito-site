/**
 * robots.txt — Next le génère à partir de ce fichier.
 *
 * Tout le site public est indexable : c'est la promesse du profil joueur
 * (« un joueur, un profil, des résultats qui ne se perdent pas »). L'espace
 * orga et les exports ne le sont pas : l'un est privé, les autres sont des
 * fichiers à télécharger, pas des pages à référencer.
 */
import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arena.velito.fr";

// [12/11/2026] Même politique que velito.fr, hub et venaball.fr : les robots
// qui aspirent le web pour ENTRAÎNER des IA sont refusés ; Google, Bing et
// les robots de RECHERCHE des IA restent autorisés (le profil joueur doit
// rester trouvable).
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
        disallow: ["/admin", "/moi", "/widget/", "/api/", "/t/*/export", "/jeux/*/stats"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
