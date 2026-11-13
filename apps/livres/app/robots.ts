/**
 * robots.txt (13/11/2026). Même politique que le reste de l'écosystème Velito :
 * robots d'entraînement d'IA refusés ; Google, Bing et robots de recherche des
 * IA autorisés (un habitant qui demande « boîte à livres Amiens » doit tomber
 * ici). L'espace bénévoles n'est pas à référencer.
 */
import type { MetadataRoute } from "next";

const ROBOTS_ENTRAINEMENT_IA = [
  "GPTBot", "ClaudeBot", "anthropic-ai", "CCBot", "Google-Extended", "Applebot-Extended",
  "Bytespider", "Meta-ExternalAgent", "Amazonbot", "cohere-ai", "Diffbot", "omgili",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: ROBOTS_ENTRAINEMENT_IA, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: ["/admin"] },
    ],
    sitemap: "https://livres.velito.fr/sitemap.xml",
  };
}
