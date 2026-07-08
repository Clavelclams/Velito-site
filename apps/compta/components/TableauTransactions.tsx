/**
 * Tableau des transactions — composant SERVEUR.
 *
 * Affichage :
 *  - montants formatés via formaterCentimes (le SEUL convertisseur centimes→€) ;
 *  - une recette en vert, une dépense en rouge, avec son signe ;
 *  - le nom de catégorie est résolu depuis une table de correspondance passée
 *    par la page (on évite une jointure SQL : deux petites requêtes + un map) ;
 *  - chaque ligne mène à son écran d'édition (/[entiteId]/transactions/[id]).
 */
import Link from "next/link";
import type { Transaction } from "@/types/database";
import { formaterCentimes } from "@/lib/services/montants";

export function TableauTransactions({
  entiteId,
  transactions,
  nomsCategories,
}: {
  entiteId: string;
  transactions: Transaction[];
  /** { [categorieId]: nom } — inclut les catégories archivées. */
  nomsCategories: Record<string, string>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-compta-border">
      <table className="w-full text-sm">
        <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Libellé</th>
            <th className="px-3 py-2 font-medium">Catégorie</th>
            <th className="px-3 py-2 text-right font-medium">Montant TTC</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-compta-border bg-compta-surface">
          {transactions.map((t) => {
            const estRecette = t.type === "recette";
            return (
              <tr key={t.id} className="hover:bg-compta-bg">
                <td className="whitespace-nowrap px-3 py-2 text-compta-text-muted">
                  {formaterDate(t.date_transaction)}
                </td>
                <td className="px-3 py-2">
                  {t.libelle}
                  {t.statut === "a_verifier" && (
                    <span className="ml-2 rounded bg-compta-bg px-1.5 py-0.5 text-xs text-compta-text-muted">
                      à vérifier
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-compta-text-muted">
                  {t.categorie_id ? (nomsCategories[t.categorie_id] ?? "—") : "—"}
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-2 text-right font-medium ${
                    estRecette ? "text-compta-recette" : "text-compta-depense"
                  }`}
                >
                  {estRecette ? "+" : "−"}
                  {formaterCentimes(t.montant_ttc_centimes)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <Link
                    href={`/${entiteId}/transactions/${t.id}`}
                    className="text-xs text-compta-accent underline-offset-2 hover:underline"
                  >
                    Modifier
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** "2026-07-07" → "07/07/2026" (affichage FR, sans dépendance ni fuseau). */
function formaterDate(iso: string): string {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}
