/**
 * Devis : liste, filtres et création (Server Component, 09/11/2026).
 *
 * Filtres par statut (« expiré » calculé), exercice et client, passés dans
 * l'URL (?statut=…&exercice=…&client=…). Total d'un devis = calcul pur sur
 * ses lignes (jamais stocké). Lecture seule : pas de formulaire.
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { peutEcrire } from "@/lib/droits";
import { MESSAGE_LECTURE_SEULE } from "@/lib/services/droits";
import { listerClients, listerDevis, listerLignesDevisEntite } from "@/lib/repositories/facturation";
import { formaterCentimes } from "@/lib/services/montants";
import { calculerTotaux, exercicesDe, filtrerDevis, LIBELLES_STATUT_DEVIS, statutDevis } from "@/lib/services/facturation";
import type { LigneDevis } from "@/types/facturation";
import { FormulaireDevis } from "@/components/FormulaireDevis";

const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const CLASSE_STATUT: Record<string, string> = {
  brouillon: "text-compta-text-muted",
  envoye: "text-compta-accent",
  accepte: "text-compta-recette",
  refuse: "text-compta-depense",
  expire: "text-compta-depense",
};

export default async function DevisPage({
  params,
  searchParams,
}: {
  params: Promise<{ entiteId: string }>;
  searchParams: Promise<{ statut?: string; exercice?: string; client?: string }>;
}) {
  const { entiteId } = await params;
  const { statut = "", exercice = "", client = "" } = await searchParams;
  const supabase = await createClient();
  const [devis, lignes, clients, ecriture] = await Promise.all([
    listerDevis(supabase, entiteId),
    listerLignesDevisEntite(supabase, entiteId),
    listerClients(supabase, entiteId),
    peutEcrire(supabase, entiteId),
  ]);
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const parDevis = new Map<string, LigneDevis[]>();
  for (const l of lignes) parDevis.set(l.devis_id, [...(parDevis.get(l.devis_id) ?? []), l]);
  const ttc = (id: string) => calculerTotaux(parDevis.get(id) ?? []).totalTtcCentimes;
  const nomClient = new Map(clients.map((c) => [c.id, c.nom]));
  const visibles = filtrerDevis(devis, { statut, exercice, clientId: client }, aujourdHui);
  const totalVisible = visibles.reduce((s, d) => s + ttc(d.id), 0);
  const champ = "rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent";

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Devis</h2>
          <p className="text-sm text-compta-text-muted">
            Un devis n&apos;est ni une recette ni une créance. Accepté, il se transforme en brouillon de facture ; le devis reste tel
            quel.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 whitespace-nowrap text-sm">
          <Link href={`/${entiteId}/factures`} className="text-compta-text-muted hover:text-compta-accent">
            Factures →
          </Link>
          <Link href={`/${entiteId}/clients`} className="text-compta-text-muted hover:text-compta-accent">
            Clients →
          </Link>
          <Link href={`/${entiteId}/facturation/parametres`} className="text-compta-text-muted hover:text-compta-accent">
            Paramètres de facturation →
          </Link>
        </div>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-lg border border-compta-border bg-compta-surface p-3">
        <label>
          <span className="mb-1 block text-xs font-medium text-compta-text-muted">Statut</span>
          <select name="statut" defaultValue={statut} className={champ}>
            <option value="">Tous</option>
            {Object.entries(LIBELLES_STATUT_DEVIS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-compta-text-muted">Exercice</span>
          <select name="exercice" defaultValue={exercice} className={champ}>
            <option value="">Tous</option>
            {exercicesDe(devis.map((d) => d.date_devis)).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-compta-text-muted">Client</span>
          <select name="client" defaultValue={client} className={champ}>
            <option value="">Tous</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white hover:bg-compta-accent-hover">
          Filtrer
        </button>
        {(statut || exercice || client) && (
          <Link href={`/${entiteId}/devis`} className="px-2 py-2 text-sm text-compta-text-muted hover:text-compta-accent">
            Effacer
          </Link>
        )}
      </form>

      {devis.length === 0 ? (
        <p className="text-sm text-compta-text-muted">Aucun devis pour l&apos;instant.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-compta-border">
          <table className="w-full text-sm">
            <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Numéro</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Client et objet</th>
                <th className="px-3 py-2 font-medium">Validité</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 text-right font-medium">Total TTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-compta-border bg-compta-surface">
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-compta-text-muted">
                    Aucun devis ne correspond à ces filtres.
                  </td>
                </tr>
              )}
              {visibles.map((d) => {
                const s = statutDevis(d, aujourdHui);
                return (
                  <tr key={d.id}>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Link href={`/${entiteId}/devis/${d.id}`} className="font-medium hover:text-compta-accent">
                        {d.numero}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{dateFr(d.date_devis)}</td>
                    <td className="px-3 py-2">
                      {nomClient.get(d.client_id) ?? ""}
                      {d.objet && <span className="block text-xs text-compta-text-muted">{d.objet}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{dateFr(d.date_fin_validite)}</td>
                    <td className={`whitespace-nowrap px-3 py-2 text-xs ${CLASSE_STATUT[s] ?? ""}`}>
                      {LIBELLES_STATUT_DEVIS[s]}
                      {d.facture_id ? " · facturé" : ""}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formaterCentimes(ttc(d.id))}</td>
                  </tr>
                );
              })}
            </tbody>
            {visibles.length > 0 && (
              <tfoot className="bg-compta-bg font-semibold">
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-right">
                    {visibles.length} devis
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formaterCentimes(totalVisible)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {ecriture ? (
        <div className="space-y-2">
          <h3 className="font-semibold">Nouveau devis</h3>
          {clients.length === 0 ? (
            <p className="text-sm text-compta-text-muted">
              Ajoute d&apos;abord un{" "}
              <Link href={`/${entiteId}/clients`} className="text-compta-accent hover:underline">
                client
              </Link>
              .
            </p>
          ) : (
            <>
              <p className="text-xs text-compta-text-muted">Le numéro (DEV-AAAA-NNN) est attribué automatiquement à la création.</p>
              <FormulaireDevis entiteId={entiteId} clients={clients.map((c) => ({ id: c.id, nom: c.nom }))} aujourdHui={aujourdHui} />
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-compta-text-muted">{MESSAGE_LECTURE_SEULE}</p>
      )}
    </section>
  );
}
