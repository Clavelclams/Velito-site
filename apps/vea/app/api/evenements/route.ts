/**
 * API Route — Récupérer les événements
 * GET /api/evenements
 *
 * 👉 Par défaut : renvoie les événements actifs + futurs uniquement
 *    (utilisé par le formulaire d'inscription pour peupler le <select>)
 *
 * 👉 Avec ?all=true : renvoie TOUS les événements (passés + futurs, actifs ou non)
 *    (utilisé par la page Agenda qui affiche l'historique complet)
 *
 * 👉 Triés par date décroissante (les plus récents en premier)
 *
 * Pourquoi ce paramètre ?
 * - Le formulaire d'inscription n'a besoin que des événements à venir et actifs
 * - L'agenda a besoin de TOUT pour afficher l'historique VEA depuis 2022
 * - Un seul endpoint, 2 comportements. Clean.
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// 👉 Singleton Prisma — évite de créer un nouveau client à chaque hot reload en dev
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET(req: NextRequest) {
  try {
    // 👉 On lit le paramètre ?all=true depuis l'URL
    const all = req.nextUrl.searchParams.get("all");

    const evenements = await prisma.evenement.findMany({
      // 👉 Si all=true → pas de filtre (objet vide {})
      // 👉 Sinon → seulement les actifs
      where: all === "true" ? {} : { actif: true },
      // 👉 Tri par date décroissante (plus récent en premier)
      orderBy: { date: "desc" },
    });

    return NextResponse.json(evenements);
  } catch (error) {
    console.error("[API] /api/evenements — Erreur :", error);
    return NextResponse.json(
      { error: "Impossible de récupérer les événements. Vérifie que MySQL est lancé." },
      { status: 500 }
    );
  }
}
