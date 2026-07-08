/**
 * Écran Import CSV — Server Component (léger).
 * Toute l'interactivité (parsing, mapping, aperçu) vit dans le composant
 * client FormulaireImport ; cette page ne fait que le cadre + le contexte.
 * L'entité est déjà validée par le layout parent.
 */
import Link from "next/link";
import { FormulaireImport } from "@/components/FormulaireImport";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ entiteId: string }>;
}) {
  const { entiteId } = await params;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Importer un relevé bancaire</h2>
          <p className="mt-1 text-sm text-compta-text-muted">
            Charge un CSV, mappe les colonnes, vérifie l&apos;aperçu, importe.
            Les lignes arrivent en « à vérifier » : tu les catégorises ensuite.
          </p>
        </div>
        <Link
          href={`/${entiteId}/transactions`}
          className="text-sm text-compta-text-muted transition-colors hover:text-compta-accent"
        >
          ← Transactions
        </Link>
      </div>

      <FormulaireImport entiteId={entiteId} />
    </section>
  );
}
