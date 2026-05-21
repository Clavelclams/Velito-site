/**
 * API Route — DÉPRÉCIÉE (ancien auth JWT/Prisma/bcrypt).
 *
 * La connexion se fait désormais via Supabase Auth. Endpoint conservé en stub
 * (410). Aucune instanciation Prisma (sinon crash build Vercel : client non
 * généré, pas de schema.prisma).
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Connexion migrée vers Supabase Auth. Endpoint déprécié." },
    { status: 410 }
  );
}
