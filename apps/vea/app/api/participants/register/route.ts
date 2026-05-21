/**
 * API Route — DÉPRÉCIÉE (inscription legacy Prisma/MySQL).
 *
 * L'inscription des participants se fait désormais via le scan QR + Supabase.
 * Endpoint conservé en stub (410) pour ne pas casser d'anciens liens. Aucune
 * instanciation Prisma (sinon crash build Vercel : client non généré).
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Inscription migrée vers le scan QR (Supabase). Endpoint déprécié." },
    { status: 410 }
  );
}
