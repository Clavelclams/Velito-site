/**
 * Écran Export — Server Component.
 *
 * Un formulaire en GET pointant vers la route /export/telecharger : les bornes
 * de période partent en query string, la route renvoie le fichier CSV en
 * pièce jointe. Aucun JavaScript client nécessaire (progressive enhancement).
 *
 * On affiche le nombre de transactions disponibles pour donner du contexte.
 */
import { listerTransactions } from "@/lib/repositories/transactions";
import { createClient } from "@/lib/supabase/server";

export default async function ExportPage({
  params,
}: {
  params: Promise<{ entiteId: string }>;
}) {
  const { entiteId } = await params;
  const supabase = await createClient();
  const transactions = await listerTransactions(supabase, entiteId);

  const styleChamp =
    "w-full rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent";

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Export comptable</h2>
        <p className="mt-1 text-sm text-compta-text-muted">
          Génère un fichier CSV des transactions, prêt à transmettre à
          l&apos;expert-comptable ou pour le bilan associatif. Il s&apos;ouvre
          directement dans Excel ou LibreOffice.
        </p>
      </div>

      <form
        method="get"
        action={`/${entiteId}/export/telecharger`}
        className="space-y-4 rounded-lg border border-compta-border bg-compta-surface p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-medium">
              Du <span className="text-compta-text-muted">(optionnel)</span>
            </span>
            <input type="date" name="debut" className={styleChamp} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">
              Au <span className="text-compta-text-muted">(optionnel)</span>
            </span>
            <input type="date" name="fin" className={styleChamp} />
          </label>
        </div>

        <p className="text-xs text-compta-text-muted">
          Sans dates, l&apos;export couvre tout l&apos;historique
          ({transactions.length} transaction
          {transactions.length > 1 ? "s" : ""}).
        </p>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-compta-accent-hover"
          >
            Télécharger le CSV
          </button>
        </div>
      </form>
    </section>
  );
}
