/**
 * Fiche d'une facture ou d'un avoir : Server Component (09/11/2026).
 *
 * Brouillon : mentions à compléter, lignes modifiables, en-tête, Émettre.
 * Émis : document figé (instantanés vendeur et acheteur), encaissements
 * rattachés (facture), avoirs liés, export JSON des données structurées,
 * Préparer un avoir ou une correction. Lecture seule : ni formulaire ni
 * bouton d'écriture.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { peutEcrire } from "@/lib/droits";
import { MESSAGE_LECTURE_SEULE } from "@/lib/services/droits";
import { getEntite } from "@/lib/repositories/entites";
import { listerCategories } from "@/lib/repositories/categories";
import {
  getClient,
  getFacture,
  getParametres,
  listerClients,
  listerDevis,
  listerFactures,
  listerLignesFacture,
  listerPaiementsEntite,
  listerRecettes,
  listerTransactionsParIds,
} from "@/lib/repositories/facturation";
import { formaterCentimes } from "@/lib/services/montants";
import {
  affecteParOperation,
  ajouterJours,
  avoirsParFacture,
  candidatesEncaissement,
  categorieVentes,
  controlerEmission,
  derniereDateEmise,
  LIBELLES_NATURE,
  LIBELLES_STATUT_FACTURE,
  mentionsManquantes,
  regimeSansTva,
  resteAEncaisser,
  statutFacture,
  totauxFacture,
  vueLignes,
  vueTotaux,
} from "@/lib/services/facturation";
import { FormulaireFacture } from "@/components/FormulaireFacture";
import { LignesFacturation } from "@/components/LignesFacturation";
import { ActionsFacture } from "@/components/ActionsFacture";
import { EncaissementsFacture } from "@/components/EncaissementsFacture";

const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export default async function FactureFichePage({ params }: { params: Promise<{ entiteId: string; id: string }> }) {
  const { entiteId, id } = await params;
  const supabase = await createClient();
  const f = await getFacture(supabase, id);
  if (!f || f.entite_id !== entiteId) notFound();

  const [lignes, client, clients, parametres, entite, toutes, paiements, devis, ecriture] = await Promise.all([
    listerLignesFacture(supabase, id),
    getClient(supabase, f.client_id),
    listerClients(supabase, entiteId),
    getParametres(supabase, entiteId),
    getEntite(supabase, entiteId),
    listerFactures(supabase, entiteId),
    listerPaiementsEntite(supabase, entiteId),
    listerDevis(supabase, entiteId),
    peutEcrire(supabase, entiteId),
  ]);
  const typeJuridique = entite?.type_juridique ?? "association";
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const brouillon = f.statut === "brouillon";
  const avoir = f.sens === "avoir";
  const doc = avoir ? "Avoir" : "Facture";
  const modifiable = brouillon && ecriture;
  const totaux = totauxFacture(f, lignes);

  const sesPaiements = paiements.filter((p) => p.facture_id === f.id);
  const encaisse = sesPaiements.reduce((s, p) => s + Number(p.montant_centimes), 0);
  const avoirs = avoirsParFacture(toutes).get(f.id) ?? 0;
  const statut = statutFacture(f, encaisse, avoirs);
  const reste = resteAEncaisser(f, encaisse, avoirs);

  const origine = f.facture_origine_id ? toutes.find((x) => x.id === f.facture_origine_id) : undefined;
  const corrigee = f.correction_de ? toutes.find((x) => x.id === f.correction_de) : undefined;
  const avoirsLies = toutes.filter((x) => x.sens === "avoir" && x.facture_origine_id === f.id);
  const remplacantes = toutes.filter((x) => x.correction_de === f.id);
  const devisSource = devis.find((d) => d.facture_id === f.id);

  // Brouillon : contrôle des mentions sur les fiches ACTUELLES (l'émission en prendra l'instantané).
  const manquantes = brouillon ? mentionsManquantes({ type: f.sens, ...f }, lignes, parametres, client, typeJuridique) : [];
  const refusEmission = brouillon ? controlerEmission(f, lignes, parametres, client, typeJuridique, aujourdHui, derniereDateEmise(toutes, f.sens)) : [];
  const sansTva = regimeSansTva(brouillon ? parametres?.regime_tva : f.vendeur?.regime_tva);

  // Encaissements : opérations rattachées, et recettes candidates (un an avant l'émission : acomptes compris).
  const opsRattachees = await listerTransactionsParIds(supabase, entiteId, sesPaiements.map((p) => p.transaction_id));
  const opParId = new Map(opsRattachees.map((t) => [t.id, t]));
  let recettes: { id: string; date: string; libelle: string; resteCentimes: number; sansCategorie: boolean }[] = [];
  let ventesExiste = false;
  if (!brouillon && !avoir && ecriture && reste > 0) {
    const [candidates, categories] = await Promise.all([
      listerRecettes(supabase, entiteId, ajouterJours(f.date_emission as string, -365)),
      listerCategories(supabase, entiteId),
    ]);
    ventesExiste = categorieVentes(categories) !== null;
    recettes = candidatesEncaissement(candidates, affecteParOperation(paiements), reste)
      .slice(0, 300)
      .map((t) => ({ id: t.id, date: t.date_transaction, libelle: t.libelle, resteCentimes: t.resteCentimes, sansCategorie: !t.categorie_id }));
  }

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            {doc} {f.numero ?? "en brouillon"} · {client?.nom ?? ""}
          </h2>
          <p className="text-sm text-compta-text-muted">
            {f.objet ? `${f.objet} · ` : ""}
            {f.date_emission ? `${brouillon ? "émission prévue le" : "émise le"} ${dateFr(f.date_emission)} · ` : ""}
            <span className="font-medium text-compta-text">{LIBELLES_STATUT_FACTURE[statut]}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          <Link href={`/${entiteId}/factures`} className="text-compta-text-muted hover:text-compta-accent">
            ← Factures
          </Link>
          <Link href={`/${entiteId}/factures/${f.id}/impression`} className="text-compta-text-muted hover:text-compta-accent">
            Version imprimable
          </Link>
          {!brouillon && (
            <a href={`/${entiteId}/factures/${f.id}/json`} className="text-compta-text-muted hover:text-compta-accent">
              Données structurées (JSON)
            </a>
          )}
        </div>
      </div>

      <p className="rounded-md bg-compta-accent/10 px-3 py-2 text-sm">
        {brouillon
          ? `Brouillon : modifiable et supprimable, sans numéro. Le numéro légal est attribué par la base au moment de l'émission.`
          : `${doc} émis${avoir ? "" : "e"} : ${avoir ? "il" : "elle"} ne se modifie plus et ne se supprime pas. Vendeur et client sont figés tels qu'au jour de l'émission.`}
      </p>

      {origine && (
        <p className="text-sm">
          Avoir sur la facture{" "}
          <Link href={`/${entiteId}/factures/${origine.id}`} className="font-medium text-compta-accent hover:underline">
            {origine.numero}
          </Link>
          {origine.date_emission ? ` du ${dateFr(origine.date_emission)}` : ""}. Les montants sont positifs : c&apos;est le sens « avoir » qui
          les retranche.
        </p>
      )}
      {corrigee && (
        <p className="text-sm">
          Cette facture remplace{" "}
          <Link href={`/${entiteId}/factures/${corrigee.id}`} className="font-medium text-compta-accent hover:underline">
            {corrigee.numero}
          </Link>
          . Émets d&apos;abord l&apos;avoir qui l&apos;annule.
        </p>
      )}
      {devisSource && (
        <p className="text-sm">
          D&apos;après le devis{" "}
          <Link href={`/${entiteId}/devis/${devisSource.id}`} className="font-medium text-compta-accent hover:underline">
            {devisSource.numero}
          </Link>
          .
        </p>
      )}
      {(avoirsLies.length > 0 || remplacantes.length > 0) && (
        <p className="text-sm">
          Documents liés :{" "}
          {[...avoirsLies, ...remplacantes].map((x, i) => (
            <span key={x.id}>
              {i > 0 && ", "}
              <Link href={`/${entiteId}/factures/${x.id}`} className="font-medium text-compta-accent hover:underline">
                {x.numero ?? (x.sens === "avoir" ? "avoir en brouillon" : "facture en brouillon")}
              </Link>
            </span>
          ))}
          .
        </p>
      )}

      {manquantes.length > 0 && (
        <div className="rounded-md border border-compta-accent/40 bg-compta-accent/5 px-3 py-2 text-sm">
          <p className="font-medium">Mentions à compléter avant l&apos;émission :</p>
          <p>{manquantes.map((m) => m.libelle + (m.bloquante ? "" : " (conseillé)")).join(" ; ")}.</p>
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
            )}{" "}
            · document : en-tête ci-dessous.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-compta-border bg-compta-surface p-3">
          <p className="text-xs text-compta-text-muted">Total TTC</p>
          <p className="text-lg font-semibold tabular-nums">{formaterCentimes(totaux.totalTtcCentimes)}</p>
        </div>
        {!avoir && !brouillon && (
          <>
            <div className="rounded-lg border border-compta-border bg-compta-surface p-3">
              <p className="text-xs text-compta-text-muted">Encaissé</p>
              <p className="text-lg font-semibold tabular-nums">{formaterCentimes(encaisse)}</p>
            </div>
            <div className="rounded-lg border border-compta-border bg-compta-surface p-3">
              <p className="text-xs text-compta-text-muted">Avoirs émis</p>
              <p className="text-lg font-semibold tabular-nums">{formaterCentimes(avoirs)}</p>
            </div>
            <div className="rounded-lg border border-compta-border bg-compta-surface p-3">
              <p className="text-xs text-compta-text-muted">Reste à encaisser</p>
              <p className="text-lg font-semibold tabular-nums">{formaterCentimes(reste)}</p>
            </div>
          </>
        )}
      </div>

      {!brouillon && (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="inline font-medium">Prestation ou livraison : </dt>
            <dd className="inline">{f.date_prestation ? dateFr(f.date_prestation) : "à compléter"}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Nature : </dt>
            <dd className="inline">{f.nature_operation ? LIBELLES_NATURE[f.nature_operation] : "à compléter"}</dd>
          </div>
          {!avoir && (
            <div>
              <dt className="inline font-medium">Échéance : </dt>
              <dd className="inline">{f.date_echeance ? dateFr(f.date_echeance) : "à compléter"}</dd>
            </div>
          )}
          {f.tva_sur_debits && <div>Option pour le paiement de la TVA d&apos;après les débits.</div>}
        </dl>
      )}

      <div className="space-y-2">
        <h3 className="font-semibold">Lignes</h3>
        <LignesFacturation
          entiteId={entiteId}
          type="facture"
          documentId={f.id}
          modifiable={modifiable}
          lignes={vueLignes(lignes)}
          totaux={vueTotaux(totaux)}
          tauxParDefaut={sansTva ? "0" : ""}
          sansTva={sansTva}
        />
      </div>

      {!brouillon && !avoir && (
        <div className="space-y-2">
          <h3 className="font-semibold">Encaissements</h3>
          <EncaissementsFacture
            entiteId={entiteId}
            factureId={f.id}
            encaissements={sesPaiements.map((p) => {
              const t = opParId.get(p.transaction_id);
              return { id: p.id, date: t?.date_transaction ?? "", libelle: t?.libelle ?? "Opération", montantCentimes: Number(p.montant_centimes) };
            })}
            recettes={recettes}
            resteCentimes={reste}
            lectureSeule={!ecriture}
            categorieVentesExiste={ventesExiste}
          />
        </div>
      )}

      {ecriture ? (
        <div className="space-y-2">
          <h3 className="font-semibold">Actions</h3>
          <ActionsFacture
            entiteId={entiteId}
            factureId={f.id}
            sens={f.sens}
            statut={f.statut}
            emissionBloquee={refusEmission.length > 0}
            peutAvoir={!avoirsLies.some((x) => x.statut === "brouillon") && avoirs < totaux.totalTtcCentimes}
            peutCorriger={avoirsLies.length === 0}
          />
          {brouillon && refusEmission.length > 0 && <p className="text-xs text-compta-depense">{refusEmission.join(" ")}</p>}
        </div>
      ) : (
        <p className="text-sm text-compta-text-muted">{MESSAGE_LECTURE_SEULE}</p>
      )}

      {modifiable && (
        <div className="space-y-2">
          <h3 className="font-semibold">En-tête du brouillon</h3>
          <FormulaireFacture entiteId={entiteId} facture={f} clients={clients.map((c) => ({ id: c.id, nom: c.nom }))} />
        </div>
      )}
    </section>
  );
}
