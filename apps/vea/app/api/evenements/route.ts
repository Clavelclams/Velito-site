/**
 * API Route — Récupérer les événements
 * GET /api/evenements
 *
 * Source : Supabase vea.evenements (table unique depuis le 19/05/2026).
 * (Avant : Prisma/MySQL — abandonné, cette route renvoyait 500 car plus de DB.)
 *
 * - Par défaut : événements actifs ET à venir (date >= aujourd'hui)
 *   -> utilisé par le formulaire d'inscription pour peupler le <select>.
 * - Avec ?all=true : TOUS les événements (passés + futurs)
 *   -> utilisé par le dashboard admin et l'agenda.
 *
 * Lecture publique (RLS SELECT public sur vea.evenements). Triés date desc.
 *
 * Mapping : la table a `nom` ; on renvoie `titre` ET `nom` pour rester
 * compatible avec tous les consommateurs. `actif` est dérivé du `statut`
 * (un event « archive » ou « annule » est considéré inactif).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const all = req.nextUrl.searchParams.get("all") === "true";
    const supabase = await createClient();

    let query = supabase
      .schema("vea")
      .from("evenements")
      .select("id, nom, event_slug, date, lieu, type, description, statut, capacite")
      .order("date", { ascending: false });

    if (!all) {
      const today = new Date().toISOString().slice(0, 10);
      query = query.gte("date", today);
    }

    const { data, error } = await query;
    if (error) throw error;

    type Row = {
      id: string;
      nom: string;
      event_slug: string;
      date: string;
      lieu: string;
      type: string | null;
      description: string | null;
      statut: string | null;
      capacite: number | null;
    };

    const evenements = ((data ?? []) as Row[]).map((e) => {
      const actif = e.statut !== "archive" && e.statut !== "annule";
      return {
        id: e.id,
        titre: e.nom,
        nom: e.nom,
        event_slug: e.event_slug,
        description: e.description,
        date: e.date,
        lieu: e.lieu,
        type: e.type,
        statut: e.statut,
        capacite: e.capacite,
        actif,
      };
    });

    // Le form d'inscription (sans ?all) ne veut que les events actifs
    const result = all ? evenements : evenements.filter((e) => e.actif);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] /api/evenements —", error);
    return NextResponse.json(
      { error: "Impossible de récupérer les événements." },
      { status: 500 },
    );
  }
}
