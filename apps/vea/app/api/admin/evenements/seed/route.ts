/**
 * API Route — DÉPRÉCIÉE (seed legacy Prisma/MySQL).
 *
 * Les événements sont désormais gérés via Supabase (/admin/evenements) et la
 * liste d'archive statique. Endpoint conservé en stub (410), toujours gardé
 * derrière une permission éditeur+ par défense en profondeur. Aucune
 * instanciation Prisma (sinon crash build Vercel : client non généré).
 */
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/supabase/permissions";

export const dynamic = "force-dynamic";

export async function POST() {
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  return NextResponse.json(
    { error: "Seed Prisma déprécié. Gère les events via /admin/evenements (Supabase)." },
    { status: 410 }
  );
}
