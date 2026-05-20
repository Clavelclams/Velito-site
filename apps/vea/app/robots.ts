/**
 * robots.ts — Robots.txt Next.js dynamique.
 *
 * Indique aux bots de crawler tout le site PUBLIC, mais d'eviter les
 * routes admin / auth / API.
 */
import type { MetadataRoute } from "next";

const SITE_URL = "https://vea.velito.fr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/api/*",
          "/auth/*",
          "/profil",
          "/_next/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
