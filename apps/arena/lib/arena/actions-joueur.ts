"use server";

/**
 * Server Actions de l'ESPACE JOUEUR (12/11/2026, migration 010).
 *
 * Séparées de actions.ts (flux staff) parce que le contrôle d'accès n'est
 * pas le même : ici on vérifie seulement « qui est connecté » (requireUtilisateur),
 * jamais « est-il staff ». Chaque action :
 *   1. identifie le compte connecté (session SSO .velito.fr) ;
 *   2. charge ce qu'il faut, demande au module pur espace-joueur.ts si
 *      c'est permis ;
 *   3. écrit avec service_role, toujours filtré par l'id du compte connecté
 *      (jamais par un id venu du formulaire) ;
 *   4. trace dans arena.logs.
 *
 * Point à défendre au jury : le formulaire ne transmet JAMAIS l'id du
 * joueur. Le joueur est retrouvé côté serveur à partir du compte connecté.
 * Impossible donc d'inscrire ou de désinscrire quelqu'un d'autre en
 * modifiant un champ caché.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServiceClient } from "../supabase/service";
import { requireUtilisateur } from "./auth";
import { champsJoueurPourAnnee, validerAnneeNaissance } from "./age";
import {
  peutDemanderRattachement,
  peutSeDesinscrire,
  peutSInscrireEnLigne,
  validerPseudo,
} from "./espace-joueur";
import { messageErreurBase, type ErreurBase } from "./erreurs";
import type { StatutTournoi } from "./types";

// ---------- Helpers (copie locale : un fichier "use server" n'exporte que des actions) ----------

function versPage(chemin: string, e: unknown): never {
  if (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  ) {
    throw e;
  }
  const message = e instanceof Error ? e.message : "Erreur inattendue, réessaie.";
  const sep = chemin.includes("?") ? "&" : "?";
  redirect(`${chemin}${sep}erreur=${encodeURIComponent(message)}`);
}

function erreurBase(contexte: string, erreur: ErreurBase | null | undefined): Error {
  console.error(`[arena/actions-joueur] ${contexte}`, erreur?.code, erreur?.message);
  return new Error(messageErreurBase(erreur, contexte));
}

async function log(acteurId: string, action: string, tournoiId: string | null, detail: Record<string, unknown>) {
  await getServiceClient().schema("arena").from("logs").insert({
    acteur_id: acteurId,
    action,
    tournoi_id: tournoiId,
    match_id: null,
    detail,
  });
}

/** Le joueur relié au compte, ou null. */
async function joueurDuCompte(userId: string) {
  const { data } = await getServiceClient()
    .schema("arena")
    .from("joueurs")
    .select("id, pseudo, anonymise")
    .eq("user_id", userId)
    .maybeSingle();
  return data && !data.anonymise ? (data as { id: string; pseudo: string }) : null;
}

async function demandeEnCours(userId: string) {
  const { data } = await getServiceClient()
    .schema("arena")
    .from("demandes_rattachement")
    .select("id")
    .eq("user_id", userId)
    .eq("statut", "EN_ATTENTE")
    .maybeSingle();
  return data as { id: string } | null;
}

// ---------- Profil ----------

/**
 * « Première fois sur ARENA » : crée un joueur relié au compte.
 * Même règle d'âge que l'inscription au bureau (age.ts) : mineur ⇒ profil
 * restreint. Un moins de 15 ans peut créer son profil, mais son check-in
 * sera refusé tant que le staff n'a pas l'autorisation parentale.
 */
export async function creerProfilJoueur(formData: FormData) {
  try {
    const user = await requireUtilisateur();
    const db = getServiceClient();

    if (await joueurDuCompte(user.id)) throw new Error("Ton compte a déjà un profil ARENA.");
    if (await demandeEnCours(user.id)) {
      throw new Error("Tu as une demande de rattachement en attente : annule-la d'abord.");
    }

    const pseudo = validerPseudo(formData.get("pseudo") as string | null);
    if (!pseudo) throw new Error("Pseudo invalide : 2 à 32 caractères, sans caractère spécial invisible.");

    const anneeCourante = new Date().getFullYear();
    const annee = validerAnneeNaissance(formData.get("annee_naissance") as string | null, anneeCourante);
    if (annee === null) {
      throw new Error("Année de naissance requise (4 chiffres) : elle sert uniquement à protéger les mineurs.");
    }
    if (formData.get("reglement") !== "on") {
      throw new Error("Coche l'acceptation du règlement pour créer ton profil.");
    }

    const champs = champsJoueurPourAnnee(annee, anneeCourante);
    const { data: cree, error } = await db
      .schema("arena")
      .from("joueurs")
      .insert({ pseudo, user_id: user.id, ...champs, consentement_parental_at: null })
      .select("id")
      .single();
    if (error) {
      // 23505 : pseudo déjà pris. Message utile : c'est peut-être SON pseudo.
      if (error.code === "23505") {
        throw new Error(
          `Le pseudo « ${pseudo} » existe déjà. Si c'est toi (tu as déjà joué à un tournoi), utilise « C'est mon pseudo ».`
        );
      }
      throw erreurBase("Création du profil impossible", error);
    }

    // Consentements tracés tels quels (table append-only), source web.
    await db.schema("arena").from("consentements").insert([
      { joueur_id: cree.id, type: "CGU", accorde: true, source: "web" },
      { joueur_id: cree.id, type: "AFFICHAGE_PUBLIC", accorde: champs.profil_public, source: "web" },
    ]);
    await log(user.id, "PROFIL_CREE_EN_LIGNE", null, { joueur_id: cree.id, est_mineur: champs.est_mineur });

    revalidatePath("/moi");
  } catch (e) {
    versPage("/moi", e);
  }
  redirect("/moi");
}

/** « C'est mon pseudo » : demande au staff de relier un pseudo existant. */
export async function demanderRattachement(formData: FormData) {
  try {
    const user = await requireUtilisateur();
    const db = getServiceClient();
    const pseudo = validerPseudo(formData.get("pseudo") as string | null);
    if (!pseudo) throw new Error("Pseudo invalide.");

    // Recherche insensible à la casse : « lea » retrouve « Lea ». ilike sans
    // joker = égalité insensible à la casse (on échappe % et _).
    const motif = pseudo.replace(/[%_\\]/g, (c) => `\\${c}`);
    const { data: joueur } = await db
      .schema("arena")
      .from("joueurs")
      .select("id, user_id, anonymise")
      .ilike("pseudo", motif)
      .maybeSingle();

    const verdict = peutDemanderRattachement({
      joueur: joueur ? { user_id: joueur.user_id as string | null, anonymise: Boolean(joueur.anonymise) } : null,
      compteDejaRelie: Boolean(await joueurDuCompte(user.id)),
      demandeEnCours: Boolean(await demandeEnCours(user.id)),
    });
    if (!verdict.ok) throw new Error(verdict.raison);

    const { error } = await db
      .schema("arena")
      .from("demandes_rattachement")
      .insert({ joueur_id: joueur!.id, user_id: user.id });
    if (error) {
      if (error.code === "23505") {
        throw new Error("Quelqu'un a déjà demandé ce pseudo. Le staff va trancher ; parles-en avec lui.");
      }
      throw erreurBase("Demande impossible", error);
    }
    await log(user.id, "RATTACHEMENT_DEMANDE", null, { joueur_id: joueur!.id });
    revalidatePath("/moi");
  } catch (e) {
    versPage("/moi", e);
  }
  redirect("/moi");
}

export async function annulerDemandeRattachement() {
  try {
    const user = await requireUtilisateur();
    // Filtré par user_id du compte connecté : on ne peut annuler que la sienne.
    const { error } = await getServiceClient()
      .schema("arena")
      .from("demandes_rattachement")
      .update({ statut: "ANNULEE" })
      .eq("user_id", user.id)
      .eq("statut", "EN_ATTENTE");
    if (error) throw erreurBase("Annulation impossible", error);
    await log(user.id, "RATTACHEMENT_ANNULE", null, {});
    revalidatePath("/moi");
  } catch (e) {
    versPage("/moi", e);
  }
  redirect("/moi");
}

// ---------- Inscription à un tournoi ----------

async function chargerTournoiParToken(token: string) {
  const { data } = await getServiceClient()
    .schema("arena")
    .from("tournois")
    .select("id, statut, inscription_en_ligne, max_joueurs, qr_token")
    .eq("qr_token", token)
    .maybeSingle();
  if (!data) throw new Error("Tournoi introuvable.");
  return data as {
    id: string;
    statut: StatutTournoi;
    inscription_en_ligne: boolean;
    max_joueurs: number | null;
    qr_token: string;
  };
}

/**
 * Inscription en ligne depuis la page QR /t/[token]. Le joueur n'est PAS
 * pointé présent (check_in = false) : c'est le staff qui le pointe le jour J,
 * et seuls les pointés entrent dans le bracket. S'inscrire en ligne réserve
 * une place, ça ne remplace pas la présence.
 */
export async function inscrireEnLigne(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const page = `/t/${token}`;
  try {
    const user = await requireUtilisateur();
    const db = getServiceClient();
    const joueur = await joueurDuCompte(user.id);
    if (!joueur) throw new Error("Crée ou relie d'abord ton profil joueur dans « Mon espace ».");

    const tournoi = await chargerTournoiParToken(token);
    const [{ count }, { data: deja }] = await Promise.all([
      db.schema("arena").from("participations").select("id", { count: "exact", head: true }).eq("tournoi_id", tournoi.id),
      db
        .schema("arena")
        .from("participations")
        .select("id")
        .eq("tournoi_id", tournoi.id)
        .eq("joueur_id", joueur.id)
        .maybeSingle(),
    ]);

    const verdict = peutSInscrireEnLigne({ tournoi, nbInscrits: count ?? 0, dejaInscrit: Boolean(deja) });
    if (!verdict.ok) throw new Error(verdict.raison);

    const { error } = await db
      .schema("arena")
      .from("participations")
      .insert({ tournoi_id: tournoi.id, joueur_id: joueur.id, check_in: false, source: "en_ligne" });
    if (error && error.code !== "23505") throw erreurBase("Inscription impossible", error);

    await log(user.id, "INSCRIPTION_EN_LIGNE", tournoi.id, { joueur_id: joueur.id });
    revalidatePath(page);
    revalidatePath("/moi");
  } catch (e) {
    versPage(page, e);
  }
  redirect(page);
}

export async function seDesinscrire(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const retour = String(formData.get("retour") ?? "") === "moi" ? "/moi" : `/t/${token}`;
  try {
    const user = await requireUtilisateur();
    const db = getServiceClient();
    const joueur = await joueurDuCompte(user.id);
    if (!joueur) throw new Error("Aucun profil joueur relié à ton compte.");

    const tournoi = await chargerTournoiParToken(token);
    const { data: part } = await db
      .schema("arena")
      .from("participations")
      .select("id, check_in")
      .eq("tournoi_id", tournoi.id)
      .eq("joueur_id", joueur.id)
      .maybeSingle();
    if (!part) throw new Error("Tu n'es pas inscrit à ce tournoi.");

    const verdict = peutSeDesinscrire({ statut: tournoi.statut, checkIn: Boolean(part.check_in) });
    if (!verdict.ok) throw new Error(verdict.raison);

    const { error } = await db.schema("arena").from("participations").delete().eq("id", part.id);
    if (error) throw erreurBase("Désinscription impossible", error);

    await log(user.id, "DESINSCRIPTION_EN_LIGNE", tournoi.id, { joueur_id: joueur.id });
    revalidatePath(`/t/${token}`);
    revalidatePath("/moi");
  } catch (e) {
    versPage(retour, e);
  }
  redirect(retour);
}
