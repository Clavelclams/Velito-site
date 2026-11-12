/**
 * robots.txt d'Interactive (interactive.velito.fr). [12/11/2026]
 *
 * Même politique que le reste de l'écosystème : robots d'ENTRAÎNEMENT d'IA
 * refusés, moteurs et robots de RECHERCHE des IA autorisés (un gérant de bar
 * doit pouvoir trouver l'offre). Les écrans de jeu (/host sur la télé,
 * /play/<code> sur les téléphones) et le tableau de bord ne sont pas des
 * pages à référencer : une partie dure une soirée, son code ne veut plus
 * rien dire le lendemain.
 */
import type { MetadataRoute } from "next";

const SITE_URL = "https://interactive.velito.fr";

const ROBOTS_ENTRAINEMENT_IA = [
  "GPTBot", "ClaudeBot", "anthropic-ai", "CCBot", "Google-Extended", "Applebot-Extended",
  "Bytespider", "Meta-ExternalAgent", "Amazonbot", "cohere-ai", "Diffbot", "omgili",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: ROBOTS_ENTRAINEMENT_IA, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: ["/host", "/play/", "/dashboard", "/api/"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
