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
import {
  genererBracketEliminationSimple,
  melangerJoueurs,
  progresserGagnant,
} from "../bracket";
import {
  NOTE_INITIALE,
  notesApresMatchEquipes,
  repartirEnPoulesEquilibrees,
  type JoueurNote,
} from "../elo";
import {
  chercherRangParticipant,
  extraireIdTournoiToornament,
  recupererTournoiToornament,
} from "../toornament";
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

/**
 * ARENA oppose soit des JOUEURS (esport, tournoi individuel), soit des ÉQUIPES
 * (padel en double, five). Les DEUX cas partagent exactement le même moteur de
 * bracket, parce que lib/bracket.ts et ses cousins travaillent sur des
 * identifiants OPAQUES : ils ne savent pas, et n'ont pas besoin de savoir, ce
 * que l'identifiant désigne.
 *
 * La seule différence vit ici : le nom des COLONNES où écrire ces
 * identifiants. Plutôt que de dupliquer chaque fonction en version joueur et
 * version équipe, on calcule les noms de colonnes une fois et on écrit
 * `{ [cols.c1]: id }`. C'est le même code qui sert aux deux verticales, donc
 * un correctif de bracket profite aux deux automatiquement.
 */
type ColonnesCamp = {
  parEquipes: boolean;
  c1: "joueur1_id" | "equipe1_id";
  c2: "joueur2_id" | "equipe2_id";
  gagnant: "gagnant_id" | "equipe_gagnante_id";
};

function colonnesCamp(tournoi: Tournoi): ColonnesCamp {
  return (tournoi.taille_equipe ?? 1) > 1
    ? { parEquipes: true, c1: "equipe1_id", c2: "equipe2_id", gagnant: "equipe_gagnante_id" }
    : { parEquipes: false, c1: "joueur1_id", c2: "joueur2_id", gagnant: "gagnant_id" };
}

/** Les deux camps d'un match, quel que soit le type de tournoi. */
function campsDuMatch(m: MatchRow, parEquipes: boolean) {
  return parEquipes
    ? { c1: m.equipe1_id ?? null, c2: m.equipe2_id ?? null, gagnant: m.equipe_gagnante_id ?? null }
    : { c1: m.joueur1_id, c2: m.joueur2_id, gagnant: m.gagnant_id };
}

// ---------- ELO interne (lib/elo.ts, moteur pur testé) ----------

/**
 * Met à jour les notes ELO après la VALIDATION d'un match.
 *
 * Trois choix à savoir défendre :
 *
 *  1. Un seul chemin de calcul pour tout le monde : `notesApresMatchEquipes`.
 *     Pour un match individuel, chaque camp est une « équipe » d'un joueur —
 *     la moyenne d'un singleton est sa propre note, et le facteur K reste
 *     calculé PAR joueur. Le résultat est strictement identique à
 *     `notesApresDuel`, sans dupliquer la logique d'appel.
 *
 *  2. La note vit PAR discipline (clé primaire joueur_id + discipline) :
 *     être fort à Street Fighter ne dit rien du niveau au padel. Le moteur
 *     de poules équilibrées ne mélange donc jamais les deux mondes.
 *
 *  3. L'appelant NE DOIT PAS échouer si cette fonction échoue. L'ELO est une
 *     aide interne (équilibrage des poules) : le jour J, une validation de
 *     score qui casserait à cause d'une table annexe serait indéfendable.
 *     D'où le try/catch + log ELO_ECHEC côté appelant, jamais un throw qui
 *     remonte à l'écran du staff.
 */
async function mettreAJourElo(
  db: ReturnType<typeof getServiceClient>,
  tournoi: Tournoi,
  camp1: string,
  camp2: string,
  gagnantId: string,
  parEquipes: boolean
): Promise<void> {
  const discipline = tournoi.discipline ?? "ESPORT";

  // Qui joue réellement : le joueur lui-même, ou les membres de l'équipe.
  let membres1 = [camp1];
  let membres2 = [camp2];
  if (parEquipes) {
    const { data } = await db
      .schema("arena")
      .from("equipes_membres")
      .select("equipe_id, joueur_id")
      .in("equipe_id", [camp1, camp2]);
    const lignes = (data ?? []) as { equipe_id: string; joueur_id: string }[];
    membres1 = lignes.filter((l) => l.equipe_id === camp1).map((l) => l.joueur_id);
    membres2 = lignes.filter((l) => l.equipe_id === camp2).map((l) => l.joueur_id);
    // Composition introuvable → pas d'ELO plutôt qu'un ELO faux.
    if (membres1.length === 0 || membres2.length === 0) return;
  }

  const tous = [...membres1, ...membres2];
  const { data: eloData, error: erreurLecture } = await db
    .schema("arena")
    .from("elo_joueurs")
    .select("joueur_id, note, nb_matchs")
    .eq("discipline", discipline)
    .in("joueur_id", tous);
  if (erreurLecture) throw new Error(erreurLecture.message);

  const existantes = new Map(
    ((eloData ?? []) as { joueur_id: string; note: number; nb_matchs: number }[]).map(
      (l) => [l.joueur_id, l]
    )
  );
  // Jamais joué → note de départ 1000, 0 match (période de placement, K=40).
  const enNote = (joueurId: string): JoueurNote => ({
    joueurId,
    note: existantes.get(joueurId)?.note ?? NOTE_INITIALE,
    nbMatchs: existantes.get(joueurId)?.nb_matchs ?? 0,
  });

  const nouvelles = notesApresMatchEquipes(
    membres1.map(enNote),
    membres2.map(enNote),
    gagnantId === camp1 ? "A" : "B"
  );

  const { error } = await db
    .schema("arena")
    .from("elo_joueurs")
    .upsert(
      [...nouvelles].map(([joueurId, note]) => ({
        joueur_id: joueurId,
        discipline,
        // La contrainte CHECK en base borne la note entre 0 et 4000 : on borne
        // AUSSI ici pour qu'un cas extrême produise une note plafonnée plutôt
        // qu'une erreur Postgres.
        note: Math.max(0, Math.min(4000, note)),
        nb_matchs: (existantes.get(joueurId)?.nb_matchs ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "joueur_id,discipline" }
    );
  if (error) throw new Error(error.message);
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
      const [{ data: matchsData }, { data: partData }, { data: equipesData }] =
        await Promise.all([
          db.schema("arena").from("matchs").select("*").eq("tournoi_id", tournoiId),
          db
            .schema("arena")
            .from("participations")
            .select("joueur_id")
            .eq("tournoi_id", tournoiId)
            .eq("check_in", true),
          db
            .schema("arena")
            .from("equipes")
            .select("id, membres:equipes_membres(joueur_id)")
            .eq("tournoi_id", tournoiId),
        ]);

      const membresParEquipe = new Map(
        ((equipesData ?? []) as { id: string; membres: { joueur_id: string }[] }[]).map(
          (e) => [e.id, (e.membres ?? []).map((mb) => mb.joueur_id)]
        )
      );

      await attribuerBadgesTournoi(
        db,
        tournoiId,
        (matchsData ?? []) as MatchRow[],
        (partData ?? []).map((p) => p.joueur_id as string),
        membresParEquipe
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

    // Seuls les joueurs check-in participent au bracket (les absents sont
    // exclus). `ordre` porte le classement manuel fait dans la colonne de
    // répartition (migration 005) : null = joueur non classé.
    const { data: participations } = await db
      .schema("arena").from("participations")
      .select("joueur_id, ordre")
      .eq("tournoi_id", tournoiId)
      .eq("check_in", true);

    const inscrits = (participations ?? []) as {
      joueur_id: string;
      ordre: number | null;
    }[];
    const joueurIds = inscrits.map((p) => p.joueur_id);
    const ordreParJoueur = new Map(inscrits.map((p) => [p.joueur_id, p.ordre]));

    // Les CONCURRENTS du bracket : des joueurs en esport, des équipes en sport.
    const cols = colonnesCamp(tournoi);
    let participantIds: string[] = joueurIds;
    // Composition de chaque concurrent (lui-même s'il est un joueur, ses
    // membres s'il est une équipe) — sert au calcul de force ELO plus bas.
    const membresParParticipant = new Map<string, string[]>(
      joueurIds.map((id) => [id, [id]])
    );

    if (cols.parEquipes) {
      const tailleAttendue = tournoi.taille_equipe ?? 2;
      const { data: equipesData } = await db
        .schema("arena")
        .from("equipes")
        .select("id, nom, membres:equipes_membres(joueur_id)")
        .eq("tournoi_id", tournoiId)
        .order("nom", { ascending: true });

      const equipes = (equipesData ?? []) as {
        id: string;
        nom: string;
        membres: { joueur_id: string }[];
      }[];

      // Une équipe incomplète fausserait tout le tournoi : autant refuser de
      // démarrer et nommer les équipes fautives, plutôt que de générer un
      // bracket que le staff devra défaire.
      const incompletes = equipes.filter(
        (e) => (e.membres ?? []).length !== tailleAttendue
      );
      if (incompletes.length > 0) {
        throw new Error(
          `Équipes incomplètes (${tailleAttendue} joueurs attendus) : ` +
            incompletes
              .map((e) => `${e.nom} (${(e.membres ?? []).length})`)
              .join(", ")
        );
      }
      participantIds = equipes.map((e) => e.id);
      membresParParticipant.clear();
      for (const e of equipes) {
        membresParParticipant.set(
          e.id,
          (e.membres ?? []).map((mb) => mb.joueur_id)
        );
      }
    }

    if (participantIds.length < 2) {
      throw new Error(
        cols.parEquipes
          ? `Il faut au moins 2 équipes complètes pour démarrer (actuellement ${participantIds.length}).`
          : `Il faut au moins 2 joueurs check-in pour démarrer (actuellement ${participantIds.length}).`
      );
    }

    // -- Têtes de série et équilibrage ---------------------------------------
    // Trois sources possibles pour ordonner le tirage, PAR PRIORITÉ :
    //   1. ORDRE MANUEL : le staff a classé des joueurs dans la colonne de
    //      répartition. Une décision humaine explicite prime sur tout calcul.
    //   2. ELO INTERNE : des joueurs ont déjà des notes → les poules sont
    //      composées au serpentin (lib/elo.ts), fini la poule de la mort.
    //   3. ALÉATOIRE : comportement historique quand on ne sait rien.
    // L'ordre manuel est PAR JOUEUR : il ne s'applique qu'aux tournois
    // individuels (classer des joueurs ne classe pas des équipes).
    const ordreManuelActif =
      !cols.parEquipes && inscrits.some((p) => p.ordre !== null);

    if (ordreManuelActif) {
      // Classés d'abord (dans l'ordre du staff), puis les non-classés TIRÉS AU
      // SORT — le hasard reste la règle pour ceux qu'on n'a pas voulu placer.
      const classes = participantIds
        .filter((id) => (ordreParJoueur.get(id) ?? null) !== null)
        .sort(
          (a, b) => (ordreParJoueur.get(a) ?? 0) - (ordreParJoueur.get(b) ?? 0)
        );
      const nonClasses = melangerJoueurs(
        participantIds.filter((id) => (ordreParJoueur.get(id) ?? null) === null),
        Math.random
      );
      participantIds = [...classes, ...nonClasses];
    }

    // Notes ELO des concurrents (uniquement si aucun ordre manuel : la
    // décision du staff prime). La force d'une équipe est la MOYENNE de ses
    // membres — même convention que lib/elo.ts pour la mise à jour des notes.
    let notesParticipants: JoueurNote[] | null = null;
    if (!ordreManuelActif && tournoi.format === "POULES_FINALE") {
      const tousLesJoueurs = [
        ...new Set([...membresParParticipant.values()].flat()),
      ];
      const { data: eloData } = await db
        .schema("arena")
        .from("elo_joueurs")
        .select("joueur_id, note")
        .eq("discipline", tournoi.discipline ?? "ESPORT")
        .in("joueur_id", tousLesJoueurs);
      const notes = new Map(
        ((eloData ?? []) as { joueur_id: string; note: number }[]).map((l) => [
          l.joueur_id,
          l.note,
        ])
      );
      // Aucune note en base → l'ELO n'a rien à dire, on reste à l'aléatoire.
      if (notes.size > 0) {
        notesParticipants = participantIds.map((id) => {
          const membres = membresParParticipant.get(id) ?? [id];
          const somme = membres.reduce(
            (s, j) => s + (notes.get(j) ?? NOTE_INITIALE),
            0
          );
          return {
            // `joueurId` désigne ici le CONCURRENT (joueur ou équipe) : le
            // serpentin ne lit que l'identifiant et la note, il n'a pas
            // besoin de savoir ce que l'identifiant désigne.
            joueurId: id,
            note: Math.round(somme / Math.max(1, membres.length)),
            nbMatchs: 0,
          };
        });
      }
    }

    // Génération du bracket AVANT le verrou : les moteurs sont purs et peuvent
    // REFUSER (ex: double élim avec un effectif ≠ 4/8/16/32). On ne verrouille
    // le tournoi qu'une fois certain d'avoir des matchs à insérer.
    let lignes: Record<string, unknown>[];
    if (tournoi.format === "POULES_FINALE") {
      // Phase 1 UNIQUEMENT : les matchs de poules. La phase finale sera
      // générée plus tard (genererPhaseFinale), quand les qualifiés seront
      // connus — c'est la spécificité structurante de ce format.
      const nbPoules = tournoi.nb_poules ?? 2;
      let poules: string[][];
      if (ordreManuelActif || notesParticipants) {
        // Le serpentin ne valide pas l'effectif minimal (repartirEnPoules le
        // fait) : on reproduit la même règle pour un message d'erreur
        // identique quel que soit le chemin.
        if (participantIds.length < nbPoules * 2) {
          throw new Error(
            `Effectif insuffisant : ${nbPoules} poules exigent au moins ${nbPoules * 2} joueurs check-in (actuellement ${participantIds.length}).`
          );
        }
        // Ordre manuel → force décroissante par position (-index) : le
        // serpentin retrouve exactement l'ordre voulu par le staff.
        const forces: JoueurNote[] = ordreManuelActif
          ? participantIds.map((id, i) => ({ joueurId: id, note: -i, nbMatchs: 0 }))
          : notesParticipants!;
        poules = repartirEnPoulesEquilibrees(forces, nbPoules);
      } else {
        poules = repartirEnPoules(participantIds, nbPoules);
      }
      lignes = genererMatchsPoules(poules).map((m) => ({
        tournoi_id: tournoiId,
        bracket: "P",
        poule: m.poule,
        round: m.journee,
        position: m.position,
        [cols.c1]: m.joueur1Id,
        [cols.c2]: m.joueur2Id,
        is_bye: false,
        [cols.gagnant]: null,
        statut: "A_JOUER",
      }));
    } else if (tournoi.format === "DOUBLE_ELIMINATION") {
      lignes = genererBracketDoubleElimination(participantIds).map((m) => ({
        tournoi_id: tournoiId,
        bracket: m.bracket,
        round: m.round,
        position: m.position,
        [cols.c1]: m.joueur1Id,
        [cols.c2]: m.joueur2Id,
        is_bye: m.isBye,
        [cols.gagnant]: m.gagnantId,
        statut: "A_JOUER",
      }));
    } else {
      // Ordre manuel → pas de retirage : les joueurs classés sont placés en
      // tête du bracket, et s'il y a des byes, ce sont EUX qui en bénéficient
      // (la distribution anti double-bye sert les premiers de la liste).
      // C'est l'effet concret et vérifiable de la colonne de répartition.
      // NB : la DOUBLE élimination, elle, tire toujours au sort — son moteur
      // n'accepte pas d'ordre imposé et on ne le modifie pas sans besoin réel.
      lignes = genererBracketEliminationSimple(participantIds, Math.random, {
        conserverOrdre: ordreManuelActif,
      }).map((m) => ({
        tournoi_id: tournoiId,
        round: m.round,
        position: m.position,
        [cols.c1]: m.joueur1Id,
        [cols.c2]: m.joueur2Id,
        is_bye: m.isBye,
        [cols.gagnant]: m.gagnantId,
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
      nb_participants: participantIds.length,
      par_equipes: cols.parEquipes,
      nb_matchs: lignes.length,
      format: tournoi.format,
      // Traçabilité du tirage : indispensable pour répondre à « pourquoi je
      // suis tombé contre lui au premier tour ? » sans reconstitution.
      tirage: ordreManuelActif
        ? "ORDRE_MANUEL"
        : notesParticipants
          ? "ELO_SERPENTIN"
          : "ALEATOIRE",
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
    // On déduit les camps du match LUI-MÊME plutôt que de recharger le
    // tournoi : la contrainte `matchs_camps_homogenes` garantit qu'un match
    // porte soit deux joueurs, soit deux équipes, jamais un mélange. Une
    // requête de moins pour une information déjà en main.
    const camp1 = m.equipe1_id ?? m.joueur1_id;
    const camp2 = m.equipe2_id ?? m.joueur2_id;
    if (!camp1 || !camp2) {
      throw new Error(
        "Match incomplet : les deux adversaires ne sont pas encore connus."
      );
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

    const cols = colonnesCamp(tournoi);

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
      // « joueur » ici veut dire CONCURRENT : un joueur en esport, une équipe
      // en sport. lib/poules.ts ne fait pas la différence, il classe des
      // identifiants.
      const joueursPoule = [
        ...new Set(
          deLaPoule.flatMap((m) => {
            const c = campsDuMatch(m, cols.parEquipes);
            return [c.c1, c.c2];
          })
        ),
      ].filter((j): j is string => j !== null);

      const resultats: ResultatPoule[] = deLaPoule.map((m) => ({
        joueur1Id: campsDuMatch(m, cols.parEquipes).c1,
        joueur2Id: campsDuMatch(m, cols.parEquipes).c2,
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
        [cols.c1]: m.joueur1Id,
        [cols.c2]: m.joueur2Id,
        is_bye: m.isBye,
        [cols.gagnant]: m.gagnantId,
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

    // Colonnes du camp : joueur ou équipe selon le tournoi. Tout ce qui suit
    // est écrit une seule fois et sert aux deux verticales.
    const cols = colonnesCamp(tournoi);
    const camps = campsDuMatch(m, cols.parEquipes);

    const validerMatch = (gagnantId: string) =>
      db
        .schema("arena").from("matchs")
        .update({
          statut: "VALIDE",
          [cols.gagnant]: gagnantId,
          valide_par: ctx.userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchId);

    /** Place un CAMP (joueur ou équipe) dans le slot d'un match cible. */
    const placer = async (dest: DestinationDouble, campId: string) => {
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
            ? { [cols.c1]: campId }
            : { [cols.c2]: campId }
        )
        .eq("id", cible.id);
    };

    // const (pas d'expression répétée) → TypeScript sait, dans les branches
    // suivantes, que le bracket ne peut plus valoir "P".
    const bracketMatch = m.bracket ?? "W";

    // Vainqueur effectivement validé, mémorisé pour la mise à jour ELO après
    // les branches (un seul point d'appel au lieu de trois).
    let gagnantValide: string | null = null;

    if (bracketMatch === "P") {
      // Match de POULE : aucun bracket à faire avancer. On fige le résultat,
      // le classement de la poule est recalculé à la lecture (lib/poules.ts).
      const gagnantId =
        (m.score_j1 ?? 0) > (m.score_j2 ?? 0) ? camps.c1 : camps.c2;
      if (!gagnantId) throw new Error("Match de poule incomplet.");
      await validerMatch(gagnantId);
      gagnantValide = gagnantId;
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
          joueur1Id: camps.c1,
          joueur2Id: camps.c2,
          scoreJ1: m.score_j1 ?? 0,
          scoreJ2: m.score_j2 ?? 0,
        },
        k
      );
      await validerMatch(prog.gagnantId);
      gagnantValide = prog.gagnantId;
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
          joueur1Id: camps.c1,
          joueur2Id: camps.c2,
          scoreJ1: m.score_j1 ?? 0,
          scoreJ2: m.score_j2 ?? 0,
        },
        nbRounds
      );
      await validerMatch(prog.gagnantId);
      gagnantValide = prog.gagnantId;
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

    // Mise à jour ELO — APRÈS la validation, et jamais bloquante : si la
    // table annexe casse, le staff a quand même validé son match (le jour J
    // prime), et l'échec est historisé pour être corrigé à froid.
    // Un match VALIDE ne repasse jamais ici (garde `statut !== "TERMINE"` en
    // amont + trigger verrou_match_valide) : pas de double comptage possible.
    if (gagnantValide && camps.c1 && camps.c2) {
      try {
        await mettreAJourElo(
          db,
          tournoi,
          camps.c1,
          camps.c2,
          gagnantValide,
          cols.parEquipes
        );
      } catch (erreurElo) {
        await log(ctx.userId, "ELO_ECHEC", tournoiId, matchId, {
          message:
            erreurElo instanceof Error ? erreurElo.message : String(erreurElo),
        });
      }
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

    // 1. L'ordre de placement, une ligne à la fois. Le volume est de l'ordre
    // de quelques dizaines de participants : une boucle est plus lisible
    // qu'un upsert de masse, et le coût est négligeable.
    //
    // RÈGLE : `ordre` n'est enregistré QUE pour les joueurs PLACÉS dans une
    // colonne (têtes de série ou équipe). Un joueur laissé dans la colonne
    // « non assignés » garde ordre = null. C'est ce null qui permet à
    // demarrerTournoi de distinguer « le staff a classé ce joueur » de « ce
    // joueur passe au tirage au sort » — si on enregistrait l'ordre d'affichage
    // de tout le monde, un seul glisser-déposer transformerait TOUT le tirage
    // en ordre déterministe, silencieusement.
    for (const ligne of repartition) {
      const { error } = await db
        .schema("arena")
        .from("participations")
        .update({ ordre: ligne.colonneId !== null ? ligne.ordre : null })
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

// ---------- Palmarès externe (import Toornament, migration 006) ----------

/**
 * Importe UN résultat Toornament sur le profil d'un joueur ARENA.
 *
 * Flux : le staff colle l'URL du tournoi + choisit le joueur ARENA + indique
 * le pseudo utilisé sur Toornament (par défaut : le pseudo ARENA). On
 * interroge la Viewer API (fiche du tournoi + classement final), on apparie
 * le pseudo, et on stocke une COPIE datée du résultat avec l'URL source.
 *
 * Ce qui est volontairement REFUSÉ :
 *  - importer sans appariement : si le pseudo n'apparaît pas dans le
 *    classement Toornament, l'import échoue avec un message clair. Pas de
 *    résultat « sur parole ».
 *  - toute redistribution de points : le palmarès externe s'affiche, il ne
 *    compte pas dans le classement ARENA (cf. migration 006, décision actée).
 *
 * V1 staff-only : ARENA n'a pas encore d'espace connecté pour les joueurs.
 * Le jour où le login joueur existera (Lot 4), cette action s'ouvrira au
 * joueur pour SON propre profil — la table et la logique ne bougeront pas.
 */
export async function importerResultatToornament(formData: FormData) {
  try {
    const ctx = await requireStaff();
    const db = getServiceClient();

    const joueurId = String(formData.get("joueur_id") ?? "");
    const url = String(formData.get("url") ?? "").trim();
    const nomToornamentSaisi = String(formData.get("nom_participant") ?? "").trim();

    const tournoiExterneId = extraireIdTournoiToornament(url);
    if (!tournoiExterneId) {
      throw new Error(
        "Lien non reconnu : colle l'URL d'un tournoi toornament.com (elle contient /tournaments/<numéro>)."
      );
    }

    const { data: joueurData } = await db
      .schema("arena")
      .from("joueurs")
      .select("id, pseudo")
      .eq("id", joueurId)
      .single();
    if (!joueurData) throw new Error("Joueur introuvable.");
    const nomParticipant = nomToornamentSaisi || (joueurData.pseudo as string);

    // Deux appels réseau : la fiche (nom, jeu, dates) puis le classement.
    const tournoi = await recupererTournoiToornament(tournoiExterneId);
    const resultat = await chercherRangParticipant(tournoiExterneId, nomParticipant);
    if (!resultat) {
      throw new Error(
        `« ${nomParticipant} » n'apparaît pas dans le classement de ce tournoi Toornament. ` +
          "Vérifie le pseudo exact utilisé là-bas (champ « pseudo sur Toornament »)."
      );
    }

    const { error } = await db.schema("arena").from("resultats_externes").insert({
      joueur_id: joueurId,
      source: "TOORNAMENT",
      tournoi_externe_id: tournoiExterneId,
      url,
      nom_tournoi: tournoi.full_name || tournoi.name,
      jeu: tournoi.discipline ?? null,
      nom_participant: resultat.nomTrouve,
      rang: resultat.rang,
      nb_participants: tournoi.size ?? null,
      date_fin: tournoi.scheduled_date_end || null,
      importe_par: ctx.userId,
    });
    if (error) {
      throw new Error(
        error.code === "23505"
          ? "Ce tournoi Toornament est déjà importé pour ce joueur."
          : `Import impossible : ${error.message}`
      );
    }

    await log(ctx.userId, "RESULTAT_EXTERNE_IMPORTE", null, null, {
      joueur_id: joueurId,
      source: "TOORNAMENT",
      tournoi_externe_id: tournoiExterneId,
      rang: resultat.rang,
    });
    revalidatePath("/admin/imports");
  } catch (e) {
    redirectionErreur("/admin/imports", e);
  }
}

/** Retire un résultat importé (erreur d'appariement, demande du joueur…). */
export async function supprimerResultatExterne(formData: FormData) {
  try {
    const ctx = await requireStaff();
    const db = getServiceClient();
    const resultatId = String(formData.get("resultat_id") ?? "");

    const { error } = await db
      .schema("arena")
      .from("resultats_externes")
      .delete()
      .eq("id", resultatId);
    if (error) throw new Error(`Suppression impossible : ${error.message}`);

    await log(ctx.userId, "RESULTAT_EXTERNE_SUPPRIME", null, null, {
      resultat_id: resultatId,
    });
    revalidatePath("/admin/imports");
  } catch (e) {
    redirectionErreur("/admin/imports", e);
  }
}

/**
 * Saisie MANUELLE d'un résultat externe par le staff — pivot du 15/08/2026.
 *
 * CONTEXTE (décision actée avec Clavel le soir même) : l'accès API Toornament
 * est devenu payant — plan « Arena » à 229 €/mois minimum, pour une
 * fonctionnalité d'AFFICHAGE sur une plateforme associative gratuite. Ratio
 * valeur/coût indéfendable. L'import vérifié par API
 * (importerResultatToornament) RESTE dans le code : il se réactive tout seul
 * le jour où TOORNAMENT_API_KEY existe (partenariat, changement de pricing).
 *
 * En attendant, le staff saisit le résultat lui-même, À UNE CONDITION non
 * négociable : fournir le lien du tournoi Toornament. Ce lien est affiché
 * publiquement sur le profil — n'importe qui peut vérifier en un clic.
 * Nuance assumée et affichée honnêtement : le résultat est « vérifiable par
 * tous », pas « vérifié par une machine ». C'est le même modèle de confiance
 * qu'un CV : la source est citée, au lecteur de cliquer.
 */
export async function saisirResultatExterne(formData: FormData) {
  try {
    const ctx = await requireStaff();
    const db = getServiceClient();

    const joueurId = String(formData.get("joueur_id") ?? "");
    const url = String(formData.get("url") ?? "").trim();
    const nomTournoi = String(formData.get("nom_tournoi") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const jeu = String(formData.get("jeu") ?? "").trim() || null;
    const nomParticipantSaisi = String(formData.get("nom_participant") ?? "").trim();
    const rang = Number(formData.get("rang"));
    const nbBrut = String(formData.get("nb_participants") ?? "").trim();
    const nbParticipants = nbBrut === "" ? null : Number(nbBrut);
    const dateFin = String(formData.get("date_fin") ?? "").trim() || null;

    // Le lien EST la preuve : sans un vrai lien de tournoi toornament.com,
    // pas de saisie. Même règle de parsing que l'import API.
    const tournoiExterneId = extraireIdTournoiToornament(url);
    if (!tournoiExterneId) {
      throw new Error(
        "Lien obligatoire et non reconnu : colle l'URL du tournoi sur toornament.com (elle contient /tournaments/<numéro>)."
      );
    }
    if (nomTournoi.length < 1 || nomTournoi.length > 200) {
      throw new Error("Nom du tournoi : entre 1 et 200 caractères.");
    }
    if (!Number.isInteger(rang) || rang < 1) {
      throw new Error("Rang invalide : un entier à partir de 1 (1 = vainqueur).");
    }
    if (
      nbParticipants !== null &&
      (!Number.isInteger(nbParticipants) || nbParticipants < 2 || rang > nbParticipants)
    ) {
      throw new Error(
        "Nombre de participants invalide (au moins 2, et le rang ne peut pas le dépasser)."
      );
    }

    const { data: joueurData } = await db
      .schema("arena")
      .from("joueurs")
      .select("id, pseudo")
      .eq("id", joueurId)
      .single();
    if (!joueurData) throw new Error("Joueur introuvable.");

    const { error } = await db.schema("arena").from("resultats_externes").insert({
      joueur_id: joueurId,
      source: "TOORNAMENT",
      tournoi_externe_id: tournoiExterneId,
      url,
      nom_tournoi: nomTournoi,
      jeu,
      nom_participant: nomParticipantSaisi || (joueurData.pseudo as string),
      rang,
      nb_participants: nbParticipants,
      date_fin: dateFin,
      importe_par: ctx.userId,
    });
    if (error) {
      throw new Error(
        error.code === "23505"
          ? "Ce tournoi Toornament est déjà enregistré pour ce joueur."
          : `Saisie impossible : ${error.message}`
      );
    }

    await log(ctx.userId, "RESULTAT_EXTERNE_SAISI", null, null, {
      joueur_id: joueurId,
      tournoi_externe_id: tournoiExterneId,
      rang,
    });
    revalidatePath("/admin/imports");
  } catch (e) {
    redirectionErreur("/admin/imports", e);
  }
}
