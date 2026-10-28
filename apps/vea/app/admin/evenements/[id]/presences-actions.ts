/**
 * presences-actions.ts — Saisie rapide des présents sur une fiche événement.
 * [28/10/2026] Créé pour le droit "presences" (bénévoles) ET les éditeurs.
 *
 *   - searchParticipantsAction : recherche par prénom, nom ou pseudo.
 *   - addPresenceAction        : ajoute une personne existante (1 présence + ses points).
 *   - createPreinscritAndAddAction : crée un pré-inscrit (prénom obligatoire)
 *                                puis l'ajoute. Refuse si un homonyme existe,
 *                                sauf confirmation explicite.
 *   - removePresenceAction     : retire une présence (les points partent en
 *                                cascade, la trace va dans vea.presences_archive).
 *
 * Règles de la base, constatées le 28/10/2026 :
 *   - UNIQUE (participant_id, event_slug) : UNE présence par personne et par
 *     événement, donc un seul motif (jouer OU aider OU regarder).
 *   - Points = barème existant (lib/gamification.ts) : jouer 10, aider 15/h,
 *     regarder 2. Le trigger trg_logs_xp_apply met à jour le total.
 *   - Qui a ajouté : presences.scanned_by + horodatage. Qui a retiré :
 *     presences_archive.archived_by + archived_at (trigger existant).
 *
 * Sécurité : chaque action revérifie hasPresenceAccess() ; la base revérifie
 * avec vea.can_manage_presences() (RLS, sql/vea-presences-benevole-v1.sql).
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasPresenceAccess } from "@/lib/supabase/permissions";
import { XP_BAREME } from "@/lib/gamification";

export type Motif = "jouer" | "aider" | "regarder";

export interface ResultatRecherche {
  id: string;
  prenom: string;
  nom: string;
  pseudo: string | null;
  annee: number | null;
  quartier: string | null;
  preInscrit: boolean;
  dejaPresent: boolean;
}

interface Result {
  success: boolean;
  error?: string;
  /** Homonymes trouvés à la création : l'UI propose de les choisir à la place. */
  doublons?: ResultatRecherche[];
}

const NOM_PROVISOIRE = "À compléter";

// Même calcul que la RLS logs_xp (vea_logs_xp_presences_insert) et que le scan.
function pointsPour(motif: Motif, heures: number) {
  if (motif === "jouer") return { xp: XP_BAREME.tournoi, action: "tournoi" as const };
  if (motif === "regarder") return { xp: 2, action: "spectateur" as const };
  const h = Math.min(24, Math.max(0.5, Number.isFinite(heures) ? heures : 1));
  return { xp: Math.round(h * XP_BAREME.benevolat_par_heure), action: "benevolat" as const, heures: h };
}

// La recherche passe par le filtre .or() de Supabase : on retire les
// caractères qui ont un sens dans cette syntaxe (virgule, parenthèses, %, *).
function motsDeRecherche(q: string): string[] {
  return q
    .replace(/[,()%*\\]/g, " ")
    .split(/\s+/)
    .map((m) => m.trim())
    .filter((m) => m.length >= 2)
    .slice(0, 4);
}

async function contexte() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté." as const };
  if (!(await hasPresenceAccess())) return { erreur: "Permission refusée." as const };
  return { supabase, user };
}

// ============================================================================
// Recherche
// ============================================================================
export async function searchParticipantsAction(input: {
  q: string;
  eventSlug: string;
}): Promise<{ success: boolean; error?: string; resultats?: ResultatRecherche[] }> {
  const ctx = await contexte();
  if ("erreur" in ctx) return { success: false, error: ctx.erreur };
  const { supabase } = ctx;

  const mots = motsDeRecherche(input.q ?? "");
  if (mots.length === 0) return { success: true, resultats: [] };

  let requete = supabase
    .schema("vea")
    .from("participants")
    .select("id, prenom, nom, pseudo, annee_naissance, date_naissance, quartier, pre_inscrit")
    .order("prenom")
    .limit(12);
  // Chaque mot doit apparaître dans le prénom, le nom OU le pseudo
  // ("ben salah" ou "farah ben" fonctionnent).
  for (const m of mots) {
    requete = requete.or(`prenom.ilike.%${m}%,nom.ilike.%${m}%,pseudo.ilike.%${m}%`);
  }
  const { data, error } = await requete;
  if (error) return { success: false, error: error.message };

  const ids = (data ?? []).map((p) => p.id as string);
  const { data: presents } = ids.length
    ? await supabase
        .schema("vea")
        .from("presences")
        .select("participant_id")
        .eq("event_slug", input.eventSlug)
        .in("participant_id", ids)
    : { data: [] as { participant_id: string }[] };
  const dejaLa = new Set((presents ?? []).map((p) => p.participant_id as string));

  return {
    success: true,
    resultats: (data ?? []).map((p) => ({
      id: p.id as string,
      prenom: p.prenom as string,
      nom: p.nom as string,
      pseudo: (p.pseudo as string | null) ?? null,
      annee:
        (p.annee_naissance as number | null) ??
        (p.date_naissance ? Number(String(p.date_naissance).slice(0, 4)) : null),
      quartier: (p.quartier as string | null) ?? null,
      preInscrit: Boolean(p.pre_inscrit),
      dejaPresent: dejaLa.has(p.id as string),
    })),
  };
}

// ============================================================================
// Ajout d'une personne existante
// ============================================================================
export async function addPresenceAction(input: {
  eventSlug: string;
  participantId: string;
  motif: Motif;
  heures?: number;
}): Promise<Result> {
  const ctx = await contexte();
  if ("erreur" in ctx) return { success: false, error: ctx.erreur };
  const { supabase, user } = ctx;

  if (!["jouer", "aider", "regarder"].includes(input.motif)) {
    return { success: false, error: "Motif invalide." };
  }

  const { data: event } = await supabase
    .schema("vea")
    .from("evenements")
    .select("nom, event_slug")
    .eq("event_slug", input.eventSlug)
    .maybeSingle();
  if (!event) return { success: false, error: "Événement introuvable." };

  const pts = pointsPour(input.motif, input.heures ?? 1);

  const { data: presence, error: errPresence } = await supabase
    .schema("vea")
    .from("presences")
    .insert({
      participant_id: input.participantId,
      event_slug: input.eventSlug,
      motif: input.motif,
      heures_aide: input.motif === "aider" ? pts.heures : 0,
      scanned_by: user.id, // trace : qui a ajouté (l'heure = horodatage, par défaut now())
    })
    .select("id")
    .single();

  if (errPresence) {
    if (errPresence.code === "23505") return { success: false, error: "Déjà présent sur cet événement." };
    return { success: false, error: errPresence.message };
  }

  const { error: errPoints } = await supabase
    .schema("vea")
    .from("logs_xp")
    .insert({
      participant_id: input.participantId,
      action: pts.action,
      xp_gagne: pts.xp,
      description: `${event.nom} (${input.motif}${input.motif === "aider" ? `, ${pts.heures} h` : ""})`,
      cree_par: user.id,
      presence_id: presence.id,
    });

  if (errPoints) {
    // [28/10/2026] Pas de présence sans ses points : on annule l'ajout.
    await supabase.schema("vea").from("presences").delete().eq("id", presence.id);
    return { success: false, error: `Points non enregistrés, ajout annulé : ${errPoints.message}` };
  }

  revalidatePath(`/admin/evenements/${input.eventSlug}`);
  return { success: true };
}

// ============================================================================
// Création d'un pré-inscrit puis ajout
// ============================================================================
export async function createPreinscritAndAddAction(input: {
  eventSlug: string;
  prenom: string;
  nom?: string;
  sexe?: "F" | "M" | "X" | "";
  annee?: number | null;
  quartier?: string;
  motif: Motif;
  heures?: number;
  /** true quand l'utilisateur a vu les homonymes et confirme que c'est quelqu'un d'autre. */
  confirmerNouveau?: boolean;
}): Promise<Result> {
  const ctx = await contexte();
  if ("erreur" in ctx) return { success: false, error: ctx.erreur };
  const { supabase } = ctx;

  const prenom = (input.prenom ?? "").trim().slice(0, 100);
  const nom = (input.nom ?? "").trim().slice(0, 100) || NOM_PROVISOIRE;
  if (prenom.length < 2) return { success: false, error: "Prénom requis (2 lettres minimum)." };
  if (nom.length < 2) return { success: false, error: "Nom trop court (2 lettres minimum) : laisse vide si tu ne le connais pas." };

  const anneeCourante = new Date().getFullYear();
  const annee = input.annee ? Math.trunc(input.annee) : null;
  if (annee !== null && (annee < 1900 || annee > anneeCourante)) {
    return { success: false, error: "Année de naissance invalide." };
  }
  const sexe = input.sexe === "F" || input.sexe === "M" || input.sexe === "X" ? input.sexe : null;
  const quartier = (input.quartier ?? "").trim().slice(0, 80) || null;

  // Garde-fou doublon : même prénom + même nom (hors nom provisoire).
  if (!input.confirmerNouveau && nom !== NOM_PROVISOIRE) {
    const { data: homonymes } = await supabase
      .schema("vea")
      .from("participants")
      .select("id, prenom, nom, pseudo, annee_naissance, date_naissance, quartier, pre_inscrit")
      .ilike("prenom", prenom)
      .ilike("nom", nom)
      .limit(5);
    if (homonymes && homonymes.length > 0) {
      return {
        success: false,
        error: "Une fiche avec ce prénom et ce nom existe déjà. Choisis-la, ou confirme que c'est une autre personne.",
        doublons: homonymes.map((p) => ({
          id: p.id as string,
          prenom: p.prenom as string,
          nom: p.nom as string,
          pseudo: (p.pseudo as string | null) ?? null,
          annee:
            (p.annee_naissance as number | null) ??
            (p.date_naissance ? Number(String(p.date_naissance).slice(0, 4)) : null),
          quartier: (p.quartier as string | null) ?? null,
          preInscrit: Boolean(p.pre_inscrit),
          dejaPresent: false,
        })),
      };
    }
  }

  const { data: cree, error } = await supabase
    .schema("vea")
    .from("participants")
    .insert({
      prenom,
      nom,
      sexe,
      annee_naissance: annee,
      quartier,
      pre_inscrit: true,
      // Mineur si l'âge atteint cette année est < 18 (approximation sans date exacte).
      est_mineur: annee !== null ? anneeCourante - annee < 18 : false,
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };

  return addPresenceAction({
    eventSlug: input.eventSlug,
    participantId: cree.id as string,
    motif: input.motif,
    heures: input.heures,
  });
}

// ============================================================================
// Retrait
// ============================================================================
export async function removePresenceAction(input: {
  eventSlug: string;
  participantId: string;
}): Promise<Result> {
  const ctx = await contexte();
  if ("erreur" in ctx) return { success: false, error: ctx.erreur };
  const { supabase } = ctx;

  // Le trigger trigger_presences_archive copie la ligne dans presences_archive
  // (avec archived_by = la personne connectée) ; logs_xp part en cascade et
  // le total de points est recalculé par le trigger existant.
  const { error } = await supabase
    .schema("vea")
    .from("presences")
    .delete()
    .eq("participant_id", input.participantId)
    .eq("event_slug", input.eventSlug);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/evenements/${input.eventSlug}`);
  return { success: true };
}
