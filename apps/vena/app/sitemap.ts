/**
 * sitemap.xml de velito.fr. [11/11/2026]
 * Liste les pages publiques pour Google et Bing. Une page publique ajoutée
 * au site doit être ajoutée ici.
 */
import type { MetadataRoute } from "next";

const SITE_URL = "https://velito.fr";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { chemin: string; priorite: number }[] = [
    { chemin: "", priorite: 1 },
    { chemin: "/offres", priorite: 0.9 },
    { chemin: "/realisations", priorite: 0.9 },
    { chemin: "/contact", priorite: 0.8 },
    { chemin: "/lien", priorite: 0.4 },
    { chemin: "/mentions-legales", priorite: 0.2 },
  ];
  return pages.map((p) => ({
    url: `${SITE_URL}${p.chemin}`,
    changeFrequency: "monthly",
    priority: p.priorite,
  }));
}
