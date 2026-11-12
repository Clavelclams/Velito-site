/**
 * Règles de l'espace joueur (connexion, rattachement, inscription en ligne).
 *
 * Module PUR, comme transitions.ts ou age.ts : aucune base, aucune horloge
 * implicite. Les Server Actions chargent les données, appellent ces
 * fonctions, et n'écrivent que si la réponse est « ok ». Les règles sont
 * donc testées une fois ici, et le jury peut les lire sans plonger dans
 * Supabase.
 *
 * Chaque refus porte un MESSAGE destiné au joueur : il s'affiche tel quel
 * en bandeau, il doit donc dire quoi faire, pas seulement « interdit ».
 */
import { consentementParentalRequis } from "./age";
import type { StatutTournoi } from "./types";

export type Verdict = { ok: true } | { ok: false; raison: string };

const OUI: Verdict = { ok: true };
const non = (raison: string): Verdict => ({ ok: false, raison });

// ---------------------------------------------------------------------------
// Pseudo
// ---------------------------------------------------------------------------

/** Mêmes bornes que la contrainte SQL de arena.joueurs (2 à 32 caractères). */
export const PSEUDO_MIN = 2;
export const PSEUDO_MAX = 32;

/**
 * Nettoie et valide un pseudo saisi. Rend le pseudo propre, ou null.
 * Refuse les caractères de contrôle (retours à la ligne, tabulations,
 * caractères invisibles) : un pseudo s'affiche partout, dans un bracket,
 * un CSV, un classement ; un caractère invisible y casse la mise en page ou
 * permet de se faire passer pour un autre (« Lea » et « Lea » + espace
 * invisible).
 */
export function validerPseudo(saisie: string | null | undefined): string | null {
  const brut = (saisie ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
  if (brut.length < PSEUDO_MIN || brut.length > PSEUDO_MAX) return null;
  if (/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/.test(brut)) {
    return null;
  }
  return brut;
}

// ---------------------------------------------------------------------------
// Rattachement d'un pseudo existant à un compte
// ---------------------------------------------------------------------------

export interface JoueurCible {
  user_id: string | null;
  anonymise: boolean;
}

/**
 * Un compte peut-il demander à récupérer ce pseudo ?
 * - le compte ne doit pas déjà avoir un joueur ni une demande en cours ;
 * - le pseudo doit exister, ne pas être effacé, ne pas avoir de propriétaire.
 */
export function peutDemanderRattachement(args: {
  joueur: JoueurCible | null;
  compteDejaRelie: boolean;
  demandeEnCours: boolean;
}): Verdict {
  if (args.compteDejaRelie) return non("Ton compte est déjà relié à un pseudo ARENA.");
  if (args.demandeEnCours) {
    return non("Tu as déjà une demande en attente. Annule-la pour en faire une autre.");
  }
  if (!args.joueur || args.joueur.anonymise) {
    return non("Aucun joueur ARENA ne porte ce pseudo. Vérifie l'orthographe, ou crée ton profil.");
  }
  if (args.joueur.user_id !== null) {
    return non("Ce pseudo est déjà relié à un compte. Si c'est une erreur, parles-en au staff.");
  }
  return OUI;
}

// ---------------------------------------------------------------------------
// Autorisation parentale (moins de 15 ans)
// ---------------------------------------------------------------------------

export type EtatParental = "NON_REQUISE" | "RECUEILLIE" | "EN_ATTENTE" | "AGE_INCONNU";

/**
 * Où en est l'autorisation parentale d'un joueur ?
 * AGE_INCONNU : joueur créé avant que l'année soit demandée. On ne bloque
 * pas (le staff le voit déjà avec le badge « âge ? ») : bloquer d'anciens
 * joueurs au check-in du jour J, sans les avoir prévenus, ferait plus de
 * mal que de bien.
 */
export function etatAutorisationParentale(
  anneeNaissance: number | null,
  consentementParentalAt: string | null,
  anneeCourante: number
): EtatParental {
  if (anneeNaissance === null) return "AGE_INCONNU";
  if (!consentementParentalRequis(anneeNaissance, anneeCourante)) return "NON_REQUISE";
  return consentementParentalAt ? "RECUEILLIE" : "EN_ATTENTE";
}

/** Le staff peut-il pointer ce joueur présent ? Non tant que l'autorisation manque. */
export function peutFaireCheckIn(etat: EtatParental): Verdict {
  if (etat === "EN_ATTENTE") {
    return non(
      "Moins de 15 ans : confirme d'abord l'autorisation parentale (bouton « Autorisation reçue »)."
    );
  }
  return OUI;
}

// ---------------------------------------------------------------------------
// Inscription en ligne à un tournoi
// ---------------------------------------------------------------------------

export interface TournoiInscription {
  statut: StatutTournoi;
  inscription_en_ligne: boolean;
  max_joueurs: number | null;
}

/** Un joueur connecté et relié peut-il s'inscrire seul à ce tournoi ? */
export function peutSInscrireEnLigne(args: {
  tournoi: TournoiInscription;
  nbInscrits: number;
  dejaInscrit: boolean;
}): Verdict {
  const { tournoi } = args;
  if (args.dejaInscrit) return non("Tu es déjà inscrit à ce tournoi.");
  if (tournoi.statut !== "OUVERT") return non("Les inscriptions de ce tournoi sont fermées.");
  if (!tournoi.inscription_en_ligne) {
    return non("Ce tournoi ne prend pas d'inscription en ligne : inscris-toi auprès du staff.");
  }
  if (tournoi.max_joueurs !== null && args.nbInscrits >= tournoi.max_joueurs) {
    return non("Le tournoi est complet.");
  }
  return OUI;
}

/**
 * Un joueur peut-il retirer son inscription ? Seulement avant le début, et
 * seulement s'il n'a pas encore été pointé présent : après le check-in,
 * c'est le staff qui gère (le joueur est physiquement dans la salle).
 */
export function peutSeDesinscrire(args: { statut: StatutTournoi; checkIn: boolean }): Verdict {
  if (args.statut !== "OUVERT") return non("Le tournoi a commencé : vois avec le staff.");
  if (args.checkIn) return non("Tu as déjà été pointé présent : vois avec le staff.");
  return OUI;
}

// ---------------------------------------------------------------------------
// Adresse de connexion
// ---------------------------------------------------------------------------

/**
 * Lien vers la connexion du hub, qui renvoie ensuite sur `retour`.
 * Le hub n'accepte en retour que ses domaines connus (safeReturnTo), dont
 * arena.velito.fr : un lien trafiqué ne peut pas renvoyer ailleurs.
 */
export function lienConnexion(hubLogin: string, retour: string): string {
  const separateur = hubLogin.includes("?") ? "&" : "?";
  return `${hubLogin}${separateur}return=${encodeURIComponent(retour)}`;
}
