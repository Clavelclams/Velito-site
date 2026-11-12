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

// En prod, URL forcée en dur (insensible à une var Vercel restée en localhost).
// La var d'env n'est lue qu'en dev local.
const HUB_URL =
  process.env.NODE_ENV === "production"
    ? "https://hub.velito.fr"
    : process.env.NEXT_PUBLIC_HUB_URL ?? "https://hub.velito.fr";

/**
 * Construit l'URL d'un module pas encore pret sur le hub.
 * Ex: getConstructionUrl('arena') -> http://localhost:3000/construction?slug=arena
 *                                 ou https://velito.fr/construction?slug=arena
 */
export function getConstructionUrl(slug: string): string {
  return `${HUB_URL}/construction?slug=${encodeURIComponent(slug)}`;
}

/**
 * [12/11/2026] ARENA est en ligne : les liens « Arena » de VEA pointent vers
 * le vrai site, plus vers la page « en construction » du hub.
 * Même règle que HUB_URL : en dur en prod, variable lue seulement en dev.
 */
const ARENA_URL =
  process.env.NODE_ENV === "production"
    ? "https://arena.velito.fr"
    : process.env.NEXT_PUBLIC_ARENA_URL ?? "https://arena.velito.fr";

/** URL d'ARENA, avec un chemin optionnel (ex. getArenaUrl("/moi")). */
export function getArenaUrl(chemin = ""): string {
  return `${ARENA_URL}${chemin}`;
}

/**
 * URL racine du hub Velito.
 */
export function getHubUrl(): string {
  return HUB_URL;
}
