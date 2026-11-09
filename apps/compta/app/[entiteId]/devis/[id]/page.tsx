/**
 * Fiche d'un devis : Server Component (09/11/2026).
 *
 * En-tête, lignes et totaux par taux, mentions à compléter, puis les actions
 * permises par le statut : envoyer, accepter (« Bon pour accord » daté),
 * refuser, transformer en facture. Lecture seule : ni formulaire ni bouton.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { peutEcrire } from "@/lib/droits";
import { MESSAGE_LECTURE_SEULE } from "@/lib/services/droits";
import { getEntite } from "@/lib/repositories/entites";
import { getClient, getDevis, getFacture, getParametres, listerClients, listerLignesDevis } from "@/lib/repositories/facturation";
import {
  calculerTotaux,
  devisModifiable,
  LIBELLES_STATUT_DEVIS,
  mentionsManquantes,
  regimeSansTva,
  statutDevis,
  vueLignes,
  vueTotaux,
} from "@/lib/services/facturation";
import { FormulaireDevis } from "@/components/FormulaireDevis";
import { LignesFacturation } from "@/components/LignesFacturation";
import { ActionsDevis } from "@/components/ActionsDevis";

const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export default async function DevisFichePage({ params }: { params: Promise<{ entiteId: string; id: string }> }) {
  const { entiteId, id } = await params;
  const supabase = await createClient();
  const devis = await getDevis(supabase, id);
  if (!devis || devis.entite_id !== entiteId) notFound();

  const [lignes, client, clients, parametres, entite, ecriture] = await Promise.all([
    listerLignesDevis(supabase, id),
    getClient(supabase, devis.client_id),
    listerClients(supabase, entiteId),
    getParametres(supabase, entiteId),
    getEntite(supabase, entiteId),
    peutEcrire(supabase, entiteId),
  ]);
  const facture = devis.facture_id ? await getFacture(supabase, devis.facture_id) : null;
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const statut = statutDevis(devis, aujourdHui);
  const modifiable = devisModifiable(devis) && ecriture;
  const sansTva = regimeSansTva(parametres?.regime_tva);
  const manquantes = mentionsManquantes({ type: "devis" }, lignes, parametres, client, entite?.type_juridique ?? "association");

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Devis {devis.numero} · {client?.nom ?? ""}
          </h2>
          <p className="text-sm text-compta-text-muted">
            {devis.objet ? `${devis.objet} · ` : ""}
            {dateFr(devis.date_devis)}, valable jusqu&apos;au {dateFr(devis.date_fin_validite)} ·{" "}
            <span className="font-medium text-compta-text">{LIBELLES_STATUT_DEVIS[statut]}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          <Link href={`/${entiteId}/devis`} className="text-compta-text-muted hover:text-compta-accent">
            ← Devis
          </Link>
          <Link href={`/${entiteId}/devis/${devis.id}/impression`} className="text-compta-text-muted hover:text-compta-accent">
            Version imprimable
          </Link>
        </div>
      </div>

      {devis.statut === "accepte" && devis.date_acceptation && (
        <p className="rounded-md bg-compta-recette/10 px-3 py-2 text-sm">
          Bon pour accord du {dateFr(devis.date_acceptation)}
          {devis.signataire_accord ? `, signé par ${devis.signataire_accord}` : ""}.
          {facture && (
            <>
              {" "}
              Facturé :{" "}
              <Link href={`/${entiteId}/factures/${facture.id}`} className="font-medium text-compta-accent hover:underline">
                {facture.numero ?? "brouillon de facture"}
              </Link>
              .
            </>
          )}
        </p>
      )}

      {manquantes.length > 0 && (
        <div className="rounded-md border border-compta-accent/40 bg-compta-accent/5 px-3 py-2 text-sm">
          <p className="font-medium">Mentions à compléter :</p>
          <p>{manquantes.map((m) => m.libelle).join(" ; ")}.</p>
          <p className="text-xs text-compta-text-muted">
            Vendeur :{" "}
            <Link href={`/${entiteId}/facturation/parametres`} className="text-compta-accent hover:underline">
              paramètres de facturation
            </Link>
            {client && (
              <>
                {" "}
                · client :{" "}
                <Link href={`/${entiteId}/clients/${client.id}`} className="text-compta-accent hover:underline">
                  fiche client
                </Link>
              </>
            )}
            .
          </p>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="font-semibold">Lignes</h3>
        <LignesFacturation
          entiteId={entiteId}
          type="devis"
          documentId={devis.id}
          modifiable={modifiable}
          lignes={vueLignes(lignes)}
          totaux={vueTotaux(calculerTotaux(lignes))}
          tauxParDefaut={sansTva ? "0" : ""}
          sansTva={sansTva}
        />
      </div>

      {devis.notes && <p className="whitespace-pre-line text-sm">{devis.notes}</p>}

      {ecriture ? (
        <div className="space-y-2">
          <h3 className="font-semibold">Actions</h3>
          <ActionsDevis
            entiteId={entiteId}
            devisId={devis.id}
            statut={devis.statut}
            expire={statut === "expire"}
            dejaFacture={devis.facture_id !== null}
            aujourdHui={aujourdHui}
          />
        </div>
      ) : (
        <p className="text-sm text-compta-text-muted">{MESSAGE_LECTURE_SEULE}</p>
      )}

      {modifiable && (
        <div className="space-y-2">
          <h3 className="font-semibold">En-tête du devis</h3>
          <FormulaireDevis entiteId={entiteId} devis={devis} clients={clients.map((c) => ({ id: c.id, nom: c.nom }))} aujourdHui={aujourdHui} />
        </div>
      )}
    </section>
  );
}
