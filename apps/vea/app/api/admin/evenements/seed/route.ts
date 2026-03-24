/**
 * API Route — Seed des événements VEA
 * POST /api/admin/evenements/seed
 *
 * 👉 Insère les événements historiques de VEA dans la BDD
 * 👉 Anti-doublon : vérifie si un événement avec le même titre existe déjà
 * 👉 À appeler UNE FOIS depuis le dashboard admin (bouton "Importer les événements VEA")
 *
 * Pourquoi un seed via API et pas un script ?
 * - Plus pratique : un clic dans le dashboard admin suffit
 * - Pas besoin d'accès terminal sur le serveur
 * - L'anti-doublon permet de re-cliquer sans risque
 *
 * ⚠️ Les dates sont approximatives (jour exact pas toujours connu)
 */

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function POST() {
  try {
    // 👉 Liste complète des événements VEA depuis la création
    // Chaque objet correspond exactement aux champs du model Evenement dans Prisma
    const evenementsVEA = [
      {
        titre: "Premier tournoi VEA — FIFA",
        description:
          "Premiers tournois FIFA, Fortnite et Rocket League organisés par VEA.",
        date: new Date("2022-11-15"),
        lieu: "Amiens",
        type: "TOURNOI" as const,
        actif: true,
      },
      {
        titre: "Fête de la Science — Showcase Esport",
        description:
          "Participation de VEA à la Fête de la Science avec un showcase esport.",
        date: new Date("2023-10-13"),
        lieu: "Amiens",
        type: "ANIMATION" as const,
        actif: true,
      },
      {
        titre: "TIQE 2024 — Secteur Étouvie",
        description:
          "Premier Tournoi Inter Quartier Esport. Salle des Provinces, Étouvie. ~30 jeunes. Jeux : FIFA, Street Fighter, Rocket League. Gagnants : Lenny et Lény.",
        date: new Date("2023-11-02"),
        lieu: "Salle des Provinces, Étouvie, Amiens",
        type: "TOURNOI" as const,
        actif: true,
      },
      {
        titre: "TIQE 2024 — Secteur Sud",
        description: "Phase de secteur du TIQE 2024 côté Amiens Sud.",
        date: new Date("2023-12-26"),
        lieu: "La Table du Marais, Amiens Sud",
        type: "TOURNOI" as const,
        actif: true,
      },
      {
        titre: "Tournoi SF6 — WarpZone",
        description:
          "Street Fighter 6. Événement non officiel Capcom. Entraînement avant le championnat fédéral.",
        date: new Date("2024-02-15"),
        lieu: "WarpZone, Amiens",
        type: "TOURNOI" as const,
        actif: true,
      },
      {
        titre: "TIQE 2024 — Secteur Est",
        description:
          "Phase secteur Est. Jeu : EA FC 24. Gagnant : Hassan. Lots offerts par GameCash.",
        date: new Date("2024-04-26"),
        lieu: "Gymnase Elbeuf, St Just, Amiens",
        type: "TOURNOI" as const,
        actif: true,
      },
      {
        titre: "Championnat Fédéral SF6 — FFJV",
        description:
          "3e place de France en Street Fighter 6. VEA envoie 4 joueurs : Mamba, Chewing Gum, NoyzBoy, Pinh. Interview radio France Bleu Picardie suite au résultat.",
        date: new Date("2024-06-15"),
        lieu: "Vitry Gaming, Paris",
        type: "COMPETITION" as const,
        actif: true,
      },
      {
        titre: "TIQE 2024 — Grande Finale",
        description:
          "Finale du circuit TIQE saison 2024. EA FC 24. 1er : Stephan, 2e : Mathias.",
        date: new Date("2024-06-28"),
        lieu: "Le Corner, Amiens",
        type: "TOURNOI" as const,
        actif: true,
      },
      {
        titre: "Activités été — Parc Saint-Pierre",
        description:
          "Animation gaming gratuite en plein air. ~20 jeunes par jour. Couverture Courrier Picard.",
        date: new Date("2024-07-16"),
        lieu: "Parc Saint-Pierre, Amiens",
        type: "ANIMATION" as const,
        actif: true,
      },
      {
        titre: "League Sparking Arena VEA",
        description:
          "Premier tournoi en ligne de la saison 3 VEA. Jeu : Dragon Ball Sparking Zero (PS5).",
        date: new Date("2024-10-07"),
        lieu: "En ligne",
        type: "TOURNOI" as const,
        actif: true,
      },
      {
        titre: "E-Sport Night QPV",
        description:
          "Soirée gaming dans les quartiers prioritaires. Tournoi FIFA + Dragon Ball FighterZ. Organisé avec B2Gang et IUT Amiens.",
        date: new Date("2024-12-09"),
        lieu: "Salle des Provinces, Amiens",
        type: "ANIMATION" as const,
        actif: true,
      },
      {
        titre: "Sortie Battle Kart",
        description:
          "Récompense IRL pour les gagnants du tournoi Mario Kart VEA. Du virtuel au réel.",
        date: new Date("2023-04-15"),
        lieu: "Battle Kart, Amiens",
        type: "ANIMATION" as const,
        actif: true,
      },
      {
        titre: "Fête de l'Eid — Stand Gaming",
        description:
          "Stand jeux vidéo lors de la fête de fin du Ramadan. Partenaire : Association Jeunesse en Or.",
        date: new Date("2025-04-03"),
        lieu: "Stade Jean-Bouin, Amiens",
        type: "ANIMATION" as const,
        actif: true,
      },
      {
        titre: "VEA x Comité Basket Somme",
        description:
          "Collaboration esport x basket. 28 participants — 50% filles, parité parfaite. Première collaboration sport traditionnel / esport documentée.",
        date: new Date("2025-10-23"),
        lieu: "Amiens",
        type: "ANIMATION" as const,
        actif: true,
      },
      {
        titre: "Intervention La Pléiade",
        description:
          "Animation e-sport. 33 jeunes dont 7 filles. Sensibilisation au numérique. Tags : FFJV, UFOLEP Somme.",
        date: new Date("2025-10-26"),
        lieu: "La Pléiade, Amiens Nord",
        type: "ANIMATION" as const,
        actif: true,
      },
      {
        titre: "INTERCUP 2026 — Quart de finale national",
        description:
          "TOP 8 France. 12 jeunes amiénois dont 4 jeunes filles représentent Amiens. Organisé par OMNE Esport à Courbevoie. Plus grande délégation de l'histoire de VEA.",
        date: new Date("2026-02-22"),
        lieu: "Courbevoie (Île-de-France)",
        type: "COMPETITION" as const,
        actif: true,
      },
    ];

    // 👉 Anti-doublon : on vérifie si un événement avec le même titre existe déjà
    // Si oui, on skip. Si non, on le crée.
    let created = 0;
    for (const ev of evenementsVEA) {
      const exists = await prisma.evenement.findFirst({
        where: { titre: ev.titre },
      });
      if (!exists) {
        await prisma.evenement.create({ data: ev });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      total: evenementsVEA.length,
      message: `${created} événement${created > 1 ? "s" : ""} importé${created > 1 ? "s" : ""}. ${evenementsVEA.length - created} déjà existant${evenementsVEA.length - created > 1 ? "s" : ""}.`,
    });
  } catch (error) {
    console.error("[API] POST /api/admin/evenements/seed — Erreur :", error);
    return NextResponse.json(
      { error: "Impossible d'importer les événements. Vérifie que MySQL est lancé et que le schema est migré." },
      { status: 500 }
    );
  }
}
