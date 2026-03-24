import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

/**
 * GET /api/admin/participants
 *
 * Récupère tous les participants inscrits, triés par date d'inscription (plus récent en premier).
 * Le try/catch évite un 500 sans body JSON si Prisma plante (BDD pas lancée, table manquante, etc.)
 */

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET() {
  try {
    const participants = await prisma.participant.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(participants);
  } catch (error) {
    console.error("[API] /api/admin/participants — Erreur Prisma :", error);
    return NextResponse.json(
      { error: "Impossible de récupérer les participants. Vérifie que MySQL est lancé et que la table existe." },
      { status: 500 }
    );
  }
}
