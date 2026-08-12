"use server";

/**
 * Server Actions ARENA — tout le flux orga V1.
 *
 * ARCHITECTURE (défense jury CDA) :
 *  - Chaque action = requireStaff() PUIS écriture via service_role PUIS log.
 *  - Les règles métier vivent dans des modules purs et testés :
 *    lib/bracket.ts (bracket) et lib/arena/transitions.ts (cycle de vie).
 *  - Toute action sensible écrit dans arena.logs (traçabilité + audit).
 *
 * GESTION D'ERREURS "JOUR J" :
 *  En production, une exception non gérée dans une Server Action affiche une
 *  page d'erreur générique (Next masque volontairement le message). Un staff
 *  qui saisit une égalité verrait "Something went wrong" — inacceptable en
 *  plein tournoi. Donc : chaque action attrape ses erreurs métier et REDIRIGE
 *  vers la page d'origine avec ?erreur=<message>, que la page affiche en
 *  bandeau. L'utilisateur garde le contexte, comprend, corrige.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServiceClient } from "../supabase/service";
import { estStaffDe, requireStaff, type ContexteStaff } from "./auth";
import { genererBracketEliminationSimple, progresserGagnant } from "../bracket";
import {
  genererBracketDoubleElimination,
  progresserDouble,
  type DestinationDouble,
} from "../bracket-double";
import {
  classementPoule,
  genererMatchsPoules,
  ordonnerQualifies,
  pouleTerminee,
  repartirEnPoules,
  type ResultatPoule,
} from "../poules";
import { attribuerBadgesTournoi } from "./badges";
import { normaliserJeu } from "./jeux";
import { estStatutTournoi, transitionAutorisee } from "./transitions";
import type { MatchRow, Tournoi } from "./types";

// ---------- Helpers ----------

/**
 * Redirige vers `chemin` avec le message d'erreur en query param.
 * ATTENTION : les redirect() de Next fonctionnent en LANÇANT une exception
 * spéciale (digest NEXT_REDIRECT). Si on l'attrapait comme une erreur métier,
 * on casserait les redirections de succès → on la relance telle quelle.
 */
function redirectionErreur(chemin: string, e: unknown): never {
  if (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  ) {
    throw e;
  }
  const message =
    e instanceof Error ? e.message : "Erreur inattendue — réessaie.";
  redirect(`${chemin}?erreur=${encodeURIComponent(message)}`);
}

async function log(
  acteurId: string,
  action: string,
  tournoiId: string | null,
  matchId: string | null,
  detail?: Record<string, unknown>
) {
  const db = getServiceClient();
  await db.schema("arena").from("logs").insert({
    acteur_id: acteurId,
    action,
    tournoi_id: tournoiId,
    match_id: matchId,
    detail: detail ?? null,
  });
}

/**
 * Charge un tournoi et vérifie qu'il appartient à L'UNE des organisations
 * dont l'utilisateur est staff (modèle multi-orga de shared.user_permissions).
 */
async function chargerTournoiDeLOrga(
  tournoiId: string,
  ctx: ContexteStaff
): Promise<Tournoi> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema("arena").from("tournois")
    .select("*")
    .eq("id", tournoiId)
    .single();
  if (error || !data) throw new Error("Tournoi introuvable.");
  const tournoi = data as Tournoi;
  if (!estStaffDe(ctx, tournoi.organisation_id)) {
    throw new Error("Tournoi introuvable pour tes organisations.");
  }
  return tournoi;
}

// ---------- Tournois ----------

export async function creerTournoi(formData: FormData) {
  try {
    const ctx = await requireStaff();
    const db = getServiceClient();

    const titre = String(formData.get("titre") ?? "").trim();
    // Normalisation du jeu : "street fighter 6" → "Street Fighter 6" (données
    // propres pour regrouper les joueurs par jeu — leçon du tournoi test).
    const jeu = normaliserJeu(String(formData.get("jeu") ?? ""));
    const format = String(formData.get("format") ?? "ELIMINATION_SIMPLE");
    if (
      format !== "ELIMINATION_SIMPLE" &&
      format !== "DOUBLE_ELIMINATION" &&
      format !== "POULES_FINALE"
    ) {
      throw new Error("Format de tournoi inconnu.");
    }

    // Configuration spécifique aux poules.
    let nbPoules: number | null = null;
    let nbQualifies: number | null = null;
    if (format === "POULES_FINALE") {
      nbPoules = Number(formData.get("nb_poules") ?? 2);
      nbQualifies = Number(formData.get("nb_qualifies_par_poule") ?? 2);
      if (!Number.isInteger(nbPoules) || nbPoules < 1 || nbPoules > 16) {
        throw new Error("Nombre de poules invalide (entre 1 et 16).");
      }
      if (nbQualifies !== 1 && nbQualifies !== 2) {
        throw new Error("Qualifiés par poule : 1 ou 2.");
      }
      if (nbPoules * nbQualifies < 2) {
        throw new Error(
          "Il faut au moins 2 qualifiés au total pour disputer une phase finale."
        );
      }
    }
    // --- Discipline et taille d'équipe (module sport, migration 004) ---
    // Un tournoi esport reste individuel : la contrainte
    // `tournois_discipline_taille_check` le garantit en base, on refuse ici
    // en amont pour donner un message clair au lieu d'une erreur Postgres.
    const discipline = String(formData.get("discipline") ?? "ESPORT");
    if (discipline !== "ESPORT" && discipline !== "SPORT") {
      throw new Error("Discipline inconnue (esport ou sport).");
    }
    const tailleEquipe =
      discipline === "SPORT" ? Number(formData.get("taille_equipe") ?? 1) : 1;
    if (!Number.isInteger(tailleEquipe) || tailleEquipe < 1 || tailleEquipe > 11) {
      throw new Error("Taille d'équipe invalide (entre 1 et 11 joueurs).");
    }

    const dateDebut = String(formData.get("date_debut") ?? "");
    const lieu = String(formData.get("lieu") ?? "").trim() || null;
    const maxJoueursRaw = String(formData.get("max_joueurs") ?? "").trim();
    const maxJoueurs = maxJoueursRaw ? Number(maxJoueursRaw) : null;

    // Validation serveur minimale mais réelle (jamais faire confiance au client).
    if (titre.length < 3) throw new Error("Titre trop court (3 caractères min).");
    if (!jeu) throw new Error("Le jeu est obligatoire.");
    if (!dateDebut) throw new Error("La date de début est obligatoire.");
    if (maxJoueurs !== null && (maxJoueurs < 2 || maxJoueurs > 128)) {
      throw new Error("Le nombre max de joueurs doit être entre 2 et 128.");
    }

    // V1 : le tournoi est créé pour la PREMIÈRE organisation du staff.
    // (Sélecteur multi-orga = amélioration future, remontée pas codée.)
    const orga = ctx.organisations[0];
    if (!orga) throw new Error("Aucune organisation associée à ton compte.");

    const { data, error } = await db
      .schema("arena").from("tournois")
      .insert({
        organisation_id: orga.id,
        titre,
        jeu,
        format,
        discipline,
        taille_equipe: tailleEquipe,
        nb_poules: nbPoules,
        nb_qualifies_par_poule: nbQualifies,
        date_debut: new Date(dateDebut).toISOString(),
        lieu,
        max_joueurs: maxJoueurs,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Création impossible : ${error.message}`);

    revalidatePath("/admin/tournois");
    redirect(`/admin/tournois/${data.id}`);
  } catch (e) {
    redirectionErreur("/admin/tournois/nouveau", e);
  }
}

export async function changerStatutTournoi(formData: FormData) {
  const tournoiId = String(formData.get("tournoi_id"));
  try {
    const ctx = await requireStaff();
    const db = getServiceClient();
    const nouveau = String(formData.get("statut"));

    if (!estStatutTournoi(nouveau)) throw new Error("Statut inconnu.");
    const tournoi = await chargerTournoiDeLOrga(tournoiId, ctx);
    if (!transitionAutorisee(tournoi.statut, nouveau)) {
      throw new Error(`Transition ${tournoi.statut} → ${nouveau} non autorisée.`);
    }

    await db
      .schema("arena").from("tournois")
      .update({ statut: nouveau, updated_at: new Date().toISOString() })
      .eq("id", tournoiId);

    if (nouveau === "TERMINE") {
      await log(ctx.userId, "TOURNOI_TERMINE", tournoiId, null);

      // Attribution automatique des badges (best-effort, jamais bloquant).
      const [{ data: matchsData }, { data: partData }] = await Promise.all([
        db.schema("arena").from("matchs").select("*").eq("tournoi_id", tournoiId),
        db
          .schema("arena")
          .from("participations")
          .select("joueur_id")
          .eq("tournoi_id", tournoiId)
          .eq("check_in", true),
      ]);
      await attribuerBadgesTournoi(
        db,
        tournoiId,
        (matchsData ?? []) as MatchRow[],
        (partData ?? []).map((p) => p.joueur_id as string)
      );
    }

    revalidatePath(`/admin/tournois/${tournoiId}`);
    revalidatePath("/admin/tournois");
  } catch (e) {
    redirectionErreur(`/admin/tournois/${tournoiId}`, e);
  }
}

// ---------- Joueurs & participations ----------

/**
 * Ajout "jour J" par le staff : crée le joueur (sans compte) s'il n'existe pas,
 * puis l'inscrit au tournoi, déjà check-in (il est physiquement là).
 * C'est AUSSI le chemin d'inscription des mineurs en V1 (cf. cadrage §3).
 */
export async function ajouterJoueurStaff(formData: FormData) {
  const tournoiId = String(formData.get("tournoi_id"));
  try {
    const ctx = await requireStaff();
    const db = getServiceClient();
    const pseudo = String(formData.get("pseudo") ?? "").trim();

    if (pseudo.length < 2) throw new Error("Pseudo trop court (2 caractères min).");
    const tournoi = await chargerTournoiDeLOrga(tournoiId, ctx);
    if (tournoi.statut !== "OUVERT" && tournoi.statut !== "BROUILLON") {
      throw new Error("Les inscriptions sont fermées (tournoi démarré ou clos).");
    }

    // Joueur existant ? Sinon création.
    const { data: existant } = await db
      .schema("arena").from("joueurs")
      .select("id")
      .eq("pseudo", pseudo)
      .maybeSingle();

    let joueurId = existant?.id as string | undefined;
    if (!joueurId) {
      const { data: cree, error } = await db
        .schema("arena").from("joueurs")
        .insert({ pseudo })
        .select("id")
        .single();
      if (error) throw new Error(`Création joueur impossible : ${error.message}`);
      joueurId = cree.id;
    }

    const { error: errPart } = await db.schema("arena").from("participations").insert({
      tournoi_id: tournoiId,
      joueur_id: joueurId,
      check_in: true,
      check_in_at: new Date().toISOString(),
    });
    // 23505 = violation d'unicité → déjà inscrit, pas une vraie erreur.
    if (errPart && errPart.code !== "23505") {
      throw new Error(`Inscription impossible : ${errPart.message}`);
    }

    await log(ctx.userId, "JOUEUR_CHECKIN", tournoiId, null, { pseudo });
    revalidatePath(`/admin/tournois/${tournoiId}`);
  } catch (e) {
    redirectionErreur(`/admin/tournois/${tournoiId}`, e);
  }
}

export async function toggleCheckIn(formData: FormData) {
  const tournoiId = String(formData.get("tournoi_id"));
  try {
    const ctx = await requireStaff();
    const db = getServiceClient();
    const participationId = String(formData.get("participation_id"));
    const versEtat = String(formData.get("vers")) === "true";

    await chargerTournoiDeLOrga(tournoiId, ctx);

    await db
      .schema("arena").from("participations")
      .update({
        check_in: versEtat,
        check_in_at: versEtat ? new Date().toISOString() : null,
      })
      .eq("id", participationId)
      .eq("tournoi_id", tournoiId);

    if (versEtat) await log(ctx.userId, "JOUEUR_CHECKIN", tournoiId, null);
    revalidatePath(`/admin/tournois/${tournoiId}`);
  } catch (e) {
    redirectionErreur(`/admin/tournois/${tournoiId}`, e);
  }
}

// ---------- Démarrage : génération du bracket ----------

export async function demarrerTournoi(formData: FormData) {
  const tournoiId = String(formData.get("tournoi_id"));
  try {
    const ctx = await requireStaff();
    const db = getServiceClient();

    const tournoi = await chargerTournoiDeLOrga(tournoiId, ctx);
    if (tournoi.statut !== "OUVERT") {
      throw new Error("Le tournoi doit être OUVERT pour démarrer.");
    }

    // Seuls les joueurs check-in participent au bracket (les absents sont exclus).
    const { data: participations } = await db
      .schema("arena").from("participations")
      .select("joueur_id")
      .eq("tournoi_id", tournoiId)
      .eq("check_in", true);

    const joueurIds = (participations ?? []).map((p) => p.joueur_id as string);
    if (joueurIds.length < 2) {
      throw new Error(
        `Il faut au moins 2 joueurs check-in pour démarrer (actuellement ${joueurIds.length}).`
      );
    }

    // Génération du bracket AVANT le verrou : les moteurs sont purs et peuvent
    // REFUSER (ex: double élim avec un effectif ≠ 4/8/16/32). On ne verrouille
    // le tournoi qu'une fois certain d'avoir des matchs à insérer.
    let lignes: Record<string, unknown>[];
    if (tournoi.format === "POULES_FINALE") {
      // Phase 1 UNIQUEMENT : les matchs de poules. La phase finale sera
      // générée plus tard (genererPhaseFinale), quand les qualifiés seront
      // connus — c'est la spécificité structurante de ce format.
      const poules = repartirEnPoules(joueurIds, tournoi.nb_poules ?? 2);
      lignes = genererMatchsPoules(poules).map((m) => ({
        tournoi_id: tournoiId,
        bracket: "P",
        poule: m.poule,
        round: m.journee,
        position: m.position,
        joueur1_id: m.joueur1Id,
        joueur2_id: m.joueur2Id,
        is_bye: false,
        gagnant_id: null,
        statut: "A_JOUER",
      }));
    } else if (tournoi.format === "DOUBLE_ELIMINATION") {
      lignes = genererBracketDoubleElimination(joueurIds).map((m) => ({
        tournoi_id: tournoiId,
        bracket: m.bracket,
        round: m.round,
        position: m.position,
        joueur1_id: m.joueur1Id,
        joueur2_id: m.joueur2Id,
        is_bye: m.isBye,
        gagnant_id: m.gagnantId,
        statut: "A_JOUER",
      }));
    } else {
      lignes = genererBracketEliminationSimple(joueurIds).map((m) => ({
        tournoi_id: tournoiId,
        round: m.round,
        position: m.position,
        joueur1_id: m.joueur1Id,
        joueur2_id: m.joueur2Id,
        is_bye: m.isBye,
        gagnant_id: m.gagnantId,
        statut: m.isBye ? "VALIDE" : "A_JOUER",
      }));
    }

    // ANTI DOUBLE-CLIC (trouvaille d'audit Lot 0) : transition ATOMIQUE.
    // UPDATE conditionné sur l'ancien statut — si deux clics arrivent en même
    // temps, un seul matche la condition. C'est Postgres qui arbitre.
    const { data: verrou } = await db
      .schema("arena")
      .from("tournois")
      .update({ statut: "EN_COURS", updated_at: new Date().toISOString() })
      .eq("id", tournoiId)
      .eq("statut", "OUVERT")
      .select("id");
    if (!verrou || verrou.length === 0) {
      throw new Error("Le tournoi a déjà été démarré (double-clic ?).");
    }

    const { error } = await db.schema("arena").from("matchs").insert(lignes);
    if (error) {
      // L'insertion du bracket a échoué : on relâche le verrou (retour OUVERT)
      // pour ne pas laisser un tournoi EN_COURS sans matchs.
      await db
        .schema("arena")
        .from("tournois")
        .update({ statut: "OUVERT", updated_at: new Date().toISOString() })
        .eq("id", tournoiId);
      throw new Error(`Génération du bracket impossible : ${error.message}`);
    }

    await log(ctx.userId, "TOURNOI_DEMARRE", tournoiId, null, {
      nb_joueurs: joueurIds.length,
      nb_matchs: lignes.length,
      format: tournoi.format,
    });

    revalidatePath(`/admin/tournois/${tournoiId}`);
  } catch (e) {
    redirectionErreur(`/admin/tournois/${tournoiId}`, e);
  }
}

// ---------- Scores ----------

export async function saisirScore(formData: FormData) {
  const tournoiId = String(formData.get("tournoi_id"));
  try {
    const ctx = await requireStaff();
    const db = getServiceClient();
    const matchId = String(formData.get("match_id"));
    const scoreJ1 = Number(formData.get("score_j1"));
    const scoreJ2 = Number(formData.get("score_j2"));

    await chargerTournoiDeLOrga(tournoiId, ctx);

    if (
      !Number.isInteger(scoreJ1) ||
      !Number.isInteger(scoreJ2) ||
      scoreJ1 < 0 ||
      scoreJ2 < 0
    ) {
      throw new Error("Scores invalides (entiers positifs attendus).");
    }
    // Règle métier : pas d'égalité en élimination simple (cf. lib/bracket.ts).
    if (scoreJ1 === scoreJ2) {
      throw new Error("Égalité interdite : départagez les joueurs avant de saisir.");
    }

    const { data: match } = await db
      .schema("arena").from("matchs")
      .select("*")
      .eq("id", matchId)
      .eq("tournoi_id", tournoiId)
      .single();
    if (!match) throw new Error("Match introuvable.");
    const m = match as MatchRow;
    if (m.statut === "VALIDE") throw new Error("Match déjà validé.");
    if (!m.joueur1_id || !m.joueur2_id) {
      throw new Error("Match incomplet : les deux joueurs ne sont pas encore connus.");
    }

    const ancien = { score_j1: m.score_j1, score_j2: m.score_j2 };
    await db
      .schema("arena").from("matchs")
      .update({
        score_j1: scoreJ1,
        score_j2: scoreJ2,
        statut: "TERMINE",
        saisi_par: ctx.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId);

    await log(
      ctx.userId,
      m.score_j1 === null ? "SCORE_SAISI" : "SCORE_MODIFIE",
      tournoiId,
      matchId,
      { ancien, nouveau: { score_j1: scoreJ1, score_j2: scoreJ2 } }
    );

    revalidatePath(`/admin/tournois/${tournoiId}`);
  } catch (e) {
    redirectionErreur(`/admin/tournois/${tournoiId}`, e);
  }
}

/**
 * PHASE FINALE d'un tournoi à poules — seconde génération.
 *
 * Contrairement aux autres formats, on ne peut pas créer ce bracket au
 * démarrage : les qualifiés n'existent qu'une fois toutes les poules jouées.
 * Cette action vérifie que chaque poule est complète, calcule les classements
 * (logique pure testée), croise les têtes de série puis crée un bracket à
 * élimination simple SANS retirage (l'ordre des qualifiés est significatif).
 *
 * Idempotence : le drapeau phase_finale_generee est posé par un UPDATE
 * conditionnel — deux clics simultanés ne peuvent pas créer deux brackets.
 */
export async function genererPhaseFinale(formData: FormData) {
  const tournoiId = String(formData.get("tournoi_id"));
  try {
    const ctx = await requireStaff();
    const db = getServiceClient();
    const tournoi = await chargerTournoiDeLOrga(tournoiId, ctx);

    if (tournoi.format !== "POULES_FINALE") {
      throw new Error("Ce tournoi n'est pas au format poules + finale.");
    }
    if (tournoi.statut !== "EN_COURS") {
      throw new Error("Le tournoi doit être en cours.");
    }
    if (tournoi.phase_finale_generee) {
      throw new Error("La phase finale a déjà été générée.");
    }

    const { data: matchsData } = await db
      .schema("arena")
      .from("matchs")
      .select("*")
      .eq("tournoi_id", tournoiId);
    const matchs = (matchsData ?? []) as MatchRow[];
    const matchsPoules = matchs.filter((m) => (m.bracket ?? "W") === "P");
    if (matchsPoules.length === 0) {
      throw new Error("Aucun match de poule trouvé.");
    }

    // Reconstruire la composition de chaque poule depuis ses matchs.
    const numerosPoules = [
      ...new Set(matchsPoules.map((m) => m.poule ?? 1)),
    ].sort((a, b) => a - b);

    const classements: string[][] = [];
    for (const numero of numerosPoules) {
      const deLaPoule = matchsPoules.filter((m) => (m.poule ?? 1) === numero);
      const joueursPoule = [
        ...new Set(
          deLaPoule.flatMap((m) => [m.joueur1_id, m.joueur2_id])
        ),
      ].filter((j): j is string => j !== null);

      const resultats: ResultatPoule[] = deLaPoule.map((m) => ({
        joueur1Id: m.joueur1_id,
        joueur2Id: m.joueur2_id,
        scoreJ1: m.score_j1,
        scoreJ2: m.score_j2,
        valide: m.statut === "VALIDE",
      }));

      if (!pouleTerminee(joueursPoule.length, resultats)) {
        throw new Error(
          `La poule ${numero} n'est pas terminée : tous ses matchs doivent être validés avant de lancer la phase finale.`
        );
      }
      classements.push(
        classementPoule(joueursPoule, resultats).map((l) => l.joueurId)
      );
    }

    // Croisement des têtes de série (logique pure testée).
    const qualifies = ordonnerQualifies(
      classements,
      tournoi.nb_qualifies_par_poule ?? 2
    );
    if (qualifies.length < 2) {
      throw new Error("Pas assez de qualifiés pour une phase finale.");
    }

    // Verrou idempotent AVANT insertion.
    const { data: verrou } = await db
      .schema("arena")
      .from("tournois")
      .update({ phase_finale_generee: true, updated_at: new Date().toISOString() })
      .eq("id", tournoiId)
      .eq("phase_finale_generee", false)
      .select("id");
    if (!verrou || verrou.length === 0) {
      throw new Error("La phase finale a déjà été générée (double-clic ?).");
    }

    // conserverOrdre : surtout PAS de retirage, l'ordre porte le croisement.
    const bracket = genererBracketEliminationSimple(qualifies, Math.random, {
      conserverOrdre: true,
    });
    const { error } = await db.schema("arena").from("matchs").insert(
      bracket.map((m) => ({
        tournoi_id: tournoiId,
        bracket: "W",
        round: m.round,
        position: m.position,
        joueur1_id: m.joueur1Id,
        joueur2_id: m.joueur2Id,
        is_bye: m.isBye,
        gagnant_id: m.gagnantId,
        statut: m.isBye ? "VALIDE" : "A_JOUER",
      }))
    );
    if (error) {
      // Relâche le verrou pour permettre une nouvelle tentative.
      await db
        .schema("arena")
        .from("tournois")
        .update({ phase_finale_generee: false })
        .eq("id", tournoiId);
      throw new Error(`Phase finale impossible : ${error.message}`);
    }

    await log(ctx.userId, "PHASE_FINALE_GENEREE", tournoiId, null, {
      qualifies: qualifies.length,
      poules: numerosPoules.length,
    });
    revalidatePath(`/admin/tournois/${tournoiId}`);
  } catch (e) {
    redirectionErreur(`/admin/tournois/${tournoiId}`, e);
  }
}

/**
 * Signale un litige sur un match (règlement §3 : « en cas de désaccord,
 * le signaler AVANT la validation »). Le match passe LITIGIEUX : le score
 * affiché n'est plus considéré fiable. Résolution = le staff re-saisit le
 * score arbitré (retour TERMINE) puis valide. Tout est historisé.
 */
export async function signalerLitige(formData: FormData) {
  const tournoiId = String(formData.get("tournoi_id"));
  try {
    const ctx = await requireStaff();
    const db = getServiceClient();
    const matchId = String(formData.get("match_id"));

    await chargerTournoiDeLOrga(tournoiId, ctx);

    const { data: match } = await db
      .schema("arena")
      .from("matchs")
      .select("statut")
      .eq("id", matchId)
      .eq("tournoi_id", tournoiId)
      .single();
    if (!match) throw new Error("Match introuvable.");
    if (match.statut === "VALIDE") {
      throw new Error(
        "Match déjà validé : un résultat validé est définitif (règlement §3)."
      );
    }
    if (match.statut === "LITIGIEUX") {
      throw new Error("Litige déjà ouvert sur ce match.");
    }

    await db
      .schema("arena")
      .from("matchs")
      .update({ statut: "LITIGIEUX", updated_at: new Date().toISOString() })
      .eq("id", matchId);

    await log(ctx.userId, "LITIGE_OUVERT", tournoiId, matchId);
    revalidatePath(`/admin/tournois/${tournoiId}`);
  } catch (e) {
    redirectionErreur(`/admin/tournois/${tournoiId}`, e);
  }
}

/**
 * Validation d'un score (double étape : saisie ≠ validation) :
 * fige le résultat + fait avancer le gagnant dans le bracket.
 */
export async function validerScore(formData: FormData) {
  const tournoiId = String(formData.get("tournoi_id"));
  try {
    const ctx = await requireStaff();
    const db = getServiceClient();
    const matchId = String(formData.get("match_id"));

    const tournoi = await chargerTournoiDeLOrga(tournoiId, ctx);

    const { data: matchsData } = await db
      .schema("arena").from("matchs")
      .select("*")
      .eq("tournoi_id", tournoiId);
    const matchs = (matchsData ?? []) as MatchRow[];
    const m = matchs.find((x) => x.id === matchId);
    if (!m) throw new Error("Match introuvable.");
    if (m.statut !== "TERMINE") {
      throw new Error("Le score doit d'abord être saisi avant validation.");
    }

    const validerMatch = (gagnantId: string) =>
      db
        .schema("arena").from("matchs")
        .update({
          statut: "VALIDE",
          gagnant_id: gagnantId,
          valide_par: ctx.userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchId);

    /** Place un joueur dans le slot d'un match cible (identifié par bracket/round/position). */
    const placer = async (dest: DestinationDouble, joueurId: string) => {
      const cible = matchs.find(
        (x) =>
          (x.bracket ?? "W") === dest.bracket &&
          x.round === dest.round &&
          x.position === dest.position
      );
      if (!cible) return;
      await db
        .schema("arena").from("matchs")
        .update(
          dest.slot === "joueur1"
            ? { joueur1_id: joueurId }
            : { joueur2_id: joueurId }
        )
        .eq("id", cible.id);
    };

    // const (pas d'expression répétée) → TypeScript sait, dans les branches
    // suivantes, que le bracket ne peut plus valoir "P".
    const bracketMatch = m.bracket ?? "W";

    if (bracketMatch === "P") {
      // Match de POULE : aucun bracket à faire avancer. On fige le résultat,
      // le classement de la poule est recalculé à la lecture (lib/poules.ts).
      const gagnantId =
        (m.score_j1 ?? 0) > (m.score_j2 ?? 0) ? m.joueur1_id : m.joueur2_id;
      if (!gagnantId) throw new Error("Match de poule incomplet.");
      await validerMatch(gagnantId);
      await log(ctx.userId, "MATCH_VALIDE", tournoiId, matchId, {
        gagnant_id: gagnantId,
        poule: m.poule ?? null,
      });
    } else if (tournoi.format === "DOUBLE_ELIMINATION") {
      // k = profondeur du tableau principal (rounds du bracket W).
      const k = Math.max(
        ...matchs.filter((x) => (x.bracket ?? "W") === "W").map((x) => x.round)
      );
      const prog = progresserDouble(
        {
          bracket: bracketMatch,
          round: m.round,
          position: m.position,
          joueur1Id: m.joueur1_id,
          joueur2Id: m.joueur2_id,
          scoreJ1: m.score_j1 ?? 0,
          scoreJ2: m.score_j2 ?? 0,
        },
        k
      );
      await validerMatch(prog.gagnantId);
      if (prog.destGagnant) await placer(prog.destGagnant, prog.gagnantId);
      if (prog.destPerdant) await placer(prog.destPerdant, prog.perdantId);
      await log(ctx.userId, "MATCH_VALIDE", tournoiId, matchId, {
        gagnant_id: prog.gagnantId,
        finale: prog.destGagnant === null,
      });
    } else {
      const nbRounds = Math.max(...matchs.map((x) => x.round));
      const prog = progresserGagnant(
        {
          round: m.round,
          position: m.position,
          joueur1Id: m.joueur1_id,
          joueur2Id: m.joueur2_id,
          scoreJ1: m.score_j1 ?? 0,
          scoreJ2: m.score_j2 ?? 0,
        },
        nbRounds
      );
      await validerMatch(prog.gagnantId);
      if (prog.parent) {
        await placer(
          { bracket: "W", ...prog.parent },
          prog.gagnantId
        );
      }
      await log(ctx.userId, "MATCH_VALIDE", tournoiId, matchId, {
        gagnant_id: prog.gagnantId,
        finale: prog.parent === null,
      });
    }

    revalidatePath(`/admin/tournois/${tournoiId}`);
  } catch (e) {
    redirectionErreur(`/admin/tournois/${tournoiId}`, e);
  }
}

// ---------- Répartition des joueurs (glisser-déposer ou clic) ----------

/**
 * Enregistre l'ORDRE des inscrits et, le cas échéant, leur appartenance à une
 * équipe. Appelée par le composant client `RepartitionJoueurs`.
 *
 * Trois choix à savoir défendre :
 *
 *  1. On reçoit la répartition COMPLÈTE, pas un déplacement isolé. Le serveur
 *     n'a donc jamais à deviner un état intermédiaire, et si deux membres du
 *     staff manipulent la même liste en même temps, le dernier gagne de façon
 *     visible plutôt que de produire un mélange incohérent.
 *
 *  2. Elle RETOURNE un résultat au lieu de rediriger. Toutes les autres
 *     actions redirigent avec ?erreur=... parce qu'elles sont déclenchées par
 *     un <form> classique. Ici l'appel vient de JavaScript : rediriger ferait
 *     perdre la position dans la page en plein tri. Le composant affiche le
 *     message et revient à l'état précédent.
 *
 *  3. Elle est refusée dès que le tournoi est lancé. Réordonner des têtes de
 *     série une fois le bracket généré ne changerait rien au bracket : ce
 *     serait une action sans effet, donc un piège pour l'utilisateur.
 */
export async function enregistrerRepartition(
  tournoiId: string,
  repartition: { joueurId: string; colonneId: string | null; ordre: number }[]
): Promise<{ ok: boolean; message?: string }> {
  try {
    const ctx = await requireStaff();
    const tournoi = await chargerTournoiDeLOrga(tournoiId, ctx);

    if (tournoi.statut !== "BROUILLON" && tournoi.statut !== "OUVERT") {
      return {
        ok: false,
        message:
          "Le tournoi est déjà lancé : l'ordre des joueurs n'a plus d'effet sur le bracket.",
      };
    }

    const db = getServiceClient();

    // 1. L'ordre d'affichage, une ligne à la fois. Le volume est de l'ordre
    // de quelques dizaines de participants : une boucle est plus lisible
    // qu'un upsert de masse, et le coût est négligeable.
    for (const ligne of repartition) {
      const { error } = await db
        .schema("arena")
        .from("participations")
        .update({ ordre: ligne.ordre })
        .eq("tournoi_id", tournoiId)
        .eq("joueur_id", ligne.joueurId);
      if (error) throw new Error(error.message);
    }

    // 2. Les équipes, seulement pour un tournoi par équipes. On repart de zéro
    // à chaque enregistrement : supprimer puis réinsérer est ici plus sûr que
    // de calculer un différentiel, car la contrainte UNIQUE (tournoi, joueur)
    // rejetterait un déplacement fait dans le mauvais ordre.
    if ((tournoi.taille_equipe ?? 1) > 1) {
      const { error: erreurPurge } = await db
        .schema("arena")
        .from("equipes_membres")
        .delete()
        .eq("tournoi_id", tournoiId);
      if (erreurPurge) throw new Error(erreurPurge.message);

      const membres = repartition
        .filter((l) => l.colonneId !== null)
        .map((l) => ({
          tournoi_id: tournoiId,
          equipe_id: l.colonneId as string,
          joueur_id: l.joueurId,
        }));

      if (membres.length > 0) {
        const { error } = await db
          .schema("arena")
          .from("equipes_membres")
          .insert(membres);
        if (error) throw new Error(error.message);
      }
    }

    await log(ctx.userId, "REPARTITION_MODIFIEE", tournoiId, null, {
      nb_joueurs: repartition.length,
      nb_places: repartition.filter((l) => l.colonneId !== null).length,
    });

    revalidatePath(`/admin/tournois/${tournoiId}`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Enregistrement impossible.",
    };
  }
}

// ---------- Équipes (module sport) ----------

/**
 * Crée une équipe vide dans un tournoi par équipes. Le staff la nomme, puis
 * y glisse les joueurs depuis le bloc de répartition.
 *
 * Pourquoi une équipe VIDE d'abord, plutôt qu'un formulaire qui demanderait
 * les quatre joueurs d'un coup : le jour J, les équipes se forment au fur et
 * à mesure des arrivées. Imposer une saisie complète obligerait le staff à
 * attendre que tout le monde soit là avant de commencer à saisir.
 */
export async function creerEquipe(formData: FormData) {
  const tournoiId = String(formData.get("tournoi_id") ?? "");
  try {
    const ctx = await requireStaff();
    const tournoi = await chargerTournoiDeLOrga(tournoiId, ctx);

    if ((tournoi.taille_equipe ?? 1) < 2) {
      throw new Error("Ce tournoi est individuel : il n'a pas d'équipes.");
    }
    if (tournoi.statut !== "BROUILLON" && tournoi.statut !== "OUVERT") {
      throw new Error("Tournoi déjà lancé : la composition est figée.");
    }

    const nom = String(formData.get("nom") ?? "").trim().replace(/\s+/g, " ");
    if (nom.length < 1 || nom.length > 40) {
      throw new Error("Nom d'équipe : entre 1 et 40 caractères.");
    }

    const db = getServiceClient();
    const { error } = await db
      .schema("arena")
      .from("equipes")
      .insert({ tournoi_id: tournoiId, nom });

    // 23505 = violation d'unicité. L'index UNIQUE (tournoi_id, nom) rend le
    // doublon impossible en base ; on se contente de traduire le code Postgres
    // en français plutôt que de faire un SELECT préalable, qui laisserait de
    // toute façon passer deux créations simultanées.
    if (error) {
      throw new Error(
        error.code === "23505"
          ? `Une équipe s'appelle déjà « ${nom} » dans ce tournoi.`
          : `Création impossible : ${error.message}`
      );
    }

    await log(ctx.userId, "EQUIPE_CREEE", tournoiId, null, { nom });
    revalidatePath(`/admin/tournois/${tournoiId}`);
  } catch (e) {
    redirectionErreur(`/admin/tournois/${tournoiId}`, e);
  }
}

/**
 * Supprime une équipe. Ses membres redeviennent « sans équipe » grâce au
 * ON DELETE CASCADE de equipes_membres : rien à nettoyer côté application.
 */
export async function supprimerEquipe(formData: FormData) {
  const tournoiId = String(formData.get("tournoi_id") ?? "");
  try {
    const ctx = await requireStaff();
    const tournoi = await chargerTournoiDeLOrga(tournoiId, ctx);

    if (tournoi.statut !== "BROUILLON" && tournoi.statut !== "OUVERT") {
      throw new Error("Tournoi déjà lancé : la composition est figée.");
    }

    const equipeId = String(formData.get("equipe_id") ?? "");
    const db = getServiceClient();
    const { error } = await db
      .schema("arena")
      .from("equipes")
      .delete()
      .eq("id", equipeId)
      .eq("tournoi_id", tournoiId); // ceinture et bretelles : jamais celle d'un autre tournoi

    if (error) throw new Error(`Suppression impossible : ${error.message}`);

    await log(ctx.userId, "EQUIPE_SUPPRIMEE", tournoiId, null, { equipe_id: equipeId });
    revalidatePath(`/admin/tournois/${tournoiId}`);
  } catch (e) {
    redirectionErreur(`/admin/tournois/${tournoiId}`, e);
  }
}
