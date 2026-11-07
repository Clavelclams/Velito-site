/**
 * Écran Trésorerie d'une entité — Server Component (Lot 6, 07/11/2026).
 *
 * Pour chaque compte réel : solde calculé à aujourd'hui, dernier solde lu sur
 * un relevé et ÉCART entre les deux à la date du relevé (règle Nova : on ne
 * force jamais un écart à zéro, on le montre). Puis les formulaires (compte,
 * relevé, virement), les derniers virements et les derniers relevés saisis.
 *
 * Tous les calculs viennent du service pur (soldeAu, horsVirements) ; la page
 * ne fait que charger et afficher.
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listerTransactions } from "@/lib/repositories/transactions";
import { listerComptesTresorerie, listerSoldesObserves } from "@/lib/repositories/tresorerie";
import { formaterCentimes } from "@/lib/services/montants";
import { LIBELLES_NATURE, soldeAu } from "@/lib/services/tresorerie";
import { FormulairesTresorerie } from "@/components/FormulairesTresorerie";
import { BoutonConfirmer } from "@/components/BoutonConfirmer";
import { supprimerSoldeObserveAction, supprimerVirementAction } from "./actions";

function dateFr(iso: string): string {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}

export default async function TresoreriePage({ params }: { params: Promise<{ entiteId: string }> }) {
  const { entiteId } = await params;
  const supabase = await createClient();
  const [comptes, transactions, observations] = await Promise.all([
    listerComptesTresorerie(supabase, entiteId),
    listerTransactions(supabase, entiteId),
    listerSoldesObserves(supabase, entiteId),
  ]);

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const nomsComptes = Object.fromEntries(comptes.map((c) => [c.id, c.nom]));
  const sansCompte = transactions.filter((t) => t.compte_tresorerie_id === null).length;

  // Virements : on n'affiche qu'une ligne par virement (la jambe « sortie »).
  const virements = transactions.filter((t) => t.virement_id && t.type === "depense").slice(0, 10);
  const entrees = new Map(
    transactions.filter((t) => t.virement_id && t.type === "recette").map((t) => [t.virement_id!, t]),
  );

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Trésorerie</h2>
        <p className="mt-1 text-sm text-compta-text-muted">
          Les comptes réels de la structure, leur solde calculé et l&apos;écart avec le dernier relevé.
        </p>
      </div>

      {comptes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-compta-border bg-compta-surface p-6 text-sm text-compta-text-muted">
          Aucun compte pour l&apos;instant. Crée ton compte courant (et ta caisse si tu manipules des espèces) ci-dessous.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-compta-border">
          <table className="w-full text-sm">
            <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Compte</th>
                <th className="px-3 py-2 text-right font-medium">Solde calculé</th>
                <th className="px-3 py-2 text-right font-medium">Dernier relevé</th>
                <th className="px-3 py-2 text-right font-medium">Écart</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-compta-border bg-compta-surface">
              {comptes.map((c) => {
                const calcule = soldeAu(c, transactions, aujourdHui);
                const dernier = observations.find((o) => o.compte_id === c.id) ?? null; // triées récentes d'abord
                const calculeAuReleve = dernier ? soldeAu(c, transactions, dernier.date_releve) : null;
                const ecart = dernier && calculeAuReleve !== null ? dernier.solde_centimes - calculeAuReleve : null;
                const nb = transactions.filter((t) => t.compte_tresorerie_id === c.id).length;
                return (
                  <tr key={c.id}>
                    <td className="px-3 py-2">
                      <span className="font-medium">{c.nom}</span>
                      <span className="block text-xs text-compta-text-muted">
                        {LIBELLES_NATURE[c.nature]} · {nb} opération(s)
                        {c.solde_initial_centimes === null
                          ? " · solde initial inconnu"
                          : ` · départ ${formaterCentimes(c.solde_initial_centimes)} le ${dateFr(c.date_solde_initial!)}`}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {calcule === null ? <span className="text-compta-text-muted">inconnu</span> : formaterCentimes(calcule)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {dernier ? (
                        <>
                          {formaterCentimes(dernier.solde_centimes)}
                          <span className="block text-xs text-compta-text-muted">{dateFr(dernier.date_releve)}</span>
                        </>
                      ) : (
                        <span className="text-compta-text-muted">aucun</span>
                      )}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${
                        ecart === null ? "text-compta-text-muted" : ecart === 0 ? "text-compta-recette" : "text-compta-depense"
                      }`}
                    >
                      {ecart === null ? "—" : ecart === 0 ? "concorde" : formaterCentimes(ecart)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <Link href={`/${entiteId}/tresorerie/${c.id}`} className="text-xs text-compta-accent hover:underline">
                        Contrôle mensuel
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sansCompte > 0 && (
        <Link
          href={`/${entiteId}/transactions?compte=sans`}
          className="block rounded-lg border border-compta-accent/30 bg-compta-accent/5 px-4 py-3 text-sm text-compta-accent hover:underline"
        >
          {sansCompte} opération(s) sans compte : elles n&apos;entrent dans aucun solde tant qu&apos;elles ne sont pas rattachées.
        </Link>
      )}

      <FormulairesTresorerie
        entiteId={entiteId}
        comptes={comptes.filter((c) => c.active).map((c) => ({ id: c.id, nom: c.nom }))}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
          <h3 className="mb-3 font-semibold">Derniers virements internes</h3>
          {virements.length === 0 ? (
            <p className="text-sm text-compta-text-muted">Aucun.</p>
          ) : (
            <ul className="divide-y divide-compta-border text-sm">
              {virements.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    {dateFr(v.date_transaction)} · {nomsComptes[v.compte_tresorerie_id!] ?? "?"} →{" "}
                    {nomsComptes[entrees.get(v.virement_id!)?.compte_tresorerie_id ?? ""] ?? "?"}
                    <span className="block text-xs text-compta-text-muted">{v.libelle}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">{formaterCentimes(v.montant_ttc_centimes)}</span>
                    <BoutonConfirmer
                      action={supprimerVirementAction.bind(null, entiteId, v.virement_id!)}
                      question="Supprimer ce virement (la sortie ET l'entrée) ?"
                      libelle="Supprimer"
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
          <h3 className="mb-3 font-semibold">Derniers relevés saisis</h3>
          {observations.length === 0 ? (
            <p className="text-sm text-compta-text-muted">Aucun.</p>
          ) : (
            <ul className="divide-y divide-compta-border text-sm">
              {observations.slice(0, 10).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    {dateFr(o.date_releve)} · {nomsComptes[o.compte_id] ?? "?"}
                    {o.reference && <span className="block text-xs text-compta-text-muted">{o.reference}</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">{formaterCentimes(o.solde_centimes)}</span>
                    <BoutonConfirmer
                      action={supprimerSoldeObserveAction.bind(null, entiteId, o.id)}
                      question="Supprimer ce solde de relevé ?"
                      libelle="Supprimer"
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
