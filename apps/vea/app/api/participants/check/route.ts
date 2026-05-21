/**
 * API Route — DÉPRÉCIÉE (legacy Prisma/MySQL, abandonné au profit de Supabase).
 *
 * On renvoie une réponse neutre { exists:false } pour ne casser aucun appel
 * client résiduel. Plus aucune instanciation Prisma (sinon crash build Vercel :
 * client non généré, pas de schema.prisma).
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({ exists: false, participant: null });
}
