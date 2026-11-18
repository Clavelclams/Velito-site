/**
 * Format des mini-jeux des leçons : types et lecture du JSON. [2026-11-18]
 *
 * Module SANS "use client" : il est appelé par ContenuMarkdown (Server
 * Component) pour valider le bloc `jeu`, ET par JeuLecon (client) pour les
 * types. Quand lireJeu vivait dans JeuLecon.tsx ("use client"), le serveur ne
 * pouvait pas l'appeler : Next.js refuse qu'un Server Component exécute une
 * fonction d'un module client (« Attempted to call lireJeu() from the
 * server »), et le build échouait sur chaque page contenant un mini-jeu.
 */
/* ------------------------------------------------------------------ */
/* Types des données d'un jeu                                           */
/* ------------------------------------------------------------------ */

export interface JeuDevine { type: "devine"; question: string; reponse: string; indice?: string }
export interface JeuChoix { type: "choix"; question: string; choix: string[]; bonne: number; explication?: string }
export interface JeuVraiFaux { type: "vraifaux"; affirmation: string; vrai: boolean; explication?: string }
export interface JeuOrdre { type: "ordre"; consigne: string; etapes: string[]; explication?: string }
export interface JeuTrous { type: "trous"; consigne: string; code: string; choix: string[]; bonne: number; explication?: string }
export interface JeuPaires { type: "paires"; consigne: string; paires: [string, string][] }
export interface JeuCartes { type: "cartes"; titre?: string; cartes: { recto: string; verso: string }[] }

export type Jeu = JeuDevine | JeuChoix | JeuVraiFaux | JeuOrdre | JeuTrous | JeuPaires | JeuCartes;

/** Lit le JSON d'un bloc `jeu`. Renvoie null si le format n'est pas bon. */
export function lireJeu(brut: string): Jeu | null {
  try {
    const j = JSON.parse(brut) as Record<string, unknown>;
    const texte = (v: unknown) => typeof v === "string" && v.trim() !== "";
    const liste = (v: unknown) => Array.isArray(v) && v.length >= 2 && v.every(texte);
    const index = (v: unknown, n: number) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < n;
    switch (j.type) {
      case "devine":
        return texte(j.question) && texte(j.reponse) ? (j as unknown as JeuDevine) : null;
      case "choix":
        return texte(j.question) && liste(j.choix) && index(j.bonne, (j.choix as string[]).length) ? (j as unknown as JeuChoix) : null;
      case "vraifaux":
        return texte(j.affirmation) && typeof j.vrai === "boolean" ? (j as unknown as JeuVraiFaux) : null;
      case "ordre":
        return texte(j.consigne) && liste(j.etapes) ? (j as unknown as JeuOrdre) : null;
      case "trous":
        return texte(j.consigne) && texte(j.code) && (j.code as string).includes("___") && liste(j.choix) && index(j.bonne, (j.choix as string[]).length)
          ? (j as unknown as JeuTrous)
          : null;
      case "paires":
        return texte(j.consigne) && Array.isArray(j.paires) && j.paires.length >= 2
          && j.paires.every((p) => Array.isArray(p) && p.length === 2 && texte(p[0]) && texte(p[1]))
          ? (j as unknown as JeuPaires)
          : null;
      case "cartes":
        return Array.isArray(j.cartes) && j.cartes.length >= 1
          && j.cartes.every((c) => c && texte((c as Record<string, unknown>).recto) && texte((c as Record<string, unknown>).verso))
          ? (j as unknown as JeuCartes)
          : null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

