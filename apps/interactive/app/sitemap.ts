/**
 * sitemap.xml d'Interactive. [12/11/2026]
 * Pages publiques : la présentation de l'offre et l'inscription d'un lieu.
 */
import type { MetadataRoute } from "next";

const SITE_URL = "https://interactive.velito.fr";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/signup`, changeFrequency: "yearly", priority: 0.6 },
  ];
}
