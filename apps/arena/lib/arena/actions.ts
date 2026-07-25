"use server";

/**
 * Server Actions ARENA — tout le flux orga V1.
 *
 * ARCHITECTURE (défense jury CDA) :
 *  - Chaque action = requireStaff() PUIS écriture via service_role PUIS log.
 *  - Les règles métier vivent dans des modules purs et testés :
 *    lib/bracket.ts (bracket) et lib/arena/transitions.ts (cycle de vie).
 *  - Toute action sensible écrit dans arena_logs (traçabilité + audit).
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
import { requireStaff } from "./auth";
import { genererBracketEliminationSimple, progresserGagnant } from "../bracket";
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
  await db.from("arena_logs").insert({
    acteur_id: acteurId,
    action,
    tournoi_id: tournoiId,
    match_id: matchId,
    detail: detail ?? null,
  });
}

/** Charge un tournoi et vérifie qu'il appartient bien à l'orga du staff. */
async function chargerTournoiDeLOrga(
  tournoiId: string,
  organisationId: string
): Promise<Tournoi> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("arena_tournois")
    .select("*")
    .eq("id", tournoiId)
    .eq("organisation_id", organisationId)
    .single();
  if (error || !data) throw new Error("Tournoi introuvable pour ton organisation.");
  return data as Tournoi;
}

// ---------- Tournois ----------

export async function creerTournoi(formData: FormData) {
  try {
    const ctx = await requireStaff();
    const db = getServiceClient();

    const titre = String(formData.get("titre") ?? "").trim();
    const jeu = String(formData.get("jeu") ?? "").trim();
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

    const { data, error } = await db
      .from("arena_tournois")
      .insert({
        organisation_id: ctx.organisation.id,
        titre,
        jeu,
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
    const tournoi = await chargerTournoiDeLOrga(tournoiId, ctx.organisation.id);
    if (!transitionAutorisee(tournoi.statut, nouveau)) {
      throw new Error(`Transition ${tournoi.statut} → ${nouveau} non autorisée.`);
    }

    await db
      .from("arena_tournois")
      .update({ statut: nouveau, updated_at: new Date().toISOString() })
      .eq("id", tournoiId);

    if (nouveau === "TERMINE") {
      await log(ctx.userId, "TOURNOI_TERMINE", tournoiId, null);
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
    const tournoi = await chargerTournoiDeLOrga(tournoiId, ctx.organisation.id);
    if (tournoi.statut !== "OUVERT" && tournoi.statut !== "BROUILLON") {
      throw new Error("Les inscriptions sont fermées (tournoi démarré ou clos).");
    }

    // Joueur existant ? Sinon création.
    const { data: existant } = await db
      .from("arena_joueurs")
      .select("id")
      .eq("pseudo", pseudo)
      .maybeSingle();

    let joueurId = existant?.id as string | undefined;
    if (!joueurId) {
      const { data: cree, error } = await db
        .from("arena_joueurs")
        .insert({ pseudo })
        .select("id")
        .single();
      if (error) throw new Error(`Création joueur impossible : ${error.message}`);
      joueurId = cree.id;
    }

    const { error: errPart } = await db.from("arena_participations").insert({
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

    await chargerTournoiDeLOrga(tournoiId, ctx.organisation.id);

    await db
      .from("arena_participations")
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

    const tournoi = await chargerTournoiDeLOrga(tournoiId, ctx.organisation.id);
    if (tournoi.statut !== "OUVERT") {
      throw new Error("Le tournoi doit être OUVERT pour démarrer.");
    }

    // Seuls les joueurs check-in participent au bracket (les absents sont exclus).
    const { data: participations } = await db
      .from("arena_participations")
      .select("joueur_id")
      .eq("tournoi_id", tournoiId)
      .eq("check_in", true);

    const joueurIds = (participations ?? []).map((p) => p.joueur_id as string);
    if (joueurIds.length < 2) {
      throw new Error(
        `Il faut au moins 2 joueurs check-in pour démarrer (actuellement ${joueurIds.length}).`
      );
    }

    // Algo pur et testé (lib/bracket.ts) → lignes prêtes à insérer.
    const matchs = genererBracketEliminationSimple(joueurIds);

    const { error } = await db.from("arena_matchs").insert(
      matchs.map((m) => ({
        tournoi_id: tournoiId,
        round: m.round,
        position: m.position,
        joueur1_id: m.joueur1Id,
        joueur2_id: m.joueur2Id,
        is_bye: m.isBye,
        gagnant_id: m.gagnantId,
        statut: m.isBye ? "VALIDE" : "A_JOUER",
      }))
    );
    if (error) throw new Error(`Génération du bracket impossible : ${error.message}`);

    await db
      .from("arena_tournois")
      .update({ statut: "EN_COURS", updated_at: new Date().toISOString() })
      .eq("id", tournoiId);

    await log(ctx.userId, "TOURNOI_DEMARRE", tournoiId, null, {
      nb_joueurs: joueurIds.length,
      nb_matchs: matchs.length,
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

    await chargerTournoiDeLOrga(tournoiId, ctx.organisation.id);

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
      .from("arena_matchs")
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
      .from("arena_matchs")
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
 * Validation d'un score (double étape : saisie ≠ validation) :
 * fige le résultat + fait avancer le gagnant dans le bracket.
 */
export async function validerScore(formData: FormData) {
  const tournoiId = String(formData.get("tournoi_id"));
  try {
    const ctx = await requireStaff();
    const db = getServiceClient();
    const matchId = String(formData.get("match_id"));

    await chargerTournoiDeLOrga(tournoiId, ctx.organisation.id);

    const { data: matchsData } = await db
      .from("arena_matchs")
      .select("*")
      .eq("tournoi_id", tournoiId);
    const matchs = (matchsData ?? []) as MatchRow[];
    const m = matchs.find((x) => x.id === matchId);
    if (!m) throw new Error("Match introuvable.");
    if (m.statut !== "TERMINE") {
      throw new Error("Le score doit d'abord être saisi avant validation.");
    }

    const nbRounds = Math.max(...matchs.map((x) => x.round));

    // L'algo pur décide du gagnant et de sa destination — testé unitairement.
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

    await db
      .from("arena_matchs")
      .update({
        statut: "VALIDE",
        gagnant_id: prog.gagnantId,
        valide_par: ctx.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId);

    // Placement du gagnant dans le match parent (si pas la finale).
    if (prog.parent) {
      const parent = matchs.find(
        (x) =>
          x.round === prog.parent!.round && x.position === prog.parent!.position
      );
      if (parent) {
        await db
          .from("arena_matchs")
          .update(
            prog.parent.slot === "joueur1"
              ? { joueur1_id: prog.gagnantId }
              : { joueur2_id: prog.gagnantId }
          )
          .eq("id", parent.id);
      }
    }

    await log(ctx.userId, "MATCH_VALIDE", tournoiId, matchId, {
      gagnant_id: prog.gagnantId,
      finale: prog.parent === null,
    });

    revalidatePath(`/admin/tournois/${tournoiId}`);
  } catch (e) {
    redirectionErreur(`/admin/tournois/${tournoiId}`, e);
  }
}
