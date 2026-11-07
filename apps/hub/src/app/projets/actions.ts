/**
 * Server actions — /projets (07/11/2026).
 *
 * Toutes les écritures passent ici. La sécurité réelle est en base (RLS de
 * sql/projets-v1.sql : admin hub, propriétaire, dev, lecteur) ; ces actions
 * ajoutent la validation des saisies et des messages clairs. Une action
 * refusée par la RLS renvoie une erreur lisible, jamais un détail technique.
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugifier, type StatutEtape } from "@/lib/projets/avancement";

export interface Resultat {
  success: boolean;
  error?: string;
}

const STATUTS_PROJET = ["idee", "en_cours", "en_pause", "livre", "abandonne"];
const STATUTS_ETAPE: StatutEtape[] = ["a_faire", "en_cours", "fait", "abandonne"];
const TYPES_JOURNAL = ["fait", "decision", "bug", "note"];

function texte(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}
function dateValide(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
}
function aujourdHui(): string {
  return new Date().toISOString().slice(0, 10);
}
/** Message lisible pour une erreur Supabase (RLS, unicité…). */
function lisible(error: { code?: string; message?: string }, defaut: string): string {
  if (error.code === "42501") return "Tu n'as pas les droits pour faire ça sur ce projet.";
  if (error.code === "23505") return "Ce nom de projet (ou son adresse) existe déjà.";
  if (error.code === "23514") return "Une valeur ne respecte pas les règles (longueur, format).";
  return defaut;
}

async function utilisateur() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ---------------------------------------------------------------------------
// Projet
// ---------------------------------------------------------------------------
export async function creerProjetAction(formData: FormData): Promise<void> {
  const { supabase, user } = await utilisateur();
  if (!user) redirect("/login?return=/projets");
  const nom = texte(formData.get("nom"), 80);
  const slug = slugifier(texte(formData.get("slug"), 60) || nom);
  if (!nom || !slug) redirect("/projets/nouveau?erreur=nom");
  const { error } = await supabase.schema("shared").from("projets").insert({
    nom,
    slug,
    resume: texte(formData.get("resume"), 500) || null,
    stack: texte(formData.get("stack"), 200) || null,
    cree_par: user.id,
  });
  if (error) redirect(`/projets/nouveau?erreur=${error.code === "23505" ? "doublon" : "droits"}`);
  revalidatePath("/projets");
  redirect(`/projets/${slug}`);
}

export async function modifierProjetAction(projetId: string, slug: string, champs: {
  nom: string; resume: string; statut: string; url_prod: string; depot: string; stack: string;
  cdc: string; public: boolean; resume_public: string;
}): Promise<Resultat> {
  const { supabase } = await utilisateur();
  if (!STATUTS_PROJET.includes(champs.statut)) return { success: false, error: "Statut inconnu." };
  const url = texte(champs.url_prod, 300);
  if (url && !url.startsWith("https://")) return { success: false, error: "L'adresse du site doit commencer par https://" };
  const nom = texte(champs.nom, 80);
  if (!nom) return { success: false, error: "Le nom est obligatoire." };
  const { error } = await supabase.schema("shared").from("projets").update({
    nom,
    resume: texte(champs.resume, 500) || null,
    statut: champs.statut,
    url_prod: url || null,
    depot: texte(champs.depot, 200) || null,
    stack: texte(champs.stack, 200) || null,
    cdc: texte(champs.cdc, 50000) || null,
    public: Boolean(champs.public),
    resume_public: texte(champs.resume_public, 500) || null,
  }).eq("id", projetId);
  if (error) return { success: false, error: lisible(error, "Enregistrement impossible.") };
  revalidatePath("/projets");
  revalidatePath(`/projets/${slug}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Roadmap
// ---------------------------------------------------------------------------
export async function ajouterEtapeAction(projetId: string, slug: string, saisie: {
  lot: string; titre: string; description: string; poids: string; echeance: string;
}): Promise<Resultat> {
  const { supabase, user } = await utilisateur();
  const titre = texte(saisie.titre, 200);
  if (!titre) return { success: false, error: "Le titre de l'étape est obligatoire." };
  const poids = Math.min(5, Math.max(1, Number.parseInt(saisie.poids, 10) || 1));
  const echeance = texte(saisie.echeance, 10);
  if (echeance && !dateValide(echeance)) return { success: false, error: "Échéance invalide." };
  // Nouvelle étape en fin de liste.
  const { data: derniere } = await supabase.schema("shared").from("projet_etapes")
    .select("ordre").eq("projet_id", projetId).order("ordre", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.schema("shared").from("projet_etapes").insert({
    projet_id: projetId,
    lot: texte(saisie.lot, 80) || null,
    titre,
    description: texte(saisie.description, 2000) || null,
    poids,
    echeance: echeance || null,
    ordre: ((derniere?.ordre as number | undefined) ?? 0) + 10,
    cree_par: user?.id ?? null,
  });
  if (error) return { success: false, error: lisible(error, "Ajout impossible.") };
  revalidatePath(`/projets/${slug}`);
  revalidatePath("/projets");
  return { success: true };
}

export async function changerStatutEtapeAction(etapeId: string, slug: string, statut: string): Promise<Resultat> {
  const { supabase } = await utilisateur();
  if (!STATUTS_ETAPE.includes(statut as StatutEtape)) return { success: false, error: "Statut inconnu." };
  // La base exige : fait ⇔ date de réalisation renseignée.
  const { error } = await supabase.schema("shared").from("projet_etapes")
    .update({ statut, fait_le: statut === "fait" ? aujourdHui() : null })
    .eq("id", etapeId);
  if (error) return { success: false, error: lisible(error, "Mise à jour impossible.") };
  revalidatePath(`/projets/${slug}`);
  revalidatePath("/projets");
  return { success: true };
}

export async function supprimerEtapeAction(etapeId: string, slug: string): Promise<Resultat> {
  const { supabase } = await utilisateur();
  const { error } = await supabase.schema("shared").from("projet_etapes").delete().eq("id", etapeId);
  if (error) return { success: false, error: lisible(error, "Suppression impossible.") };
  revalidatePath(`/projets/${slug}`);
  revalidatePath("/projets");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------
export async function ajouterJournalAction(projetId: string, slug: string, saisie: {
  date: string; type: string; titre: string; contenu: string;
}): Promise<Resultat> {
  const { supabase, user } = await utilisateur();
  if (!user) return { success: false, error: "Connecte-toi d'abord." };
  const titre = texte(saisie.titre, 200);
  if (!titre) return { success: false, error: "Le titre est obligatoire." };
  if (!TYPES_JOURNAL.includes(saisie.type)) return { success: false, error: "Type inconnu." };
  const date = texte(saisie.date, 10) || aujourdHui();
  if (!dateValide(date)) return { success: false, error: "Date invalide." };
  const { error } = await supabase.schema("shared").from("projet_journal").insert({
    projet_id: projetId,
    date_entree: date,
    type: saisie.type,
    titre,
    contenu: texte(saisie.contenu, 5000) || null,
    auteur: user.id,
  });
  if (error) return { success: false, error: lisible(error, "Ajout impossible.") };
  revalidatePath(`/projets/${slug}`);
  revalidatePath("/projets");
  return { success: true };
}

export async function supprimerJournalAction(id: string, slug: string): Promise<Resultat> {
  const { supabase } = await utilisateur();
  const { error } = await supabase.schema("shared").from("projet_journal").delete().eq("id", id);
  if (error) return { success: false, error: lisible(error, "Suppression impossible.") };
  revalidatePath(`/projets/${slug}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Membres
// ---------------------------------------------------------------------------
export async function ajouterMembreAction(projetId: string, slug: string, email: string, role: string): Promise<Resultat> {
  const { supabase } = await utilisateur();
  const { data, error } = await supabase.schema("shared").rpc("ajouter_membre_projet", {
    p_projet: projetId,
    p_email: texte(email, 200),
    p_role: role,
  });
  if (error) return { success: false, error: "Ajout impossible." };
  const messages: Record<string, string> = {
    interdit: "Seul le propriétaire du projet peut ajouter des membres.",
    role_invalide: "Rôle inconnu.",
    compte_inconnu: "Aucun compte Velito avec cet email : la personne doit d'abord créer son compte sur le hub.",
  };
  if (data !== "ok") return { success: false, error: messages[String(data)] ?? "Ajout impossible." };
  revalidatePath(`/projets/${slug}`);
  return { success: true };
}

export async function retirerMembreAction(projetId: string, slug: string, userId: string): Promise<Resultat> {
  const { supabase } = await utilisateur();
  const { error } = await supabase.schema("shared").from("projet_membres")
    .delete().eq("projet_id", projetId).eq("user_id", userId);
  if (error) return { success: false, error: lisible(error, "Retrait impossible.") };
  revalidatePath(`/projets/${slug}`);
  return { success: true };
}
