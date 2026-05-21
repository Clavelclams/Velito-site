/**
 * PATCH /api/admin/evenements/[id]
 *
 * Source : Supabase vea.evenements (avant : Prisma/MySQL — abandonné).
 * Met à jour les champs fournis. Réservé aux éditeurs+ VEA.
 *
 * Mapping : titre <-> nom. Le champ "actif" du dashboard est dérivé du statut :
 *   - actif=false  -> statut = 'annule'   (archiver)
 *   - actif=true   -> statut = 'termine' si date passée, sinon 'a_venir'
 *   (valeurs autorisées en base : a_venir, en_cours, termine, annule)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";

export const dynamic = "force-dynamic";

const TYPES = ["tournoi", "animation", "programme", "reunion", "autre"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const canEdit = await hasPermission("vea", "editor");
    if (!canEdit) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const supabase = await createClient();
    const body = await req.json();

    const patch: Record<string, unknown> = {};
    if (typeof body.titre === "string" && body.titre.trim()) patch.nom = body.titre.trim();
    if (body.description !== undefined) patch.description = body.description || null;
    if (body.date) patch.date = body.date;
    if (typeof body.lieu === "string" && body.lieu.trim()) patch.lieu = body.lieu.trim();
    if (body.type) {
      const t = String(body.type).toLowerCase();
      if (TYPES.includes(t)) patch.type = t;
    }

    if (body.actif !== undefined) {
      if (body.actif === false) {
        patch.statut = "annule";
      } else {
        const { data: cur } = await supabase
          .schema("vea")
          .from("evenements")
          .select("date")
          .eq("id", id)
          .maybeSingle();
        const todayStr = new Date().toISOString().slice(0, 10);
        patch.statut = cur?.date && cur.date < todayStr ? "termine" : "a_venir";
      }
    }

    const { data, error } = await supabase
      .schema("vea")
      .from("evenements")
      .update(patch)
      .eq("id", id)
      .select("id, nom, event_slug, date, lieu, type, description, statut")
      .single();

    if (error) throw error;

    return NextResponse.json({
      id: data.id,
      titre: data.nom,
      nom: data.nom,
      event_slug: data.event_slug,
      description: data.description,
      date: data.date,
      lieu: data.lieu,
      type: data.type,
      statut: data.statut,
      actif: data.statut !== "annule",
    });
  } catch (error) {
    console.error("[API] PATCH /api/admin/evenements/[id] —", error);
    return NextResponse.json(
      { error: "Impossible de modifier l'événement." },
      { status: 500 },
    );
  }
}
