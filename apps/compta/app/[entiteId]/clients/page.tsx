/**
 * Clients : liste et ajout (Server Component, 09/11/2026).
 *
 * Pour chaque client : type, SIREN, nombre de devis et de factures, reste à
 * encaisser. Un client utilisé par un devis ou une facture ne se supprime
 * pas (la base le refuse). Lecture seule : pas de formulaire.
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { peutEcrire } from "@/lib/droits";
import { MESSAGE_LECTURE_SEULE } from "@/lib/services/droits";
import { listerClients, listerDevis, listerFactures, listerPaiementsEntite } from "@/lib/repositories/facturation";
import { formaterCentimes } from "@/lib/services/montants";
import { avoirsParFacture, encaissementsParFacture, LIBELLES_TYPE_CLIENT, resteAEncaisser } from "@/lib/services/facturation";
import { FormulaireClient } from "@/components/FormulaireClient";

export default async function ClientsPage({ params }: { params: Promise<{ entiteId: string }> }) {
  const { entiteId } = await params;
  const supabase = await createClient();
  const [clients, devis, factures, paiements, ecriture] = await Promise.all([
    listerClients(supabase, entiteId),
    listerDevis(supabase, entiteId),
    listerFactures(supabase, entiteId),
    listerPaiementsEntite(supabase, entiteId),
    peutEcrire(supabase, entiteId),
  ]);
  const encaisse = encaissementsParFacture(paiements);
  const avoirs = avoirsParFacture(factures);
  const reste = new Map<string, number>();
  for (const f of factures) {
    const r = resteAEncaisser(f, encaisse.get(f.id) ?? 0, avoirs.get(f.id) ?? 0);
    if (r > 0) reste.set(f.client_id, (reste.get(f.client_id) ?? 0) + r);
  }
  const compte = (liste: { client_id: string }[], id: string) => liste.filter((x) => x.client_id === id).length;

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Clients</h2>
          <p className="text-sm text-compta-text-muted">
            Les acheteurs des devis et factures. Une facture émise garde les coordonnées du client au jour de son émission.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 whitespace-nowrap text-sm">
          <Link href={`/${entiteId}/devis`} className="text-compta-text-muted hover:text-compta-accent">
            Devis →
          </Link>
          <Link href={`/${entiteId}/factures`} className="text-compta-text-muted hover:text-compta-accent">
            Factures →
          </Link>
        </div>
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-compta-text-muted">Aucun client pour l&apos;instant.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-compta-border">
          <table className="w-full text-sm">
            <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">SIREN</th>
                <th className="px-3 py-2 text-right font-medium">Devis</th>
                <th className="px-3 py-2 text-right font-medium">Factures</th>
                <th className="px-3 py-2 text-right font-medium">Reste à encaisser</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-compta-border bg-compta-surface">
              {clients.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2">
                    <Link href={`/${entiteId}/clients/${c.id}`} className="font-medium hover:text-compta-accent">
                      {c.nom}
                    </Link>
                    {c.email && <span className="block text-xs text-compta-text-muted">{c.email}</span>}
                  </td>
                  <td className="px-3 py-2">{LIBELLES_TYPE_CLIENT[c.type_client]}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {c.siren ?? (c.type_client === "professionnel" ? <span className="text-compta-depense">à compléter</span> : "")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{compte(devis, c.id)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{compte(factures, c.id)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formaterCentimes(reste.get(c.id) ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ecriture ? (
        <div className="space-y-2">
          <h3 className="font-semibold">Nouveau client</h3>
          <FormulaireClient entiteId={entiteId} />
        </div>
      ) : (
        <p className="text-sm text-compta-text-muted">{MESSAGE_LECTURE_SEULE}</p>
      )}
    </section>
  );
}
