/**
 * Journal des écritures + Balance générale — Server Component.
 * Deux vues standards de la partie double :
 *  - la BALANCE (par compte : total débit, total crédit, solde) ;
 *  - le JOURNAL (chaque écriture avec ses lignes débit/crédit).
 * Permet de visualiser en clair ce que le FEC exporte.
 */
import Link from "next/link";
import { listerComptes } from "@/lib/repositories/comptes";
import { listerEcritures, listerToutesLignes } from "@/lib/repositories/ecritures";
import { createClient } from "@/lib/supabase/server";
import { formaterCentimes } from "@/lib/services/montants";
import { balanceGenerale } from "@/lib/services/etats-financiers";
import type { LigneEcriture } from "@/types/database";

function mtt(centimes: number): string {
  return centimes === 0 ? "" : formaterCentimes(centimes);
}
function dateFr(iso: string): string {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}

export default async function JournalPage({
  params,
}: {
  params: Promise<{ entiteId: string }>;
}) {
  const { entiteId } = await params;
  const supabase = await createClient();

  const [ecritures, lignes, comptes] = await Promise.all([
    listerEcritures(supabase, entiteId),
    listerToutesLignes(supabase, entiteId),
    listerComptes(supabase, entiteId, false),
  ]);

  const balance = balanceGenerale(lignes, comptes);
  const comptesParId = new Map(comptes.map((c) => [c.id, c]));
  const lignesParEcriture = new Map<string, LigneEcriture[]>();
  for (const l of lignes) {
    const arr = lignesParEcriture.get(l.ecriture_id) ?? [];
    arr.push(l);
    lignesParEcriture.set(l.ecriture_id, arr);
  }
  // Journal du plus ancien au plus récent (lecture chronologique).
  const journal = [...ecritures].sort((a, b) =>
    a.date_ecriture < b.date_ecriture ? -1 : a.date_ecriture > b.date_ecriture ? 1 : 0,
  );

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Journal & balance</h2>
          <p className="mt-1 text-sm text-compta-text-muted">
            Les écritures en partie double (ce que le FEC exporte).
          </p>
        </div>
        <Link
          href={`/${entiteId}/comptabilite`}
          className="text-sm text-compta-text-muted transition-colors hover:text-compta-accent"
        >
          ← Comptabilité
        </Link>
      </div>

      {ecritures.length === 0 ? (
        <div className="rounded-lg border border-dashed border-compta-border bg-compta-surface p-6 text-sm text-compta-text-muted">
          Aucune écriture. Initialise le plan comptable et saisis des
          transactions (ou clique « Régénérer les écritures »).
        </div>
      ) : (
        <>
          {/* ---- Balance générale ---- */}
          <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Balance générale</h3>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  balance.equilibre
                    ? "bg-compta-recette/10 text-compta-recette"
                    : "bg-compta-depense/10 text-compta-depense"
                }`}
              >
                {balance.equilibre ? "Équilibrée" : "Déséquilibrée"}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-compta-text-muted">
                <tr>
                  <th className="py-1 font-medium">Compte</th>
                  <th className="py-1 text-right font-medium">Débit</th>
                  <th className="py-1 text-right font-medium">Crédit</th>
                  <th className="py-1 text-right font-medium">Solde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-compta-border">
                {balance.lignes.map((l) => (
                  <tr key={l.numero}>
                    <td className="py-1.5">
                      <span className="tabular-nums text-compta-text-muted">{l.numero}</span> · {l.libelle}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{mtt(l.totalDebit)}</td>
                    <td className="py-1.5 text-right tabular-nums">{mtt(l.totalCredit)}</td>
                    <td className="py-1.5 text-right tabular-nums">{formaterCentimes(l.solde)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-compta-border font-semibold">
                  <td className="py-2">Totaux</td>
                  <td className="py-2 text-right tabular-nums">{formaterCentimes(balance.totalDebit)}</td>
                  <td className="py-2 text-right tabular-nums">{formaterCentimes(balance.totalCredit)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ---- Journal ---- */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Journal ({journal.length} écritures)</h3>
            {journal.map((e) => {
              const l = lignesParEcriture.get(e.id) ?? [];
              return (
                <div key={e.id} className="rounded-lg border border-compta-border bg-compta-surface p-4">
                  <div className="mb-2 flex items-baseline justify-between text-sm">
                    <span className="font-medium">
                      <span className="rounded bg-compta-bg px-1.5 py-0.5 text-xs">{e.journal}</span>{" "}
                      {e.libelle}
                    </span>
                    <span className="text-xs text-compta-text-muted">
                      {dateFr(e.date_ecriture)}
                      {e.piece ? ` · ${e.piece}` : ""}
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {l.map((ligne) => {
                        const c = comptesParId.get(ligne.compte_id);
                        return (
                          <tr key={ligne.id} className="text-compta-text-muted">
                            <td className="py-0.5">
                              <span className="tabular-nums">{c?.numero ?? "??"}</span> · {c?.libelle ?? ""}
                            </td>
                            <td className="py-0.5 text-right tabular-nums text-compta-text">
                              {mtt(ligne.debit_centimes)}
                            </td>
                            <td className="py-0.5 text-right tabular-nums text-compta-text">
                              {mtt(ligne.credit_centimes)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
