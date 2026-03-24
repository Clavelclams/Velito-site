/**
 * API Route — Vérifier si un participant existe déjà
 * POST /api/participants/check
 *
 * 👉 Reçoit { prenom, telephone } en JSON
 * 👉 Cherche dans la table Participant si ce téléphone existe
 * 👉 Sur MySQL, `contains` est déjà case-insensitive par défaut
 *    (contrairement à PostgreSQL qui a besoin de `mode: 'insensitive'`)
 * 👉 Renvoie { exists: true/false, participant: {...} | null }
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function POST(req: NextRequest) {
  try {
    const { prenom, telephone } = await req.json();

    // 👉 Validation : on vérifie que les champs obligatoires sont là
    if (!prenom || !telephone) {
      return NextResponse.json(
        { error: "Prénom et téléphone requis" },
        { status: 400 }
      );
    }

    // 👉 On cherche un participant avec ce téléphone ET ce prénom
    // `contains` cherche si le champ contient la chaîne (LIKE %prenom%)
    // Sur MySQL, c'est déjà case-insensitive grâce à la collation par défaut
    const participant = await prisma.participant.findFirst({
      where: {
        telephone: telephone.trim(),
        prenom: {
          contains: prenom.trim(),
        },
      },
    });

    return NextResponse.json({
      exists: !!participant,
      participant: participant || null,
    });
  } catch (error) {
    console.error("Erreur /api/participants/check :", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
