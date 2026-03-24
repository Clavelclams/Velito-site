/**
 * API Route — Inscrire un participant
 * POST /api/participants/register
 *
 * 👉 Flux :
 *    1. On reçoit les infos du participant + éventuellement un evenementId
 *    2. Si le téléphone existe déjà → on récupère le participant existant
 *    3. Sinon → on crée un nouveau participant
 *    4. Si un evenementId est fourni → on crée la Participation (liaison)
 *    5. Si déjà inscrit à cet événement → erreur 409 (Conflict)
 *
 * 👉 Le @@unique([participantId, evenementId]) dans le schema Prisma
 *    empêche les doublons au niveau BDD aussi (double sécurité).
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      prenom,
      nom,
      sexe,
      dateNaissance,
      telephone,
      jeuPrefere,
      quartier,
      accepteContact,
      evenementId,
    } = body;

    // 👉 Validation des champs obligatoires
    if (!prenom || !nom || !sexe || !dateNaissance || !telephone) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants (prénom, nom, sexe, date de naissance, téléphone)" },
        { status: 400 }
      );
    }

    // 👉 On cherche d'abord si ce numéro de téléphone est déjà en base
    // findUnique car `telephone` a un @unique dans le schema
    let participant = await prisma.participant.findUnique({
      where: { telephone: telephone.trim() },
    });

    if (!participant) {
      // 👉 Nouveau participant → on le crée
      participant = await prisma.participant.create({
        data: {
          prenom: prenom.trim(),
          nom: nom.trim(),
          sexe,
          dateNaissance: new Date(dateNaissance),
          telephone: telephone.trim(),
          jeuPrefere: jeuPrefere || null,
          quartier: quartier || null,
          accepteContact: accepteContact || false,
        },
      });
    }

    // 👉 Si un événement est spécifié, on inscrit le participant
    if (evenementId) {
      // Vérifie que l'événement existe et est actif
      const evenement = await prisma.evenement.findUnique({
        where: { id: evenementId },
      });

      if (!evenement || !evenement.actif) {
        return NextResponse.json(
          { error: "Événement introuvable ou inactif" },
          { status: 404 }
        );
      }

      // Vérifie si déjà inscrit à cet événement
      const dejaInscrit = await prisma.participation.findUnique({
        where: {
          participantId_evenementId: {
            participantId: participant.id,
            evenementId,
          },
        },
      });

      if (dejaInscrit) {
        return NextResponse.json(
          { error: "Déjà inscrit à cet événement" },
          { status: 409 }
        );
      }

      // 👉 Crée la participation (liaison participant ↔ événement)
      await prisma.participation.create({
        data: {
          participantId: participant.id,
          evenementId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      participant,
    });
  } catch (error) {
    console.error("Erreur /api/participants/register :", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
