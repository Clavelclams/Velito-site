/**
 * sitemap.ts — Sitemap dynamique Next.js
 *
 * Genere /sitemap.xml a partir des pages statiques + des events de
 * `lib/events-archive.ts`. Permet a Google de crawler toutes les URLs
 * importantes du site.
 *
 * Au fur et a mesure qu'on ajoute des pages dynamiques (/agenda/[slug],
 * /projets/[slug]), on les ajoutera ici.
 */
import type { MetadataRoute } from "next";
import { EVENTS_ARCHIVE } from "@/lib/events-archive";

const SITE_URL = "https://vea.velito.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Pages statiques principales
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "monthly", priority: 1.0 },
    { url: `${SITE_URL}/association`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/esport`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/agenda`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/medias`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/partenaires`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE_URL}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/arena`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  // Events archive — chaque event a sa galerie filtree
  // Quand on aura les pages dynamiques /agenda/[slug], ce mapping sera
  // remplace par les URLs propres /agenda/<slug>
  const galleryUrls: MetadataRoute.Sitemap = EVENTS_ARCHIVE
    .filter((e) => e.gallerySlug)
    .map((e) => ({
      url: `${SITE_URL}/medias?event=${e.gallerySlug}`,
      lastModified: e.date ? new Date(e.date) : now,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    }));

  return [...staticPages, ...galleryUrls];
}
