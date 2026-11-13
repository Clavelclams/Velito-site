"use server";

/**
 * Actions serveur des boîtes à livres (13/11/2026).
 *
 * Deux familles, deux contrôles différents :
 *  1. signalerAction : PUBLIQUE, sans compte. Contrôles : champ piège,
 *     type dans la liste, boîte active, au plus 20 signalements par boîte
 *     et par heure. Aucune donnée sur la personne n'est gardée.
 *  2. Actions bénévoles (ajouter, modifier, traiter) : requireAdmin() d'abord.
 *
 * Toutes écrivent avec service_role APRÈS ces contrôles : la base n'accorde
 * aucune écriture au navigateur (voir sql/001_livres_schema.sql).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServiceClient } from "../supabase/service";
import { requireAdmin } from "./auth";
import {
  coordonneesPlausibles,
  estEtat,
  estTypeSignalement,
  etatApresSignalement,
  nettoyerMessage,
  signalementAccepte,
  slugifier,
  type EtatBoite,
} from "./regles";

function estRedirection(e: unknown): boolean {
  return (
    typeof e === "object" && e !== null && "digest" in e &&
    String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}
function versPage(chemin: string, e: unknown): never {
  if (estRedirection(e)) throw e;
  const message = e instanceof Error ? e.message : "Erreur inattendue, réessaie.";
  const sep = chemin.includes("?") ? "&" : "?";
  redirect(`${chemin}${sep}erreur=${encodeURIComponent(message)}`);
}

// ---------------------------------------------------------------------------
// 1. Signalement public
// ---------------------------------------------------------------------------

export async function signalerAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const page = `/boite/${encodeURIComponent(slug)}`;
  try {
    // Champ piège : invisible pour un humain. Rempli = robot : on remercie
    // sans rien enregistrer (lui dire « refusé » l'aiderait à contourner).
    if (String(formData.get("site_web") ?? "").trim() !== "") redirect(`${page}?merci=1`);

    const type = formData.get("type");
    if (!estTypeSignalement(type)) throw new Error("Choix inconnu.");
    const message = nettoyerMessage(formData.get("message") as string | null);

    const db = getServiceClient();
    const { data: boite } = await db
      .schema("livres").from("boites")
      .select("id, etat, depots_total")
      .eq("slug", slug).eq("active", true)
      .maybeSingle();
    if (!boite) throw new Error("Boîte introuvable.");

    // Limite d'abus par boîte, sans rien savoir de la personne.
    const uneHeure = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await db
      .schema("livres").from("signalements")
      .select("id", { count: "exact", head: true })
      .eq("boite_id", boite.id).gte("created_at", uneHeure);
    if (!signalementAccepte(count ?? 0)) redirect(`${page}?merci=1`);

    const { error: errSig } = await db
      .schema("livres").from("signalements")
      .insert({ boite_id: boite.id, type, message });
    if (errSig) {
      console.error("[livres] signalement", errSig.code, errSig.message);
      throw new Error("Le signalement n'a pas pu être enregistré. Réessaie dans un instant.");
    }

    const nouvelEtat = etatApresSignalement(boite.etat as EtatBoite, type);
    const { error: errBoite } = await db
      .schema("livres").from("boites")
      .update({
        etat: nouvelEtat,
        etat_maj_le: new Date().toISOString(),
        depots_total: (boite.depots_total as number) + (type === "depot" ? 1 : 0),
        updated_at: new Date().toISOString(),
      })
      .eq("id", boite.id);
    // Le signalement est enregistré : un échec ici n'empêche pas de remercier,
    // un bénévole verra le signalement dans l'administration.
    if (errBoite) console.error("[livres] mise à jour de l'état", errBoite.code, errBoite.message);

    revalidatePath(page);
    revalidatePath("/");
  } catch (e) {
    versPage(page, e);
  }
  redirect(`${page}?merci=1`);
}

// ---------------------------------------------------------------------------
// 2. Bénévoles
// ---------------------------------------------------------------------------

function lireBoiteFormulaire(formData: FormData) {
  const nom = String(formData.get("nom") ?? "").trim();
  if (nom.length < 2 || nom.length > 80) throw new Error("Nom : 2 à 80 caractères.");
  const lat = Number(String(formData.get("lat") ?? "").replace(",", "."));
  const lng = Number(String(formData.get("lng") ?? "").replace(",", "."));
  if (!coordonneesPlausibles(lat, lng)) {
    throw new Error("Coordonnées hors d'Amiens. Copie-les depuis OpenStreetMap ou Google Maps (latitude 49.8 à 50.0, longitude 2.2 à 2.4).");
  }
  const texte = (cle: string, max: number) => {
    const v = String(formData.get(cle) ?? "").trim().slice(0, max);
    return v.length > 0 ? v : null;
  };
  const photo = texte("photo_url", 500);
  if (photo && !photo.startsWith("https://")) throw new Error("La photo doit être une adresse https://.");
  const origine = String(formData.get("origine") ?? "existante");
  if (!["existante", "velito", "ville", "budget_participatif"].includes(origine)) throw new Error("Origine inconnue.");
  return {
    nom,
    lat,
    lng,
    adresse: texte("adresse", 200),
    quartier: texte("quartier", 80),
    description: texte("description", 1000),
    referent: texte("referent", 40),
    photo_url: photo,
    origine,
  };
}

export async function ajouterBoiteAction(formData: FormData) {
  let slug = "";
  try {
    await requireAdmin();
    const champs = lireBoiteFormulaire(formData);
    slug = slugifier(champs.nom);
    if (!slug) throw new Error("Nom invalide.");
    const { error } = await getServiceClient()
      .schema("livres").from("boites")
      .insert({ ...champs, slug });
    if (error) {
      if (error.code === "23505") throw new Error("Une boîte porte déjà ce nom. Précise-le (ex. ajoute la rue).");
      console.error("[livres] ajout", error.code, error.message);
      throw new Error("Ajout impossible.");
    }
    revalidatePath("/");
    revalidatePath("/admin");
  } catch (e) {
    versPage("/admin", e);
  }
  redirect(`/admin?ajoute=${encodeURIComponent(slug)}`);
}

export async function modifierBoiteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const page = `/admin/boite/${id}`;
  try {
    await requireAdmin();
    const champs = lireBoiteFormulaire(formData);
    const etat = formData.get("etat");
    if (!estEtat(etat)) throw new Error("État inconnu.");
    const active = formData.get("active") === "on";
    const { data: avant } = await getServiceClient()
      .schema("livres").from("boites").select("etat, slug").eq("id", id).maybeSingle();
    if (!avant) throw new Error("Boîte introuvable.");
    const { error } = await getServiceClient()
      .schema("livres").from("boites")
      .update({
        ...champs,
        etat,
        // On ne date l'état que s'il a vraiment changé.
        ...(avant.etat !== etat ? { etat_maj_le: new Date().toISOString() } : {}),
        active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      console.error("[livres] modification", error.code, error.message);
      throw new Error("Modification impossible.");
    }
    revalidatePath("/");
    revalidatePath(`/boite/${avant.slug}`);
    revalidatePath(page);
  } catch (e) {
    versPage(page, e);
  }
  redirect(`${page}?enregistre=1`);
}

export async function traiterSignalementAction(formData: FormData) {
  const boiteId = String(formData.get("boite_id") ?? "");
  const page = `/admin/boite/${boiteId}`;
  try {
    const { userId } = await requireAdmin();
    const { error } = await getServiceClient()
      .schema("livres").from("signalements")
      .update({ traite_le: new Date().toISOString(), traite_par: userId })
      .eq("id", String(formData.get("signalement_id") ?? ""))
      .eq("boite_id", boiteId)
      .is("traite_le", null);
    if (error) throw new Error("Impossible de marquer le signalement comme traité.");
    revalidatePath(page);
    revalidatePath("/admin");
  } catch (e) {
    versPage(page, e);
  }
}
