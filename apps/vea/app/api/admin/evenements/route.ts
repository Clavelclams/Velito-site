/**
 * API Route — Créer un événement
 * POST /api/admin/evenements
 *
 * 👉 Reçoit un objet { titre, description?, date, lieu, type, actif? }
 * 👉 Crée un nouvel événement dans la BDD
 * 👉 Retourne l'événement créé en JSON
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// 👉 Singleton Prisma
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { titre, description, date, lieu, type, actif } = body;

    const evenement = await prisma.evenement.create({
      data: {
        titre,
        description: description || null,
        date: new Date(date),
        lieu,
        type,
        actif: actif ?? true,
      },
    });

    return NextResponse.json(evenement);
  } catch (error) {
    console.error("[API] POST /api/admin/evenements — Erreur :", error);
    return NextResponse.json(
      { error: "Impossible de créer l'événement." },
      { status: 500 }
    );
  }
}
