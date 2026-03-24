/**
 * API Route — Modifier un événement
 * PATCH /api/admin/evenements/[id]
 *
 * 👉 Met à jour les champs fournis dans le body JSON
 * 👉 Le spread conditionnel (...body.titre && { titre: body.titre }) permet
 *    d'envoyer seulement les champs qu'on veut modifier — les autres restent inchangés.
 *
 * Exemples d'utilisation :
 * - Archiver un événement : PATCH avec { actif: false }
 * - Restaurer un événement : PATCH avec { actif: true }
 * - Modifier le titre : PATCH avec { titre: "Nouveau titre" }
 * - Modifier plusieurs champs à la fois : PATCH avec { titre: "...", lieu: "..." }
 *
 * ⚠️ Pas de vérification d'auth pour l'instant (V1).
 *    En V2, on ajoutera un middleware qui check le cookie admin_auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// 👉 Singleton Prisma pour éviter les connexions multiples en dev
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // 👉 prisma.evenement.update() fait un UPDATE WHERE id = ... en SQL
    // On ne met à jour QUE les champs présents dans le body
    const evenement = await prisma.evenement.update({
      where: { id },
      data: {
        ...(body.titre && { titre: body.titre }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.date && { date: new Date(body.date) }),
        ...(body.lieu && { lieu: body.lieu }),
        ...(body.type && { type: body.type }),
        ...(body.actif !== undefined && { actif: body.actif }),
      },
    });

    return NextResponse.json(evenement);
  } catch (error) {
    console.error("[API] PATCH /api/admin/evenements/[id] — Erreur :", error);
    return NextResponse.json(
      { error: "Impossible de modifier l'événement." },
      { status: 500 }
    );
  }
}
