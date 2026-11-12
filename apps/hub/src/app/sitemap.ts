/**
 * sitemap.xml du hub. [12/11/2026]
 * Une seule page publique utile : l'accueil, qui présente tout l'écosystème
 * et renvoie vers chaque site (qui a son propre sitemap).
 */
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://hub.velito.fr", changeFrequency: "monthly", priority: 1 }];
}
