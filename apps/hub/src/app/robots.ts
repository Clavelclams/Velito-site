/**
 * robots.txt du hub (hub.velito.fr). [12/11/2026]
 *
 * Même politique que velito.fr et venaball.fr :
 *  1. robots d'ENTRAÎNEMENT d'IA refusés ;
 *  2. moteurs de recherche et robots de RECHERCHE des IA autorisés, sauf
 *     sur les pages de compte, de connexion et OAuth (rien à indexer, et
 *     des URL avec des paramètres de retour qu'on ne veut pas voir dans
 *     Google). /projets est derrière une connexion : fermé aussi.
 * Demande de politesse, pas une protection : la sécurité de ces pages
 * reste dans le code (session, droits).
 */
import type { MetadataRoute } from "next";

const SITE_URL = "https://hub.velito.fr";

const ROBOTS_ENTRAINEMENT_IA = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "Meta-ExternalAgent",
  "Amazonbot",
  "cohere-ai",
  "Diffbot",
  "omgili",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: ROBOTS_ENTRAINEMENT_IA, disallow: "/" },
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/account",
          "/login",
          "/signup",
          "/logout",
          "/forgot-password",
          "/reset-password",
          "/oauth/",
          "/projets",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
