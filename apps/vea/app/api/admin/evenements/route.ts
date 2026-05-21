/**
 * POST /api/admin/evenements
 *
 * Source : Supabase vea.evenements (avant : Prisma/MySQL — abandonné).
 * Crée un événement. Réservé aux éditeurs+ VEA.
 *
 * NB : la création passe désormais surtout par la page /admin/evenements
 * (Server Action createEventAction, avec QR/token). Cette route reste pour
 * compat. Le token est généré automatiquement par la BDD (DEFAULT).
 *
 * Mapping : titre -> nom. Un event_slug unique est dérivé du titre.
 * actif=false -> statut 'annule', sinon 'a_venir'.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";

export const dynamic = "force-dynamic";

const TYPES = ["tournoi", "animation", "programme", "reunion", "autre"];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function POST(req: NextRequest) {
  try {
    const canEdit = await hasPermission("vea", "editor");
    if (!canEdit) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const body = await req.json();
    const titre = (body.titre ?? "").trim();
    if (titre.length < 3) {
      return NextResponse.json({ error: "Titre requis (min 3 caractères)." }, { status: 400 });
    }
    if (!body.date || !/^\d{4}-\d{2}-\d{2}/.test(body.date)) {
      return NextResponse.json({ error: "Date invalide." }, { status: 400 });
    }
    const lieu = (body.lieu ?? "").trim();
    if (!lieu) return NextResponse.json({ error: "Lieu requis." }, { status: 400 });

    const type = TYPES.includes(String(body.type).toLowerCase())
      ? String(body.type).toLowerCase()
      : "animation";
    const event_slug = `${slugify(titre) || "event"}-${Date.now().toString(36)}`;
    const statut = body.actif === false ? "annule" : "a_venir";

    const { data, error } = await supabase
      .schema("vea")
      .from("evenements")
      .insert({
        nom: titre,
        event_slug,
        date: String(body.date).slice(0, 10),
        lieu,
        type,
        description: body.description?.trim() || null,
        statut,
        created_by: user.id,
      })
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
    console.error("[API] POST /api/admin/evenements —", error);
    return NextResponse.json(
      { error: "Impossible de créer l'événement." },
      { status: 500 },
    );
  }
}
