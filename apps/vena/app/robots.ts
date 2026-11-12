/**
 * robots.txt de velito.fr. [11/11/2026]
 *
 * Même politique que la vitrine venaball.fr :
 *  1. Robots qui aspirent le web pour ENTRAÎNER des IA : refusés.
 *  2. Moteurs de recherche (Google, Bing) et robots de RECHERCHE des IA
 *     (ChatGPT search, Claude, Perplexity) : autorisés. Sans eux, le site
 *     disparaît de Google, des aperçus IA et des réponses des assistants.
 *
 * C'est une demande de politesse : les robots sérieux la respectent, les
 * autres non. Elle ne protège rien de secret (rien de secret n'est public).
 * Google-Extended ne bloque que l'entraînement de Gemini, pas Google Search.
 */
import type { MetadataRoute } from "next";

const SITE_URL = "https://velito.fr";

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
        disallow: ["/admin", "/login", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
