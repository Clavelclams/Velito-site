/**
 * Subventions — liste des dossiers par exercice (Server Component, 07/11/2026).
 *
 * Pour chaque dossier : demandé, notifié, encaissé (somme des recettes liées,
 * jamais saisie), reste à encaisser, échéance. Les montants inconnus
 * s'affichent « à compléter », jamais 0. Calculs : service pur subventions.
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listerSubventions } from "@/lib/repositories/subventions";
import { listerTransactions } from "@/lib/repositories/transactions";
import { formaterCentimes } from "@/lib/services/montants";
import { LIBELLES_STATUT_SUBVENTION, suiviSubvention, totauxSubventions } from "@/lib/services/subventions";
import { FormulaireSubvention } from "@/components/FormulaireSubvention";

function montant(c: number | null) {
  return c === null ? <span className="text-compta-accent">à compléter</span> : formaterCentimes(c);
}

export default async function SubventionsPage({ params }: { params: Promise<{ entiteId: string }> }) {
  const { entiteId } = await params;
  const supabase = await createClient();
  const [subs, transactions] = await Promise.all([listerSubventions(supabase, entiteId), listerTransactions(supabase, entiteId)]);
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const exercices = [...new Set(subs.map((s) => s.exercice))].sort((a, b) => b - a);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Subventions</h2>
        <p className="text-sm text-compta-text-muted">
          Demandé, notifié et encaissé sont trois choses différentes. L&apos;encaissé vient des recettes
          rattachées au dossier : saisir une demande ne crée aucun encaissement.
        </p>
      </div>

      {exercices.length === 0 && <p className="text-sm text-compta-text-muted">Aucun dossier pour l&apos;instant.</p>}

      {exercices.map((ex) => {
        const duEx = subs.filter((s) => s.exercice === ex);
        const tot = totauxSubventions(duEx, transactions, aujourdHui);
        return (
          <div key={ex} className="space-y-2">
            <h3 className="font-semibold">
              {ex}
              <span className="ml-2 text-sm font-normal text-compta-text-muted">
                demandé {formaterCentimes(tot.demande)} · notifié {formaterCentimes(tot.notifie)}
                {tot.notifieInconnu > 0 ? ` (+ ${tot.notifieInconnu} à compléter)` : ""} · encaissé {formaterCentimes(tot.encaisse)}
              </span>
            </h3>
            <div className="overflow-x-auto rounded-lg border border-compta-border">
              <table className="w-full text-sm">
                <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Dossier</th>
                    <th className="px-3 py-2 font-medium">Statut</th>
                    <th className="px-3 py-2 text-right font-medium">Demandé</th>
                    <th className="px-3 py-2 text-right font-medium">Notifié</th>
                    <th className="px-3 py-2 text-right font-medium">Encaissé</th>
                    <th className="px-3 py-2 text-right font-medium">Reste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-compta-border bg-compta-surface">
                  {duEx.map((s) => {
                    const suivi = suiviSubvention(s, transactions, aujourdHui);
                    return (
                      <tr key={s.id}>
                        <td className="px-3 py-2">
                          <Link href={`/${entiteId}/subventions/${s.id}`} className="font-medium hover:text-compta-accent">
                            {s.financeur}
                          </Link>
                          <span className="block text-xs text-compta-text-muted">
                            {s.action}
                            {suivi.echeanceDepassee && <span className="text-compta-depense"> · échéance dépassée</span>}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs">{LIBELLES_STATUT_SUBVENTION[s.statut]}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{montant(suivi.demande)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{montant(suivi.notifie)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-compta-recette">{formaterCentimes(suivi.encaisse)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{suivi.resteAEncaisser === null ? "—" : formaterCentimes(suivi.resteAEncaisser)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div className="space-y-2">
        <h3 className="font-semibold">Nouveau dossier</h3>
        <FormulaireSubvention entiteId={entiteId} />
      </div>
    </section>
  );
}
