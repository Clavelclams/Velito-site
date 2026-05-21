/**
 * API Route — DÉPRÉCIÉE (ancien auth JWT/Prisma/bcrypt).
 *
 * La création de compte se fait désormais via Supabase Auth. Endpoint conservé
 * en stub (410). Aucune instanciation Prisma (sinon crash build Vercel).
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Création de compte migrée vers Supabase Auth. Endpoint déprécié." },
    { status: 410 }
  );
}
