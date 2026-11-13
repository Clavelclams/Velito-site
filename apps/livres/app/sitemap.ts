/** sitemap.xml (13/11/2026) : accueil, pages fixes, et une entrée par boîte. */
import type { MetadataRoute } from "next";
import { lireBoites } from "@/lib/livres/donnees";

const SITE = "https://livres.velito.fr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const boites = (await lireBoites()) ?? [];
  return [
    { url: SITE, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/a-propos`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    ...boites.map((b) => ({ url: `${SITE}/boite/${b.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
