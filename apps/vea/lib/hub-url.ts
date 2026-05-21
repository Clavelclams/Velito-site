/**
 * lib/hub-url.ts — Helper pour construire des URLs vers le hub Velito.
 *
 * Le hub est une app separee (apps/hub) qui tourne sur :
 *   - Local : http://localhost:3000 (port par defaut Next.js)
 *   - Prod  : https://velito.fr
 *
 * Comme VEA tourne en local sur un autre port (3001), on ne peut pas faire
 * de liens relatifs. Il faut une URL absolue.
 *
 * Pour que ca marche en local, ajoute dans apps/vea/.env.local :
 *   NEXT_PUBLIC_HUB_URL=http://localhost:3000
 *
 * En prod, le default https://velito.fr prend le relais.
 */

const HUB_URL =
  process.env.NEXT_PUBLIC_HUB_URL ?? "https://hub.velito.fr";

/**
 * Construit l'URL d'un module pas encore pret sur le hub.
 * Ex: getConstructionUrl('arena') -> http://localhost:3000/construction?slug=arena
 *                                 ou https://velito.fr/construction?slug=arena
 */
export function getConstructionUrl(slug: string): string {
  return `${HUB_URL}/construction?slug=${encodeURIComponent(slug)}`;
}

/**
 * URL racine du hub Velito.
 */
export function getHubUrl(): string {
  return HUB_URL;
}
