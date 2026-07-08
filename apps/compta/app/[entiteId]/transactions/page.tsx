/**
 * Écran Transactions d'une entité — Server Component (lecture).
 *
 * Charge côté serveur :
 *  1. les transactions de l'entité (récentes d'abord) ;
 *  2. TOUTES les catégories (actives + archivées) pour résoudre les noms —
 *     une transaction ancienne peut pointer vers une catégorie archivée.
 * Puis construit une table de correspondance { id → nom } passée au tableau.
 *
 * On charge deux petites listes plutôt qu'une jointure SQL : plus simple à
 * lire, à tester, et suffisant au volume d'un outil mono-utilisateur.
 */
import Link from "next/link";
import { listerTransactions } from "@/lib/repositories/transactions";
import { listerCategories } from "@/lib/repositories/categories";
import { createClient } from "@/lib/supabase/server";
import { TableauTransactions } from "@/components/TableauTransactions";

export default async function TransactionsPage({
  params,
}: {
  params: Promise<{ entiteId: string }>;
}) {
  const { entiteId } = await params;
  const supabase = await createClient();

  const [transactions, categories] = await Promise.all([
    listerTransactions(supabase, entiteId),
    listerCategories(supabase, entiteId, false),
  ]);

  const nomsCategories: Record<string, string> = {};
  for (const c of categories) {
    nomsCategories[c.id] = c.nom;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Transactions</h2>
        <div className="flex items-center gap-3">
          <Link
            href={`/${entiteId}/transactions/sans-justificatif`}
            className="text-sm text-compta-text-muted transition-colors hover:text-compta-accent"
          >
            Pièces manquantes
          </Link>
          <Link
            href={`/${entiteId}/transactions/nouvelle`}
            className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-compta-accent-hover"
          >
            + Nouvelle transaction
          </Link>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-compta-border bg-compta-surface p-6 text-sm text-compta-text-muted">
          Aucune transaction pour l&apos;instant. Clique sur « Nouvelle
          transaction » pour saisir ta première recette ou dépense.
        </div>
      ) : (
        <TableauTransactions
          entiteId={entiteId}
          transactions={transactions}
          nomsCategories={nomsCategories}
        />
      )}
    </section>
  );
}
