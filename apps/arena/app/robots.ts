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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/t/*/export", "/jeux/*/stats"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
