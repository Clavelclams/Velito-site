/**
 * Fiche client : modification, suppression, devis et factures liés
 * (Server Component, 09/11/2026). Lecture seule : fiche affichée sans
 * formulaire.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { peutEcrire } from "@/lib/droits";
import { MESSAGE_LECTURE_SEULE } from "@/lib/services/droits";
import { getClient, listerDevis, listerFactures } from "@/lib/repositories/facturation";
import { formaterCentimes } from "@/lib/services/montants";
import { champsAcheteur, LIBELLES_TYPE_CLIENT } from "@/lib/services/facturation";
import { FormulaireClient } from "@/components/FormulaireClient";

const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export default async function ClientPage({ params }: { params: Promise<{ entiteId: string; id: string }> }) {
  const { entiteId, id } = await params;
  const supabase = await createClient();
  const client = await getClient(supabase, id);
  if (!client || client.entite_id !== entiteId) notFound();
  const [devis, factures, ecriture] = await Promise.all([listerDevis(supabase, entiteId), listerFactures(supabase, entiteId), peutEcrire(supabase, entiteId)]);
  const sesDevis = devis.filter((d) => d.client_id === id);
  const sesFactures = factures.filter((f) => f.client_id === id);

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{client.nom}</h2>
          <p className="text-sm text-compta-text-muted">{LIBELLES_TYPE_CLIENT[client.type_client]}</p>
        </div>
        <Link href={`/${entiteId}/clients`} className="text-sm text-compta-text-muted hover:text-compta-accent">
          ← Clients
        </Link>
      </div>

      {ecriture ? (
        <FormulaireClient entiteId={entiteId} client={client} />
      ) : (
        <div className="space-y-1 rounded-lg border border-compta-border bg-compta-surface p-4 text-sm">
          <p className="text-compta-text-muted">{MESSAGE_LECTURE_SEULE}</p>
          {champsAcheteur(client, true)
            .filter((c) => c.valeur || c.requis)
            .map((c, i) => (
              <p key={i} className="whitespace-pre-line">
                {c.libelle ? `${c.libelle} : ` : ""}
                {c.valeur ?? "à compléter"}
              </p>
            ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className="font-semibold">Devis</h3>
          {sesDevis.length === 0 ? (
            <p className="text-sm text-compta-text-muted">Aucun devis.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {sesDevis.map((d) => (
                <li key={d.id}>
                  <Link href={`/${entiteId}/devis/${d.id}`} className="font-medium hover:text-compta-accent">
                    {d.numero}
                  </Link>{" "}
                  · {dateFr(d.date_devis)} {d.objet ? `· ${d.objet}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">Factures et avoirs</h3>
          {sesFactures.length === 0 ? (
            <p className="text-sm text-compta-text-muted">Aucune facture.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {sesFactures.map((f) => (
                <li key={f.id}>
                  <Link href={`/${entiteId}/factures/${f.id}`} className="font-medium hover:text-compta-accent">
                    {f.numero ?? (f.sens === "avoir" ? "Avoir en brouillon" : "Brouillon")}
                  </Link>
                  {f.date_emission ? ` · ${dateFr(f.date_emission)}` : ""}
                  {f.total_ttc_centimes !== null ? ` · ${formaterCentimes(Number(f.total_ttc_centimes))}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
