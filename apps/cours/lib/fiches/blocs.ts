/**
 * Constantes des blocs CDA — SANS fs, donc importables PARTOUT
 * (Server Components ET composants "use client").
 *
 * Pourquoi ce fichier séparé de fiches.ts ? fiches.ts importe node:fs et est
 * donc server-only. Le composant de recherche (client) a besoin des noms et
 * couleurs de blocs : les mettre ici évite de dupliquer ces maps dans chaque
 * fichier — une seule source de vérité.
 *
 * Les classes Tailwind sont écrites EN ENTIER (`bg-cours-bloc1`, jamais
 * `bg-cours-bloc${n}`) : Tailwind scanne le code source à la compilation et
 * ne génère que les classes qu'il voit littéralement.
 */

export const NOMS_BLOCS: Record<1 | 2 | 3, string> = {
  1: "Bloc 1 · Développer",
  2: "Bloc 2 · Concevoir",
  3: "Bloc 3 · Déployer",
};

export const COULEURS_BLOCS: Record<1 | 2 | 3, string> = {
  1: "bg-cours-bloc1",
  2: "bg-cours-bloc2",
  3: "bg-cours-bloc3",
};

/**
 * Déclinaisons par bloc pour colorer badges, bordures et fonds légers.
 * Le suffixe /10 = la même couleur à 10 % d'opacité (généré par Tailwind).
 */
export const ACCENTS_BLOCS: Record<
  1 | 2 | 3,
  { texte: string; fond: string; bordure: string }
> = {
  1: {
    texte: "text-cours-bloc1",
    fond: "bg-cours-bloc1/10",
    bordure: "border-cours-bloc1",
  },
  2: {
    texte: "text-cours-bloc2",
    fond: "bg-cours-bloc2/10",
    bordure: "border-cours-bloc2",
  },
  3: {
    texte: "text-cours-bloc3",
    fond: "bg-cours-bloc3/10",
    bordure: "border-cours-bloc3",
  },
};
