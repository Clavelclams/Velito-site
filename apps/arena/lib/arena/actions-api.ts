"use server";

/**
 * Server Actions de gestion des clés d'API (14/11/2026, migration 014).
 *
 * Mêmes règles que le reste de l'espace orga : requireStaff() d'abord,
 * l'organisation visée doit être l'une des tiennes, écriture avec
 * service_role ensuite, trace dans arena.logs.
 *
 * La clé complète ne sort qu'UNE fois : dans la valeur de retour de
 * creerCleApi, affichée par le composant client qui l'a demandée. Elle ne
 * passe ni dans l'URL, ni dans un cookie, ni dans les journaux.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServiceClient } from "../supabase/service";
import { estStaffDe, requireStaff } from "./auth";
import { empreinteCle, genererCle, nomCleValide, prefixeAffiche } from "./api-cles";

/** Au-delà, c'est qu'on oublie de révoquer les anciennes. */
const CLES_ACTIVES_MAX = 10;

export interface EtatCreationCle {
  cle?: string;
  nom?: string;
  erreur?: string;
}

export async function creerCleApi(
  _precedent: EtatCreationCle,
  formData: FormData
): Promise<EtatCreationCle> {
  try {
    const ctx = await requireStaff();
    const organisationId = String(formData.get("organisation_id") ?? "");
    if (!estStaffDe(ctx, organisationId)) {
      return { erreur: "Organisation introuvable parmi les tiennes." };
    }
    const nom = nomCleValide(String(formData.get("nom") ?? ""));
    if (!nom) return { erreur: "Donne un nom à la clé (2 à 60 caractères), par exemple « Site du club »." };

    const db = getServiceClient();
    const { count, error: errCompte } = await db
      .schema("arena")
      .from("api_cles")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .is("revoquee_le", null);
    if (errCompte) {
      console.error("[arena/actions-api] compte", errCompte.code, errCompte.message);
      return { erreur: "Clés indisponibles pour le moment. La migration 014 est-elle passée ?" };
    }
    if ((count ?? 0) >= CLES_ACTIVES_MAX) {
      return { erreur: `${CLES_ACTIVES_MAX} clés actives au maximum : révoque celles qui ne servent plus.` };
    }

    const cle = genererCle();
    const { data, error } = await db
      .schema("arena")
      .from("api_cles")
      .insert({
        organisation_id: organisationId,
        nom,
        prefixe: prefixeAffiche(cle),
        empreinte: empreinteCle(cle),
        cree_par: ctx.userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[arena/actions-api] création", error?.code, error?.message);
      return { erreur: "La clé n'a pas pu être créée. Réessaie." };
    }

    const { error: errLog } = await db.schema("arena").from("logs").insert({
      acteur_id: ctx.userId,
      action: "API_CLE_CREEE",
      tournoi_id: null,
      match_id: null,
      // Jamais la clé ni son empreinte dans le journal : le préfixe suffit.
      detail: { cle_id: data.id, organisation_id: organisationId, nom, prefixe: prefixeAffiche(cle) },
    });
    if (errLog) console.error("[arena/actions-api] journal", errLog.code, errLog.message);

    revalidatePath("/admin/api");
    return { cle, nom };
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : "Erreur inattendue, réessaie." };
  }
}

export async function revoquerCleApi(formData: FormData) {
  let message: string | null = null;
  try {
    const ctx = await requireStaff();
    const id = String(formData.get("cle_id") ?? "");
    const db = getServiceClient();
    const { data: cle } = await db
      .schema("arena")
      .from("api_cles")
      .select("id, organisation_id, nom, prefixe, revoquee_le")
      .eq("id", id)
      .maybeSingle();
    if (!cle || !estStaffDe(ctx, cle.organisation_id as string)) {
      message = "Clé introuvable parmi tes organisations.";
    } else if (!cle.revoquee_le) {
      // Conditionnelle : deux clics simultanés ne journalisent qu'une révocation.
      const { data: maj, error } = await db
        .schema("arena")
        .from("api_cles")
        .update({ revoquee_le: new Date().toISOString() })
        .eq("id", id)
        .is("revoquee_le", null)
        .select("id");
      if (error) {
        console.error("[arena/actions-api] révocation", error.code, error.message);
        message = "La clé n'a pas pu être révoquée. Réessaie.";
      } else if (maj && maj.length > 0) {
        const { error: errLog } = await db.schema("arena").from("logs").insert({
          acteur_id: ctx.userId,
          action: "API_CLE_REVOQUEE",
          tournoi_id: null,
          match_id: null,
          detail: { cle_id: id, organisation_id: cle.organisation_id, nom: cle.nom, prefixe: cle.prefixe },
        });
        if (errLog) console.error("[arena/actions-api] journal", errLog.code, errLog.message);
      }
    }
  } catch (e) {
    message = e instanceof Error ? e.message : "Erreur inattendue, réessaie.";
  }
  revalidatePath("/admin/api");
  if (message) redirect(`/admin/api?erreur=${encodeURIComponent(message)}`);
}
