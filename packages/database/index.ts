/**
 * Client Prisma partagé pour tout le monorepo Velito.
 *
 * 👉 Ce fichier crée UNE SEULE instance de PrismaClient pour toute l'app.
 *    En développement, Next.js recharge les modules à chaque modif (hot reload),
 *    ce qui créerait plein de connexions BDD si on ne stockait pas l'instance
 *    dans `globalThis`. Ce pattern s'appelle le "singleton Prisma".
 *
 * 👉 Toutes les apps (vea, hub, arena...) importent depuis "@repo/database"
 *    au lieu de créer leur propre PrismaClient. Un seul endroit à maintenir.
 *
 * 👉 log: ['query', 'error', 'warn'] affiche les requêtes SQL dans la console
 *    pendant le dev. En production on ne logge que les erreurs.
 */

import { PrismaClient } from "@prisma/client";

// 👉 On étend le type `global` de Node.js pour y stocker notre instance Prisma
// C'est du TypeScript pur — ça ne change rien au runtime
const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

// 👉 Si une instance existe déjà dans global (hot reload), on la réutilise
// Sinon on en crée une nouvelle avec les logs activés
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query", "error", "warn"],
  });

// 👉 En dev uniquement, on stocke l'instance dans global
// pour survivre au hot reload de Next.js
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// 👉 On ré-exporte tout @prisma/client pour que les apps
// puissent importer les types (Role, TypeEvenement, etc.) directement
export * from "@prisma/client";
