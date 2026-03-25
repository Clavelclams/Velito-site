/**
 * Prisma Client — Singleton pour Next.js
 *
 * 👉 POURQUOI un singleton ?
 * En dev, Next.js recharge le serveur à chaque modif (hot reload).
 * Sans singleton, chaque reload créerait une NOUVELLE connexion à la BDD.
 * Au bout de 10 reloads → 10 connexions ouvertes → MySQL dit "trop de connexions".
 *
 * 👉 COMMENT ça marche ?
 * On stocke l'instance Prisma dans `globalThis` (un objet JS global qui survit au hot reload).
 * En production, pas de problème : le serveur ne recharge pas, donc une seule instance.
 */

import { PrismaClient } from "@prisma/client";

// 👉 On étend le type global pour que TypeScript accepte notre variable
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 👉 Soit on réutilise l'instance existante, soit on en crée une nouvelle
const prisma = globalForPrisma.prisma ?? new PrismaClient();

// 👉 En dev uniquement, on sauvegarde dans le global pour le prochain hot reload
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
