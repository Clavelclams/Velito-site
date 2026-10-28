/**
 * Server Actions — /admin/evenements
 *
 * createEventAction : cree un evenement avec un token unique (pour QR scan).
 * Verifie permission hasPermission('vea', 'editor').
 *
 * Le token est genere automatiquement par PG (DEFAULT gen_random_uuid()).
 * Apres creation, l'admin voit le QR code a imprimer/afficher.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";
import { datesHebdomadaires } from "@/lib/calendrier-scolaire";

export interface CreateEventResult {
  success: boolean;
  error?: string;
  eventId?: string;
  token?: string;
  /** [28/10/2026] Récurrence : nombre de séances créées et dates sautées. */
  seances?: number;
  sautees?: { date: string; raison: string }[];
}

export interface CreateEventInput {
  nom: string;
  event_slug: string; // utilise pour relier presences (cle existante)
  date: string; // format YYYY-MM-DD
  heure?: string; // format HH:MM (optionnel) — colonne `heure` text
  lieu: string;
  description?: string;
  type: "tournoi" | "animation" | "programme" | "reunion" | "autre";
  capacite?: number;
  /** [28/10/2026] Si renseigné : une séance par semaine jusqu'à cette date
   *  (incluse), vacances zone B et jours fériés sautés. */
  repeter_jusqu_au?: string;
}

export async function createEventAction(
  input: CreateEventInput
): Promise<CreateEventResult> {
  // 1. Permission editor+ vea
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) {
    return { success: false, error: "Acces refuse : reserve aux dirigeants VEA." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecte." };

  // 2. Validation
  const nom = (input.nom ?? "").trim();
  if (!nom || nom.length < 3) {
    return { success: false, error: "Nom event requis (min 3 caracteres)." };
  }
  const event_slug = (input.event_slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (!event_slug || event_slug.length < 3) {
    return { success: false, error: "Slug event requis (lettres, chiffres, tirets)." };
  }
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { success: false, error: "Date invalide (format YYYY-MM-DD)." };
  }
  const lieu = (input.lieu ?? "").trim();
  if (!lieu) return { success: false, error: "Lieu requis." };

  // [28/10/2026] 3bis. Récurrence hebdomadaire : une ligne par séance (une
  // présence = une personne sur UN événement, donc une séance = un événement).
  // Slug et nom suffixés par la date ; colonne `serie` = le slug de base, pour
  // regrouper les séances sur l'agenda. Le trigger de notification n'avertit
  // que pour la première séance d'une série (sql/vea-evenements-serie-v1.sql).
  if (input.repeter_jusqu_au) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.repeter_jusqu_au) || input.repeter_jusqu_au < input.date) {
      return { success: false, error: "Date de fin de la récurrence invalide." };
    }
    const r = datesHebdomadaires(input.date, input.repeter_jusqu_au);
    if (r.dates.length === 0) return { success: false, error: "Aucune séance : toutes les dates tombent en vacances ou jours fériés." };
    if (r.dates.length > 40) return { success: false, error: "Plus de 40 séances : réduis la période." };
    const jjmmaaaa = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
    const today = new Date().toISOString().slice(0, 10);
    const lignes = r.dates.map((d) => ({
      nom: `${nom} ${jjmmaaaa(d)}`.slice(0, 200),
      event_slug: `${event_slug}-${d.slice(8, 10)}-${d.slice(5, 7)}-${d.slice(0, 4)}`,
      serie: event_slug,
      date: d,
      heure: input.heure?.trim() || null,
      lieu,
      description: input.description?.trim() || null,
      type: input.type,
      capacite: input.capacite ?? null,
      statut: d < today ? "termine" : "a_venir",
      scan_actif: d >= today,
      created_by: user.id,
    }));
    const { data: crees, error: errSerie } = await supabase
      .schema("vea")
      .from("evenements")
      .insert(lignes)
      .select("id, token, date")
      .order("date");
    if (errSerie || !crees?.length) {
      return {
        success: false,
        error: errSerie?.code === "23505"
          ? "Une séance avec ce nom existe déjà : change le slug."
          : errSerie?.message ?? "Erreur création des séances.",
      };
    }
    revalidatePath("/admin/evenements");
    revalidatePath("/agenda");
    const premiere = crees[0]!;
    return { success: true, eventId: premiere.id, token: premiere.token, seances: crees.length, sautees: r.sautees };
  }

  // 3. INSERT (le token est genere auto par DEFAULT)
  const { data: created, error: insertErr } = await supabase
    .schema("vea")
    .from("evenements")
    .insert({
      nom,
      event_slug,
      date: input.date,
      heure: input.heure?.trim() || null,
      lieu,
      description: input.description?.trim() || null,
      type: input.type,
      capacite: input.capacite ?? null,
      created_by: user.id,
    })
    .select("id, token")
    .maybeSingle();

  if (insertErr || !created) {
    return { success: false, error: insertErr?.message ?? "Erreur creation event." };
  }

  revalidatePath("/admin/evenements");
  revalidatePath("/agenda");

  return {
    success: true,
    eventId: created.id,
    token: created.token,
  };
}
