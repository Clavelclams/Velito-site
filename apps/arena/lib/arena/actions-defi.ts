"use server";

/**
 * Server Actions du « défi au score » (17/11/2026, migration 015).
 *
 * Mêmes règles que le reste de l'espace orga : requireStaff() d'abord, le
 * défi doit appartenir à l'une de TES organisations, écriture avec
 * service_role ensuite. Pas de journal arena.logs ici : rien de personnel
 * à tracer, et un atelier se corrige librement (ce n'est pas une
 * compétition officielle, décision de Clavel).
 *
 * Les actions de score (+/−, saisie directe) RENVOIENT le nouveau score au
 * composant client au lieu de recharger la page : un appui = une requête
 * courte, utilisable d'une main pendant que l'autre tient la feuille.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServiceClient } from "../supabase/service";
import { estStaffDe, requireStaff } from "./auth";
import { COULEURS, parserProgramme, type Phase } from "./defi";

function versPage(chemin: string, e: unknown): never {
  if (typeof e === "object" && e !== null && "digest" in e && String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) {
    throw e;
  }
  const message = e instanceof Error ? e.message : "Erreur inattendue, réessaie.";
  redirect(`${chemin}?erreur=${encodeURIComponent(message)}`);
}

async function defiDeMonOrga(defiId: string) {
  const ctx = await requireStaff();
  const { data } = await getServiceClient().schema("arena").from("defis")
    .select("id, organisation_id, duree_manche_s").eq("id", defiId).maybeSingle();
  if (!data || !estStaffDe(ctx, data.organisation_id as string)) throw new Error("Défi introuvable pour tes organisations.");
  return { ctx, defi: data as { id: string; organisation_id: string; duree_manche_s: number } };
}

async function rotationDeMonOrga(rotationId: string) {
  const { data } = await getServiceClient().schema("arena").from("defi_rotations")
    .select("id, defi_id, statut").eq("id", rotationId).maybeSingle();
  if (!data) throw new Error("Rotation introuvable.");
  const { defi } = await defiDeMonOrga(data.defi_id as string);
  return { defi, rotation: data as { id: string; defi_id: string; statut: string } };
}

function verif(error: { message: string; code?: string } | null, contexte: string) {
  if (error) {
    console.error(`[arena/actions-defi] ${contexte}`, error.code, error.message);
    throw new Error(`${contexte} : réessaie.`);
  }
}

// ---------- Création ----------

export async function creerDefi(formData: FormData) {
  let id: string | null = null;
  try {
    const ctx = await requireStaff();
    const organisationId = String(formData.get("organisation_id") ?? "");
    if (!estStaffDe(ctx, organisationId)) throw new Error("Organisation introuvable parmi les tiennes.");
    const titre = String(formData.get("titre") ?? "").replace(/\s+/g, " ").trim();
    if (titre.length < 2 || titre.length > 120) throw new Error("Titre : 2 à 120 caractères.");
    const unite = String(formData.get("unite") ?? "plats").trim().slice(0, 20) || "plats";
    const minutes = Number(formData.get("duree_minutes") ?? 4);
    if (!Number.isFinite(minutes) || minutes < 0.5 || minutes > 30) throw new Error("Durée de manche : entre 0,5 et 30 minutes.");
    const programme = parserProgramme(String(formData.get("programme") ?? ""));
    if (!programme.ok) throw new Error(programme.erreur);

    const db = getServiceClient();
    const { data: defi, error } = await db.schema("arena").from("defis")
      .insert({ organisation_id: organisationId, titre, unite, duree_manche_s: Math.round(minutes * 60), cree_par: ctx.userId })
      .select("id").single();
    verif(error, "Création du défi impossible");
    id = defi!.id as string;

    const { data: rotations, error: e2 } = await db.schema("arena").from("defi_rotations")
      .insert(programme.rotations.map((r) => ({ defi_id: id, numero: r.numero, heure: r.heure })))
      .select("id");
    if (e2 || !rotations) {
      await db.schema("arena").from("defis").delete().eq("id", id);
      verif(e2 ?? { message: "rotations" }, "Création des rotations impossible");
    }
    const { error: e3 } = await db.schema("arena").from("defi_equipes")
      .insert(rotations!.flatMap((r) => COULEURS.map((couleur) => ({ defi_id: id, rotation_id: r.id, couleur }))));
    if (e3) {
      await db.schema("arena").from("defis").delete().eq("id", id);
      verif(e3, "Création des équipes impossible");
    }
  } catch (e) {
    versPage("/admin/defis", e);
  }
  redirect(`/admin/defis/${id}`);
}

// ---------- Déroulé ----------

export async function choisirRotation(formData: FormData) {
  const defiId = String(formData.get("defi_id") ?? "");
  try {
    const { rotation, defi } = await rotationDeMonOrga(String(formData.get("rotation_id") ?? ""));
    if (rotation.defi_id !== defiId || defi.id !== defiId) throw new Error("Rotation d'un autre défi.");
    const db = getServiceClient();
    const { error } = await db.schema("arena").from("defis").update({ rotation_courante_id: rotation.id }).eq("id", defiId);
    verif(error, "Changement de rotation impossible");
    if (rotation.statut === "A_VENIR") {
      const { error: e2 } = await db.schema("arena").from("defi_rotations").update({ statut: "EN_COURS" }).eq("id", rotation.id);
      verif(e2, "Changement de rotation impossible");
    }
  } catch (e) {
    versPage(`/admin/defis/${defiId}`, e);
  }
  revalidatePath(`/admin/defis/${defiId}`);
}

export async function lancerChrono(formData: FormData) {
  const defiId = String(formData.get("defi_id") ?? "");
  try {
    const { rotation, defi } = await rotationDeMonOrga(String(formData.get("rotation_id") ?? ""));
    if (rotation.defi_id !== defiId) throw new Error("Rotation d'un autre défi.");
    const phase = String(formData.get("phase")) as Phase;
    if (phase !== "ESSAI" && phase !== "COMPTEE") throw new Error("Manche inconnue.");
    const minutes = Number(formData.get("duree_minutes") ?? defi.duree_manche_s / 60);
    if (!Number.isFinite(minutes) || minutes < 0.5 || minutes > 30) throw new Error("Durée : entre 0,5 et 30 minutes.");
    const debut = new Date();
    const fin = new Date(debut.getTime() + Math.round(minutes * 60) * 1000);
    const db = getServiceClient();
    const { error } = await db.schema("arena").from("defi_rotations").update({
      phase, chrono_debut: debut.toISOString(), chrono_fin: fin.toISOString(),
      ...(rotation.statut === "A_VENIR" ? { statut: "EN_COURS" } : {}),
    }).eq("id", rotation.id);
    verif(error, "Chrono non lancé");
    const { error: e2 } = await db.schema("arena").from("defis").update({ rotation_courante_id: rotation.id }).eq("id", defiId);
    verif(e2, "Chrono non lancé");
  } catch (e) {
    versPage(`/admin/defis/${defiId}`, e);
  }
  revalidatePath(`/admin/defis/${defiId}`);
}

export async function arreterChrono(formData: FormData) {
  const defiId = String(formData.get("defi_id") ?? "");
  try {
    const { rotation } = await rotationDeMonOrga(String(formData.get("rotation_id") ?? ""));
    const { error } = await getServiceClient().schema("arena").from("defi_rotations")
      .update({ chrono_fin: new Date().toISOString() }).eq("id", rotation.id).gt("chrono_fin", new Date().toISOString());
    verif(error, "Chrono non arrêté");
  } catch (e) {
    versPage(`/admin/defis/${defiId}`, e);
  }
  revalidatePath(`/admin/defis/${defiId}`);
}

export async function validerRotation(formData: FormData) {
  const defiId = String(formData.get("defi_id") ?? "");
  try {
    const { rotation } = await rotationDeMonOrga(String(formData.get("rotation_id") ?? ""));
    const maintenant = new Date().toISOString();
    const db = getServiceClient();
    // Le chrono encore en cours s'arrête : la rotation est finie.
    await db.schema("arena").from("defi_rotations").update({ chrono_fin: maintenant }).eq("id", rotation.id).gt("chrono_fin", maintenant);
    const { error } = await db.schema("arena").from("defi_rotations")
      .update({ statut: "VALIDEE", valide_le: maintenant }).eq("id", rotation.id);
    verif(error, "Validation impossible");
  } catch (e) {
    versPage(`/admin/defis/${defiId}`, e);
  }
  revalidatePath(`/admin/defis/${defiId}`);
}

/** Correction après validation : la rotation repasse en cours. */
export async function rouvrirRotation(formData: FormData) {
  const defiId = String(formData.get("defi_id") ?? "");
  try {
    const { rotation } = await rotationDeMonOrga(String(formData.get("rotation_id") ?? ""));
    const { error } = await getServiceClient().schema("arena").from("defi_rotations")
      .update({ statut: "EN_COURS", valide_le: null }).eq("id", rotation.id);
    verif(error, "Réouverture impossible");
  } catch (e) {
    versPage(`/admin/defis/${defiId}`, e);
  }
  revalidatePath(`/admin/defis/${defiId}`);
}

/** Remise à zéro complète (après un essai) : il faut taper le mot ZERO. */
export async function remettreAZero(formData: FormData) {
  const defiId = String(formData.get("defi_id") ?? "");
  try {
    await defiDeMonOrga(defiId);
    if (String(formData.get("confirmation") ?? "").trim().toUpperCase() !== "ZERO") {
      throw new Error("Tape ZERO pour confirmer la remise à zéro.");
    }
    const db = getServiceClient();
    const { error: e1 } = await db.schema("arena").from("defi_equipes").update({ score: 0 }).eq("defi_id", defiId);
    verif(e1, "Remise à zéro impossible");
    const { error: e2 } = await db.schema("arena").from("defi_rotations")
      .update({ statut: "A_VENIR", phase: null, chrono_debut: null, chrono_fin: null, valide_le: null }).eq("defi_id", defiId);
    verif(e2, "Remise à zéro impossible");
    const { error: e3 } = await db.schema("arena").from("defis").update({ rotation_courante_id: null }).eq("id", defiId);
    verif(e3, "Remise à zéro impossible");
  } catch (e) {
    versPage(`/admin/defis/${defiId}`, e);
  }
  revalidatePath(`/admin/defis/${defiId}`);
}

// ---------- Score (appelées depuis le composant client) ----------

async function equipeDeMonOrga(equipeId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(equipeId)) throw new Error("Équipe introuvable.");
  const { data } = await getServiceClient().schema("arena").from("defi_equipes")
    .select("id, defi_id").eq("id", equipeId).maybeSingle();
  if (!data) throw new Error("Équipe introuvable.");
  await defiDeMonOrga(data.defi_id as string);
}

export async function ajusterScore(equipeId: string, delta: number): Promise<{ score?: number; erreur?: string }> {
  try {
    if (!Number.isInteger(delta) || Math.abs(delta) > 50) throw new Error("Ajustement invalide.");
    await equipeDeMonOrga(equipeId);
    const { data, error } = await getServiceClient().schema("arena").rpc("defi_ajuster_score", { p_equipe: equipeId, p_delta: delta });
    verif(error, "Score non enregistré");
    return { score: data as number };
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : "Score non enregistré." };
  }
}

export async function fixerScore(equipeId: string, valeur: number): Promise<{ score?: number; erreur?: string }> {
  try {
    if (!Number.isInteger(valeur) || valeur < 0 || valeur > 999) throw new Error("Score : un nombre entier de 0 à 999.");
    await equipeDeMonOrga(equipeId);
    const { data, error } = await getServiceClient().schema("arena").from("defi_equipes")
      .update({ score: valeur }).eq("id", equipeId).select("score").single();
    verif(error, "Score non enregistré");
    return { score: data!.score as number };
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : "Score non enregistré." };
  }
}
