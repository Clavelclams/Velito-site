/**
 * Prisma — DÉPRÉCIÉ.
 *
 * VEA tournait avant sur MySQL/Prisma ; tout est désormais sur Supabase.
 * Il n'existe plus de schema.prisma ni de base MySQL, donc on NE DOIT PAS
 * instancier `new PrismaClient()` (ça plante le build Vercel : "Prisma Client
 * non généré").
 *
 * Ce stub est conservé uniquement pour ne pas casser d'éventuels imports
 * résiduels : toute tentative d'utiliser `prisma.xxx` lève une erreur explicite
 * au runtime (et jamais au chargement du module).
 */
const prisma = new Proxy(
  {},
  {
    get() {
      throw new Error(
        "Prisma est déprécié sur VEA (migré vers Supabase). Cet appel ne devrait plus exister."
      );
    },
  }
) as unknown as Record<string, never>;

export default prisma;
