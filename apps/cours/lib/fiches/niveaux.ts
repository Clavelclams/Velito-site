/**
 * NIVEAUX DES LEÇONS — constantes SANS fs (importables côté client).
 *
 * Quatre paliers, dans l'ordre. Chaque palier a un libellé et une couleur
 * (classes Tailwind complètes, jamais construites dynamiquement : Tailwind
 * ne génère que les classes qu'il voit écrites en entier dans le code).
 */
export const NIVEAUX = ["debutant", "intermediaire", "solide", "expert"] as const;
export type Niveau = (typeof NIVEAUX)[number];

export const LIBELLES_NIVEAUX: Record<Niveau, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  solide: "Solide",
  expert: "Expert",
};

/** Pastille : fond + texte, contrastes lisibles sur fond clair. */
export const COULEURS_NIVEAUX: Record<Niveau, string> = {
  debutant: "bg-emerald-100 text-emerald-800",
  intermediaire: "bg-sky-100 text-sky-800",
  solide: "bg-violet-100 text-violet-800",
  expert: "bg-amber-100 text-amber-800",
};

/** Barre de répartition : une couleur pleine par palier. */
export const BARRES_NIVEAUX: Record<Niveau, string> = {
  debutant: "bg-emerald-400",
  intermediaire: "bg-sky-400",
  solide: "bg-violet-400",
  expert: "bg-amber-400",
};

/** Tolérant : une valeur inconnue devient « debutant ». */
export function niveauValide(valeur: string): Niveau {
  return (NIVEAUX as readonly string[]).includes(valeur) ? (valeur as Niveau) : "debutant";
}
