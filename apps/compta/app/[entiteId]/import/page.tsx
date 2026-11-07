/**
 * Écran Import CSV — Server Component (léger).
 * Toute l'interactivité (parsing, mapping, aperçu) vit dans le composant
 * client FormulaireImport ; cette page ne fait que le cadre + le contexte.
 * L'entité est déjà validée par le layout parent.
 */
import Link from "next/link";
import { FormulaireImport } from "@/components/FormulaireImport";
import { createClient } from "@/lib/supabase/server";
import { listerComptesTresorerie } from "@/lib/repositories/tresorerie";
import { peutEcrire } from "@/lib/droits";
import { MESSAGE_LECTURE_SEULE } from "@/lib/services/droits";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ entiteId: string }>;
}) {
  const { entiteId } = await params;
  const supabase = await createClient();
  // [07/11/2026] Lot 6 : le relevé appartient à un compte réel.
  const comptes = (await listerComptesTresorerie(supabase, entiteId)).filter((c) => c.active);
  const ecriture = await peutEcrire(supabase, entiteId);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Importer un relevé bancaire</h2>
          <p className="mt-1 text-sm text-compta-text-muted">
            Charge un CSV, mappe les colonnes, vérifie l&apos;aperçu, importe.
            Les lignes arrivent « à classer » : tu les catégorises ensuite.
            Réimporter le même relevé n&apos;ajoute que les lignes nouvelles.
          </p>
        </div>
        <Link
          href={`/${entiteId}/transactions`}
          className="text-sm text-compta-text-muted transition-colors hover:text-compta-accent"
        >
          ← Transactions
        </Link>
      </div>

      {/* [07/11/2026] Lecteur : message à la place de la zone d'import. */}
      {ecriture ? (
        <FormulaireImport
          entiteId={entiteId}
          comptes={comptes.map((c) => ({ id: c.id, nom: c.nom }))}
        />
      ) : (
        <p className="rounded-lg border border-compta-border bg-compta-surface p-5 text-sm text-compta-text-muted">
          {MESSAGE_LECTURE_SEULE}
        </p>
      )}
    </section>
  );
}
