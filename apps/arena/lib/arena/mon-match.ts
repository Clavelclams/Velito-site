/**
 * « Mon match » — ce qu'un PARTICIPANT doit savoir, et rien d'autre.
 *
 * Le problème réel, observé le jour J : un joueur scanne le QR, tombe sur le
 * bracket complet du tournoi et doit y chercher son propre nom au milieu de
 * 32 lignes, sur un écran de téléphone. Il finit par demander au staff
 * « c'est quand mon match ? » — question qui revient des dizaines de fois par
 * tournoi et qui interrompt l'arbitrage.
 *
 * Cette fonction répond à cette question et à elle seule : qui, quand, où.
 *
 * Module PUR (aucune dépendance à Supabase, React ou l'horloge) donc testable
 * au cas par cas. Même choix que lib/bracket.ts : la règle métier vit ici, la
 * page ne fait que l'afficher.
 *
 * Pourquoi une liste d'identifiants en entrée plutôt qu'un id de joueur : en
 * esport le camp d'un match EST le joueur, en sport c'est son ÉQUIPE. Plutôt
 * que de dupliquer la logique, l'appelant fournit « tout ce qui me
 * représente » (mon id joueur + l'id de mon équipe) et le reste est commun.
 */
import type { MatchRow } from "./types";

/** Où en est le participant dans le tournoi. */
export type SituationParticipant =
  | "A_JOUER" // un match l'attend
  | "EN_ATTENTE" // qualifié, mais l'adversaire n'est pas encore connu
  | "ELIMINE" // dernier match perdu, plus rien à jouer
  | "TERMINE" // le tournoi est fini pour lui (poules jouées, ou champion)
  | "INCONNU"; // aucun match à son nom

export interface ResultatMonMatch {
  situation: SituationParticipant;
  /** Le match à jouer (null si aucun). */
  prochain: MatchRow | null;
  /** L'identifiant du camp adverse du prochain match (null si pas encore connu). */
  adversaireId: string | null;
  /** Matchs déjà joués, du plus ancien au plus récent. */
  historique: MatchRow[];
  victoires: number;
  defaites: number;
}

/** Les deux camps d'un match, que le tournoi soit individuel ou par équipes. */
function campsDe(m: MatchRow) {
  return {
    c1: m.equipe1_id ?? m.joueur1_id,
    c2: m.equipe2_id ?? m.joueur2_id,
    gagnant: m.equipe_gagnante_id ?? m.gagnant_id,
  };
}

/**
 * Ordre de lecture d'un tournoi : les poules d'abord (elles se jouent avant),
 * puis le tableau principal, le rattrapage et enfin la grande finale.
 * À l'intérieur d'un bracket, on trie par round puis par position — c'est
 * l'ordre chronologique réel de déroulement.
 */
const ORDRE_BRACKET: Record<string, number> = { P: 0, W: 1, L: 2, GF: 3 };

function comparerMatchs(a: MatchRow, b: MatchRow): number {
  const ba = ORDRE_BRACKET[a.bracket ?? "W"] ?? 1;
  const bb = ORDRE_BRACKET[b.bracket ?? "W"] ?? 1;
  return ba - bb || a.round - b.round || a.position - b.position;
}

/**
 * Trouve la situation d'un participant dans un tournoi.
 *
 * @param matchs   tous les matchs du tournoi
 * @param mesIds   tout ce qui représente le participant : son id joueur ET,
 *                 en sport, l'id de son équipe. Les valeurs vides sont ignorées.
 */
export function trouverMonMatch(
  matchs: readonly MatchRow[],
  mesIds: readonly (string | null | undefined)[]
): ResultatMonMatch {
  const moi = new Set(mesIds.filter((id): id is string => Boolean(id)));

  const vide: ResultatMonMatch = {
    situation: "INCONNU",
    prochain: null,
    adversaireId: null,
    historique: [],
    victoires: 0,
    defaites: 0,
  };
  if (moi.size === 0) return vide;

  // Mes matchs, dans l'ordre où ils se jouent. Un bye n'est pas un match :
  // l'afficher comme « ton prochain match » enverrait le joueur attendre une
  // rencontre qui n'aura jamais lieu.
  const miens = matchs
    .filter((m) => {
      if (m.is_bye) return false;
      const c = campsDe(m);
      return (c.c1 !== null && moi.has(c.c1)) || (c.c2 !== null && moi.has(c.c2));
    })
    .sort(comparerMatchs);

  if (miens.length === 0) return vide;

  const joues = miens.filter((m) => m.statut === "VALIDE");
  let victoires = 0;
  let defaites = 0;
  for (const m of joues) {
    const g = campsDe(m).gagnant;
    if (g && moi.has(g)) victoires += 1;
    else if (g) defaites += 1;
  }

  // Le prochain match : le premier non validé. Un match LITIGIEUX en fait
  // partie — le résultat n'est pas figé, le joueur est encore concerné.
  const prochain = miens.find((m) => m.statut !== "VALIDE") ?? null;

  if (prochain) {
    const c = campsDe(prochain);
    const adversaireId = c.c1 !== null && moi.has(c.c1) ? c.c2 : c.c1;
    return {
      // Adversaire non encore connu = le match précédent de l'autre branche
      // n'est pas joué. Le participant est qualifié mais ne peut rien faire.
      situation: adversaireId ? "A_JOUER" : "EN_ATTENTE",
      prochain,
      adversaireId,
      historique: joues,
      victoires,
      defaites,
    };
  }

  // Plus aucun match à jouer. Deux cas très différents pour le joueur :
  // il a perdu son dernier match (éliminé), ou il les a tous gagnés et
  // attend que le bracket avance / que le tournoi soit clos.
  const dernier = joues[joues.length - 1];
  const gagnantDernier = dernier ? campsDe(dernier).gagnant : null;
  const aPerduLeDernier = Boolean(gagnantDernier && !moi.has(gagnantDernier));

  return {
    situation: aPerduLeDernier ? "ELIMINE" : "TERMINE",
    prochain: null,
    adversaireId: null,
    historique: joues,
    victoires,
    defaites,
  };
}

/**
 * Libellé du tour d'un match, du point de vue du JOUEUR.
 *
 * `nbRounds` = profondeur du tableau principal, pour nommer les derniers
 * tours (finale, demi-finale, quart) plutôt que d'afficher « tour 4 », qui ne
 * dit rien à personne.
 */
export function libelleTour(m: MatchRow, nbRounds: number): string {
  const bracket = m.bracket ?? "W";
  if (bracket === "P") {
    return `Poule ${m.poule ?? 1} · journée ${m.round}`;
  }
  if (bracket === "GF") return "Grande finale";
  if (bracket === "L") return `Rattrapage · tour ${m.round}`;

  const restants = nbRounds - m.round;
  if (restants === 0) return "Finale";
  if (restants === 1) return "Demi-finale";
  if (restants === 2) return "Quart de finale";
  return `Tour ${m.round}`;
}
