/**
 * GET /api/admin/participants
 *
 * Source : Supabase vea.participants (avant : Prisma/MySQL — abandonné).
 * Renvoie tous les participants triés par date de création (récent d'abord).
 * Réservé aux éditeurs+ VEA.
 *
 * Mapping vers la forme attendue par le dashboard :
 *   telephone <- phone, jeuPrefere <- jeu_prefere, createdAt <- created_at.
 *   quartier : non stocké en base -> null.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const canEdit = await hasPermission("vea", "editor");
    if (!canEdit) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .schema("vea")
      .from("participants")
      .select("id, prenom, nom, phone, jeu_prefere, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    type Row = {
      id: string;
      prenom: string | null;
      nom: string | null;
      phone: string | null;
      jeu_prefere: string | null;
      created_at: string;
    };

    const participants = ((data ?? []) as Row[]).map((p) => ({
      id: p.id,
      prenom: p.prenom ?? "",
      nom: p.nom ?? "",
      telephone: p.phone ?? "",
      jeuPrefere: p.jeu_prefere ?? null,
      quartier: null,
      createdAt: p.created_at,
    }));

    return NextResponse.json(participants);
  } catch (error) {
    console.error("[API] /api/admin/participants —", error);
    return NextResponse.json(
      { error: "Impossible de récupérer les participants." },
      { status: 500 },
    );
  }
}
