/**
 * Écran « Transactions sans justificatif » — Server Component (Bloc 2.4).
 *
 * Utile pour l'audit associatif et le contrôle fiscal : repérer les dépenses
 * dont la pièce manque. On charge les transactions, l'ensemble de celles qui
 * ont au moins un justificatif, et le service pur fait la différence.
 */
import Link from "next/link";
import { listerTransactions } from "@/lib/repositories/transactions";
import { listerCategories } from "@/lib/repositories/categories";
import { transactionIdsAvecJustificatif } from "@/lib/repositories/justificatifs";
import { transactionsSansJustificatif } from "@/lib/services/justificatifs";
import { createClient } from "@/lib/supabase/server";
import { TableauTransactions } from "@/components/TableauTransactions";

export default async function SansJustificatifPage({
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

  const avecPiece = await transactionIdsAvecJustificatif(
    supabase,
    transactions.map((t) => t.id),
  );
  const manquantes = transactionsSansJustificatif(transactions, avecPiece);

  const nomsCategories: Record<string, string> = {};
  for (const c of categories) nomsCategories[c.id] = c.nom;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Transactions sans justificatif</h2>
          <p className="mt-1 text-sm text-compta-text-muted">
            {manquantes.length} transaction{manquantes.length > 1 ? "s" : ""} sans
            pièce jointe. Ouvre-en une pour ajouter le ticket ou la facture.
          </p>
        </div>
        <Link
          href={`/${entiteId}/transactions`}
          className="text-sm text-compta-text-muted transition-colors hover:text-compta-accent"
        >
          ← Toutes les transactions
        </Link>
      </div>

      {manquantes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-compta-border bg-compta-surface p-6 text-sm text-compta-recette">
          Toutes les transactions ont au moins un justificatif. 👌
        </div>
      ) : (
        <TableauTransactions
          entiteId={entiteId}
          transactions={manquantes}
          nomsCategories={nomsCategories}
        />
      )}
    </section>
  );
}
