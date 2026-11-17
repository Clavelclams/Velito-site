/**
 * « Créer mon profil Arena » depuis VEA (17/11/2026) — module pur, testé.
 *
 * Décision de Clavel le 17/11 : plutôt que de copier les 195 membres VEA
 * dans Arena (91 préinscrits, 98 sans âge connu, 8 mineurs, profils publics
 * sans accord), chaque membre crée SON profil, en un clic, depuis son profil
 * VEA. Arena reprend ce que VEA sait déjà (pseudo, année de naissance) pour
 * pré-remplir le formulaire. Le membre relit, coche le règlement, valide :
 * c'est son choix, et le contrôle d'âge d'Arena s'applique comme pour tous.
 *
 * Les données VEA sont lues côté serveur, par l'id du compte connecté (même
 * compte Velito pour VEA et Arena) : rien ne passe dans l'URL.
 */
import { validerAnneeNaissance } from "./age";
import { validerPseudo } from "./espace-joueur";

export interface MembreVea {
  pseudo: string | null;
  annee_naissance: number | null;
  /** « AAAA-MM-JJ » (colonne date de vea.participants). */
  date_naissance: string | null;
}

export interface Suggestion {
  /** Pseudo proposé pour un nouveau profil (null : rien de valable). */
  pseudo: string | null;
  /** Année de naissance connue de VEA (null : à saisir). */
  annee: number | null;
  /**
   * Le pseudo VEA existe déjà dans Arena SANS compte : c'est probablement
   * le même joueur, inscrit au bureau un jour de tournoi. On propose alors
   * « C'est mon pseudo » (validé par le staff) plutôt qu'un doublon.
   */
  rattacher: string | null;
}

/** Année depuis les deux colonnes VEA ; la colonne année l'emporte. */
export function anneeDepuisVea(m: Pick<MembreVea, "annee_naissance" | "date_naissance">, anneeCourante: number): number | null {
  const brut =
    m.annee_naissance !== null && m.annee_naissance !== undefined
      ? String(m.annee_naissance)
      : m.date_naissance
        ? m.date_naissance.slice(0, 4)
        : null;
  return validerAnneeNaissance(brut, anneeCourante);
}

/**
 * Ce qu'on propose au membre. `pseudoArena` : l'état du pseudo VEA dans
 * Arena (absent, libre de compte, ou déjà relié à quelqu'un).
 * On ne lit même pas le prénom (minimisation) : un pseudo Arena est public,
 * le prénom d'un jeune ne doit jamais le devenir par défaut.
 */
export function construireSuggestion(
  m: MembreVea,
  pseudoArena: "absent" | "sans_compte" | "pris",
  anneeCourante: number
): Suggestion {
  const pseudo = validerPseudo(m.pseudo);
  const annee = anneeDepuisVea(m, anneeCourante);
  if (!pseudo) return { pseudo: null, annee, rattacher: null };
  if (pseudoArena === "sans_compte") return { pseudo: null, annee, rattacher: pseudo };
  if (pseudoArena === "pris") return { pseudo: null, annee, rattacher: null };
  return { pseudo, annee, rattacher: null };
}
