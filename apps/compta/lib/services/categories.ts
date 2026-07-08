/**
 * SERVICE CATÉGORIES — couche logique métier.
 *
 * Rôle : valider et normaliser une saisie de catégorie AVANT qu'elle
 * n'atteigne la base. Fonctions PURES (pas d'accès Supabase, pas d'état) →
 * testables unitairement (voir categories.test.mjs).
 *
 * Pourquoi valider ici alors que la base a déjà des contraintes ?
 * Défense en profondeur + expérience utilisateur : le service renvoie un
 * message clair EN FRANÇAIS avant l'insert. La contrainte SQL reste le
 * dernier rempart si ce code était contourné, mais elle, elle renvoie une
 * erreur Postgres brute qu'on ne veut jamais montrer à l'utilisateur.
 *
 * Convention de retour : un "Resultat" discriminé par `ok`. TypeScript
 * force alors l'appelant à traiter les DEUX cas (succès / erreurs) avant de
 * pouvoir lire la valeur — impossible d'oublier la gestion d'erreur.
 */
import type { NouvelleCategorie, TypeFlux } from "@/types/database";

/** Longueur max d'un nom de catégorie (garde-fou UI + cohérence d'affichage). */
export const NOM_CATEGORIE_MAX = 60;

/** Résultat de validation : soit une valeur propre, soit des erreurs. */
export type Resultat<T> =
  | { ok: true; valeur: T }
  | { ok: false; erreurs: string[] };

/**
 * Normalise un nom : enlève les espaces de bord et écrase les espaces
 * multiples internes ("  Achats   matériel " → "Achats matériel").
 * On stocke une forme propre → l'unicité SQL (entite_id, nom, type) ne se
 * fait pas déjouer par un simple double-espace.
 */
export function nettoyerNom(nom: string): string {
  return nom.trim().replace(/\s+/g, " ");
}

/** Un type de flux est-il une valeur autorisée ? (miroir du CHECK SQL) */
function estTypeFluxValide(valeur: string): valeur is TypeFlux {
  return valeur === "recette" || valeur === "depense";
}

/**
 * Valide une saisie brute de catégorie et prépare le DTO d'insertion.
 * `entiteId` vient du contexte (l'URL), pas d'un champ de formulaire :
 * l'utilisateur ne choisit jamais l'entité dans le formulaire, il est déjà
 * DANS l'entité. C'est aussi ce qui empêche de créer une catégorie chez une
 * autre entité (et la RLS le bloquerait de toute façon).
 */
export function preparerNouvelleCategorie(saisie: {
  entiteId: string;
  nom: string;
  type: string;
  compteId?: string | null;
}): Resultat<NouvelleCategorie> {
  const erreurs: string[] = [];

  const nom = nettoyerNom(saisie.nom ?? "");
  if (nom.length === 0) {
    erreurs.push("Le nom de la catégorie est obligatoire.");
  } else if (nom.length > NOM_CATEGORIE_MAX) {
    erreurs.push(`Le nom ne peut pas dépasser ${NOM_CATEGORIE_MAX} caractères.`);
  }

  if (!estTypeFluxValide(saisie.type)) {
    erreurs.push("Le type doit être « recette » ou « dépense ».");
  }

  if (erreurs.length > 0) {
    return { ok: false, erreurs };
  }

  // À ce stade, les deux champs sont valides : le cast de type est sûr.
  return {
    ok: true,
    valeur: {
      entite_id: saisie.entiteId,
      nom,
      type: saisie.type as TypeFlux,
      compte_id: saisie.compteId || null,
    },
  };
}

/**
 * Valide un simple renommage (le type d'une catégorie ne se change PAS :
 * modifier recette↔dépense fausserait l'historique des transactions déjà
 * classées dessous — on désactive et on en recrée une autre à la place).
 */
export function preparerRenommage(nomBrut: string): Resultat<{ nom: string }> {
  const nom = nettoyerNom(nomBrut ?? "");
  if (nom.length === 0) {
    return { ok: false, erreurs: ["Le nom de la catégorie est obligatoire."] };
  }
  if (nom.length > NOM_CATEGORIE_MAX) {
    return {
      ok: false,
      erreurs: [`Le nom ne peut pas dépasser ${NOM_CATEGORIE_MAX} caractères.`],
    };
  }
  return { ok: true, valeur: { nom } };
}
