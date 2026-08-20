/**
 * STATS MAISON d'un joueur — calculées sur NOS tournois, et rien d'autre.
 *
 * Décision actée (brainstorm du 15/08) : pas d'agrégateur de stats externes
 * type tracker.gg — dépendance aux APIs des éditeurs intenable en solo. Ici,
 * on ne calcule que ce que nos propres données prouvent : matchs joués,
 * victoires, adversaires réellement affrontés, partenaires d'équipe. Zéro
 * dépendance, zéro quota, zéro clé d'API.
 *
 * Module PUR, comme lib/bracket.ts et lib/arena/mon-match.ts : la règle
 * métier vit ici, testée ; la page ne fait qu'afficher.
 *
 * SUBTILITÉ CENTRALE — les équipes sont ÉPHÉMÈRES (une équipe vit et meurt
 * avec son tournoi). Un « adversaire » au padel est donc résolu jusqu'aux
 * JOUEURS de l'équipe adverse : dire « tu as souvent affronté Les Renards »
 * ne voudrait rien dire d'un tournoi à l'autre, alors que « tu as affronté
 * Paul 5 fois » agrège l'esport (duel direct) et le sport (via les équipes).
 */
import type { MatchRow } from "./types";

/** Un tournoi TERMINÉ vu du joueur : ses matchs + qui je suis dedans. */
export interface TournoiJoue {
  /** Libellé du jeu / de la discipline (colonne tournois.jeu). */
  jeu: string;
  matchs: readonly MatchRow[];
  /**
   * Tout ce qui me représente DANS ce tournoi : mon id joueur et, en sport,
   * l'id de mon équipe. Même convention que trouverMonMatch.
   */
  mesIds: readonly (string | null | undefined)[];
  /** Composition des équipes du tournoi (id équipe → ids joueurs). */
  membresParEquipe?: ReadonlyMap<string, readonly string[]>;
}

export interface LigneJeu {
  jeu: string;
  joues: number;
  victoires: number;
  defaites: number;
  /** Pourcentage entier 0..100. */
  winrate: number;
}

export interface Frequentation {
  joueurId: string;
  rencontres: number;
  /** Pour un adversaire : combien de fois je l'ai battu. */
  victoires: number;
}

export interface StatsJoueur {
  matchsJoues: number;
  victoires: number;
  defaites: number;
  /** null tant qu'aucun match n'est joué : afficher 0 % serait un mensonge. */
  winrate: number | null;
  /** Par jeu, trié du plus joué au moins joué. */
  parJeu: LigneJeu[];
  /** Adversaires (joueurs) les plus affrontés, tri rencontres décroissantes. */
  adversaires: Frequentation[];
  /** Partenaires d'équipe, comptés en TOURNOIS partagés (les équipes étant
   *  éphémères, « 5 matchs ensemble » gonflerait artificiellement un seul
   *  tournoi de poules ; un tournoi partagé = 1). */
  partenaires: { joueurId: string; tournois: number }[];
}

function campsDe(m: MatchRow) {
  return {
    c1: m.equipe1_id ?? m.joueur1_id,
    c2: m.equipe2_id ?? m.joueur2_id,
    gagnant: m.equipe_gagnante_id ?? m.gagnant_id,
  };
}

export function calculerStatsJoueur(tournois: readonly TournoiJoue[]): StatsJoueur {
  let victoires = 0;
  let defaites = 0;
  const parJeu = new Map<string, { joues: number; victoires: number }>();
  const adversaires = new Map<string, { rencontres: number; victoires: number }>();
  const partenaires = new Map<string, number>();

  for (const t of tournois) {
    const moi = new Set(t.mesIds.filter((id): id is string => Boolean(id)));
    if (moi.size === 0) continue;

    // Développe un id de camp vers des ids de JOUEURS : lui-même en esport,
    // ses membres en sport. C'est ici que l'équipe éphémère disparaît du
    // résultat final.
    const enJoueurs = (campId: string): readonly string[] =>
      t.membresParEquipe?.get(campId) ?? [campId];

    // Partenaires : les autres membres de MON équipe, une fois par tournoi.
    for (const id of moi) {
      const membres = t.membresParEquipe?.get(id);
      if (!membres) continue;
      for (const coequipier of membres) {
        if (!moi.has(coequipier)) {
          partenaires.set(coequipier, (partenaires.get(coequipier) ?? 0) + 1);
        }
      }
    }

    for (const m of t.matchs) {
      // Seuls les matchs VALIDÉS comptent : un score saisi mais non validé
      // n'existe pas encore sportivement (même règle que le classement).
      // Un bye n'est pas un match : personne n'a été affronté.
      if (m.statut !== "VALIDE" || m.is_bye) continue;
      const c = campsDe(m);
      if (!c.c1 || !c.c2) continue;

      const jeSuisC1 = moi.has(c.c1);
      const jeSuisC2 = moi.has(c.c2);
      if (!jeSuisC1 && !jeSuisC2) continue;

      const gagne = Boolean(c.gagnant && moi.has(c.gagnant));
      if (gagne) victoires += 1;
      else defaites += 1;

      const ligne = parJeu.get(t.jeu) ?? { joues: 0, victoires: 0 };
      ligne.joues += 1;
      if (gagne) ligne.victoires += 1;
      parJeu.set(t.jeu, ligne);

      const campAdverse = jeSuisC1 ? c.c2 : c.c1;
      for (const adv of enJoueurs(campAdverse)) {
        const a = adversaires.get(adv) ?? { rencontres: 0, victoires: 0 };
        a.rencontres += 1;
        if (gagne) a.victoires += 1;
        adversaires.set(adv, a);
      }
    }
  }

  const matchsJoues = victoires + defaites;
  const pct = (v: number, total: number) => Math.round((v / total) * 100);

  return {
    matchsJoues,
    victoires,
    defaites,
    winrate: matchsJoues > 0 ? pct(victoires, matchsJoues) : null,
    parJeu: [...parJeu.entries()]
      .map(([jeu, l]) => ({
        jeu,
        joues: l.joues,
        victoires: l.victoires,
        defaites: l.joues - l.victoires,
        winrate: pct(l.victoires, l.joues),
      }))
      // Tri stable : volume d'abord, alphabétique en cas d'égalité, pour que
      // l'affichage ne « saute » pas d'un rechargement à l'autre.
      .sort((a, b) => b.joues - a.joues || a.jeu.localeCompare(b.jeu)),
    adversaires: [...adversaires.entries()]
      .map(([joueurId, a]) => ({ joueurId, ...a }))
      .sort(
        (a, b) =>
          b.rencontres - a.rencontres || a.joueurId.localeCompare(b.joueurId)
      ),
    partenaires: [...partenaires.entries()]
      .map(([joueurId, tournois]) => ({ joueurId, tournois }))
      .sort(
        (a, b) => b.tournois - a.tournois || a.joueurId.localeCompare(b.joueurId)
      ),
  };
}
