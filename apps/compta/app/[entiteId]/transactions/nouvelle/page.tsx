/**
 * Écran « Nouvelle transaction » — Server Component.
 * Charge les catégories ACTIVES de l'entité (pour le sélecteur) et délègue
 * la saisie au formulaire client. L'entité est déjà validée par le layout.
 */
import Link from "next/link";
import { listerCategories } from "@/lib/repositories/categories";
import { createClient } from "@/lib/supabase/server";
import { FormulaireTransaction } from "@/components/FormulaireTransaction";

export default async function NouvelleTransactionPage({
  params,
}: {
  params: Promise<{ entiteId: string }>;
}) {
  const { entiteId } = await params;
  const supabase = await createClient();

  // true = seulement les catégories actives (écran de saisie, pas de gestion).
  const categories = await listerCategories(supabase, entiteId, true);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Nouvelle transaction</h2>
        <Link
          href={`/${entiteId}/transactions`}
          className="text-sm text-compta-text-muted transition-colors hover:text-compta-accent"
        >
          ← Retour à la liste
        </Link>
      </div>

      <FormulaireTransaction entiteId={entiteId} categories={categories} />
    </section>
  );
}
