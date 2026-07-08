/**
 * Écran d'édition d'une transaction — Server Component.
 *
 * Charge la transaction (getTransaction → notFound si absente/pas à moi), les
 * catégories actives, et les justificatifs, puis affiche le formulaire (mode
 * édition) + la gestion des pièces jointes.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTransaction } from "@/lib/repositories/transactions";
import { listerCategories } from "@/lib/repositories/categories";
import { listerParTransaction } from "@/lib/repositories/justificatifs";
import { createClient } from "@/lib/supabase/server";
import { FormulaireTransaction } from "@/components/FormulaireTransaction";
import { GestionJustificatifs } from "@/components/GestionJustificatifs";
import type { Categorie } from "@/types/database";

export default async function EditionTransactionPage({
  params,
}: {
  params: Promise<{ entiteId: string; id: string }>;
}) {
  const { entiteId, id } = await params;
  const supabase = await createClient();

  const [transaction, categoriesActives, justificatifs] = await Promise.all([
    getTransaction(supabase, id),
    listerCategories(supabase, entiteId, true),
    listerParTransaction(supabase, id),
  ]);

  if (!transaction) {
    notFound();
  }

  // Si la transaction pointe vers une catégorie archivée (absente des actives),
  // on la récupère et on l'ajoute pour qu'elle reste sélectionnable.
  let categories: Categorie[] = categoriesActives;
  if (
    transaction.categorie_id &&
    !categoriesActives.some((c) => c.id === transaction.categorie_id)
  ) {
    const toutes = await listerCategories(supabase, entiteId, false);
    const manquante = toutes.find((c) => c.id === transaction.categorie_id);
    if (manquante) categories = [...categoriesActives, manquante];
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Modifier la transaction</h2>
        <Link
          href={`/${entiteId}/transactions`}
          className="text-sm text-compta-text-muted transition-colors hover:text-compta-accent"
        >
          ← Retour à la liste
        </Link>
      </div>

      <FormulaireTransaction
        entiteId={entiteId}
        categories={categories}
        transaction={transaction}
      />

      <GestionJustificatifs
        entiteId={entiteId}
        transactionId={transaction.id}
        justificatifs={justificatifs}
      />
    </section>
  );
}
