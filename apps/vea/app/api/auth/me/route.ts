/**
 * API Route — DÉPRÉCIÉE (ancien auth JWT/Prisma).
 *
 * L'authentification se fait désormais via Supabase. On renvoie { user: null }
 * (statut 200) pour ne pas casser un éventuel hook useAuth() legacy qui
 * appellerait encore cette route. Aucune instanciation Prisma.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ user: null });
}
