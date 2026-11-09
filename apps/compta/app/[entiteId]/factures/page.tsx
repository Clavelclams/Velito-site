/**
 * Factures et avoirs : liste, filtres, reste à encaisser, création d'un
 * brouillon (Server Component, 09/11/2026).
 *
 * Statut affiché CALCULÉ (service statutFacture) : brouillon, émise, payée
 * partiellement, payée, annulée par avoir. Filtres par statut, exercice et
 * client dans l'URL. Le total « reste à encaisser » ne compte que les
 * factures émises : une facture n'est jamais une recette, seuls les
 * encaissements rattachés comptent en trésorerie. Lecture seule : pas de
 * formulaire.
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { peutEcrire } from "@/lib/droits";
import { MESSAGE_LECTURE_SEULE } from "@/lib/services/droits";
import { listerClients, listerFactures, listerLignesFactureEntite, listerPaiementsEntite } from "@/lib/repositories/facturation";
import { formaterCentimes } from "@/lib/services/montants";
import {
  avoirsParFacture,
  dateReference,
  ENCADRE_REFORME,
  encaissementsParFacture,
  exercicesDe,
  filtrerFactures,
  LIBELLES_STATUT_FACTURE,
  resteAEncaisser,
  statutFacture,
  totauxFacture,
} from "@/lib/services/facturation";
import type { LigneFacture } from "@/types/facturation";
import { FormulaireFacture } from "@/components/FormulaireFacture";

const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const CLASSE_STATUT: Record<string, string> = {
  brouillon: "text-compta-text-muted",
  emise: "text-compta-accent",
  payee_partiellement: "text-compta-accent",
  payee: "text-compta-recette",
  annulee: "text-compta-text-muted",
};

export default async function FacturesPage({
  params,
  searchParams,
}: {
  params: Promise<{ entiteId: string }>;
  searchParams: Promise<{ statut?: string; exercice?: string; client?: string }>;
}) {
  const { entiteId } = await params;
  const { statut = "", exercice = "", client = "" } = await searchParams;
  const supabase = await createClient();
  const [factures, lignes, paiements, clients, ecriture] = await Promise.all([
    listerFactures(supabase, entiteId),
    listerLignesFactureEntite(supabase, entiteId),
    listerPaiementsEntite(supabase, entiteId),
    listerClients(supabase, entiteId),
    peutEcrire(supabase, entiteId),
  ]);
  const parFacture = new Map<string, LigneFacture[]>();
  for (const l of lignes) parFacture.set(l.facture_id, [...(parFacture.get(l.facture_id) ?? []), l]);
  const encaisse = encaissementsParFacture(paiements);
  const avoirs = avoirsParFacture(factures);
  const nomClient = new Map(clients.map((c) => [c.id, c.nom]));

  const enrichies = factures.map((f) => {
    const e = encaisse.get(f.id) ?? 0;
    const a = avoirs.get(f.id) ?? 0;
    return {
      ...f,
      statutAffiche: statutFacture(f, e, a),
      ttc: totauxFacture(f, parFacture.get(f.id) ?? []).totalTtcCentimes,
      encaisse: e,
      reste: resteAEncaisser(f, e, a),
    };
  });
  const visibles = filtrerFactures(enrichies, { statut, exercice, clientId: client });
  const resteVisible = visibles.reduce((s, f) => s + f.reste, 0);
  const champ = "rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent";
  const requete = new URLSearchParams({ statut, exercice, client }).toString();

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Factures</h2>
          <p className="text-sm text-compta-text-muted">
            Le brouillon n&apos;a pas de numéro ; le numéro légal est attribué à l&apos;émission, et une facture émise ne se modifie
            plus (on la corrige par un avoir). Une facture n&apos;est jamais une recette : on lui rattache les encaissements réels du
            relevé.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 whitespace-nowrap text-sm">
          <Link href={`/${entiteId}/devis`} className="text-compta-text-muted hover:text-compta-accent">
            Devis →
          </Link>
          <Link href={`/${entiteId}/clients`} className="text-compta-text-muted hover:text-compta-accent">
            Clients →
          </Link>
          <Link href={`/${entiteId}/facturation/parametres`} className="text-compta-text-muted hover:text-compta-accent">
            Paramètres de facturation →
          </Link>
        </div>
      </div>

      <div className="rounded-md border border-compta-accent/40 bg-compta-accent/5 px-3 py-2 text-sm">{ENCADRE_REFORME}</div>

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-lg border border-compta-border bg-compta-surface p-3">
        <label>
          <span className="mb-1 block text-xs font-medium text-compta-text-muted">Statut</span>
          <select name="statut" defaultValue={statut} className={champ}>
            <option value="">Tous</option>
            {Object.entries(LIBELLES_STATUT_FACTURE).map(([v, l]) => (
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
            {exercicesDe(factures.map(dateReference)).map((a) => (
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
          <Link href={`/${entiteId}/factures`} className="px-2 py-2 text-sm text-compta-text-muted hover:text-compta-accent">
            Effacer
          </Link>
        )}
        <a href={`/${entiteId}/factures/csv?${requete}`} className="ml-auto px-2 py-2 text-sm text-compta-text-muted hover:text-compta-accent">
          Exporter en CSV
        </a>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-compta-border bg-compta-surface p-3">
          <p className="text-xs text-compta-text-muted">Reste à encaisser (sélection)</p>
          <p className="text-lg font-semibold tabular-nums">{formaterCentimes(resteVisible)}</p>
        </div>
        <div className="rounded-lg border border-compta-border bg-compta-surface p-3">
          <p className="text-xs text-compta-text-muted">Documents affichés</p>
          <p className="text-lg font-semibold tabular-nums">{visibles.length}</p>
        </div>
      </div>

      {factures.length === 0 ? (
        <p className="text-sm text-compta-text-muted">Aucune facture pour l&apos;instant.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-compta-border">
          <table className="w-full text-sm">
            <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Numéro</th>
                <th className="px-3 py-2 font-medium">Émission</th>
                <th className="px-3 py-2 font-medium">Client et objet</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 text-right font-medium">Total TTC</th>
                <th className="px-3 py-2 text-right font-medium">Reste à encaisser</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-compta-border bg-compta-surface">
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-compta-text-muted">
                    Aucune facture ne correspond à ces filtres.
                  </td>
                </tr>
              )}
              {visibles.map((f) => (
                <tr key={f.id}>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link href={`/${entiteId}/factures/${f.id}`} className="font-medium hover:text-compta-accent">
                      {f.numero ?? "Brouillon"}
                    </Link>
                    {f.sens === "avoir" && <span className="block text-xs text-compta-text-muted">Avoir</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{f.date_emission ? dateFr(f.date_emission) : ""}</td>
                  <td className="px-3 py-2">
                    {nomClient.get(f.client_id) ?? ""}
                    {f.objet && <span className="block text-xs text-compta-text-muted">{f.objet}</span>}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-2 text-xs ${CLASSE_STATUT[f.statutAffiche] ?? ""}`}>{LIBELLES_STATUT_FACTURE[f.statutAffiche]}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {f.sens === "avoir" ? "− " : ""}
                    {formaterCentimes(f.ttc)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{f.reste > 0 ? formaterCentimes(f.reste) : ""}</td>
                </tr>
              ))}
            </tbody>
            {visibles.length > 0 && (
              <tfoot className="bg-compta-bg font-semibold">
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-right">
                    Reste à encaisser
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formaterCentimes(resteVisible)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {ecriture ? (
        <div className="space-y-2">
          <h3 className="font-semibold">Nouveau brouillon de facture</h3>
          {clients.length === 0 ? (
            <p className="text-sm text-compta-text-muted">
              Ajoute d&apos;abord un{" "}
              <Link href={`/${entiteId}/clients`} className="text-compta-accent hover:underline">
                client
              </Link>
              .
            </p>
          ) : (
            <FormulaireFacture entiteId={entiteId} clients={clients.map((c) => ({ id: c.id, nom: c.nom }))} />
          )}
        </div>
      ) : (
        <p className="text-sm text-compta-text-muted">{MESSAGE_LECTURE_SEULE}</p>
      )}
    </section>
  );
}
