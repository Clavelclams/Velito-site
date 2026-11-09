"use client";

/**
 * Devis, facture ou avoir imprimable en A4 (09/11/2026). Composant CLIENT
 * uniquement pour le bouton « Imprimer » (window.print). Aucun calcul ici :
 * la page serveur passe des données déjà prêtes, totaux compris.
 *
 * [09/11/2026] Même technique que ImpressionNoteFrais : le menu et l'en-tête
 * du layout (non modifié) sont masqués à l'impression par CSS, via :has() sur
 * le conteneur direct. Une mention obligatoire absente s'imprime « à
 * compléter » : rien n'est inventé. Ton neutre sur le document.
 */
import Link from "next/link";
import { formaterCentimes } from "@/lib/services/montants";
import type { VueLigneDocument, VueTotaux } from "@/components/LignesFacturation";
import type { ChampImpression } from "@/lib/services/facturation";

const CSS_IMPRESSION = `
@page { size: A4; margin: 1.5cm 1.5cm; }
@media print {
  nav, .fac-ecran { display: none !important; }
  div:has(> .fac-impression) > header { display: none !important; }
  div:has(> .fac-impression) { max-width: none !important; margin: 0 !important; padding: 0 !important; }
  html, body { background: #fff !important; }
  .fac-impression { font-size: 10pt; color: #000; }
  .fac-papier { border: none !important; box-shadow: none !important; padding: 0 !important; }
  .fac-impression table { width: 100%; border-collapse: collapse; }
  .fac-impression thead { display: table-header-group; }
  .fac-impression tr, .fac-bloc { break-inside: avoid; page-break-inside: avoid; }
}
`;


export interface DonneesImpressionFacturation {
  titre: "Devis" | "Facture" | "Avoir";
  numero: string | null;
  brouillon: boolean;
  vendeurNom: string | null;
  vendeur: ChampImpression[];
  acheteurNom: string | null;
  acheteur: ChampImpression[];
  infos: ChampImpression[];
  reference: string | null;
  lignes: VueLigneDocument[];
  totaux: VueTotaux;
  mentionTva: ChampImpression | null;
  paiement: ChampImpression[];
  notes: string | null;
  /** Devis seulement : zone « Bon pour accord ». */
  accord: { date: string | null; signataire: string | null } | null;
  aCompleter: string[];
}

const th = "border-b border-black/40 px-2 py-1 text-left text-xs font-semibold uppercase";
const td = "border-b border-black/20 px-2 py-1 align-top";

function Valeur({ c }: { c: ChampImpression }) {
  if (c.valeur) return <span className="whitespace-pre-line">{c.valeur}</span>;
  return <span className="italic text-compta-depense">à compléter</span>;
}

function Lignes({ champs }: { champs: ChampImpression[] }) {
  return (
    <>
      {champs
        .filter((c) => c.valeur || c.requis)
        .map((c) => (
          <p key={c.libelle}>
            {c.libelle ? <span className="font-semibold">{c.libelle} : </span> : null}
            <Valeur c={c} />
          </p>
        ))}
    </>
  );
}

export function ImpressionFacturation({ d, retour }: { d: DonneesImpressionFacturation; retour: string }) {
  return (
    <div className="fac-impression space-y-4">
      <style>{CSS_IMPRESSION}</style>
      <div className="fac-ecran flex items-center justify-between gap-3">
        <Link href={retour} className="text-sm text-compta-text-muted hover:text-compta-accent">
          ← Retour au document
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white hover:bg-compta-accent-hover"
        >
          Imprimer ou enregistrer en PDF
        </button>
      </div>
      {d.aCompleter.length > 0 && (
        <div className="fac-ecran rounded-md border border-compta-depense/40 bg-compta-depense/5 px-3 py-2 text-sm">
          <p className="font-medium">Mentions à compléter avant l&apos;émission :</p>
          <p>{d.aCompleter.join(" ; ")}.</p>
        </div>
      )}

      <div className="fac-papier space-y-5 rounded-lg border border-compta-border bg-white p-8">
        {d.brouillon && (
          <p className="fac-bloc border border-black/40 px-2 py-1 text-center text-xs font-semibold uppercase">
            {d.titre === "Devis" ? "Brouillon de devis" : `Brouillon : document sans numéro, sans valeur de ${d.titre.toLowerCase()}`}
          </p>
        )}

        <div className="fac-bloc flex items-start justify-between gap-6">
          <div className="space-y-0.5 text-sm">
            <p className="text-base font-bold">{d.vendeurNom ?? <span className="italic text-compta-depense">Dénomination à compléter</span>}</p>
            <Lignes champs={d.vendeur} />
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">
              {d.titre} {d.numero ?? ""}
            </h2>
            {d.reference && <p className="text-sm">{d.reference}</p>}
          </div>
        </div>

        <div className="fac-bloc grid grid-cols-2 gap-6 text-sm">
          <div className="space-y-0.5">
            <Lignes champs={d.infos} />
          </div>
          <div className="space-y-0.5 rounded border border-black/30 p-3">
            <p className="text-xs font-semibold uppercase">Client</p>
            <p className="font-semibold">{d.acheteurNom ?? <span className="italic text-compta-depense">à compléter</span>}</p>
            <Lignes champs={d.acheteur} />
          </div>
        </div>

        <table className="text-sm">
          <thead>
            <tr>
              <th className={th}>Désignation</th>
              <th className={`${th} text-right`}>Quantité</th>
              <th className={`${th} text-right`}>Prix unitaire HT</th>
              <th className={`${th} text-right`}>TVA</th>
              <th className={`${th} text-right`}>Montant HT</th>
            </tr>
          </thead>
          <tbody>
            {d.lignes.map((l) => (
              <tr key={l.id}>
                <td className={td}>{l.designation}</td>
                <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                  {l.quantite}
                  {l.unite ? ` ${l.unite}` : ""}
                </td>
                <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{formaterCentimes(l.prixUnitaireCentimes)}</td>
                <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{l.taux}</td>
                <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{formaterCentimes(l.montantHtCentimes)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="fac-bloc ml-auto w-full max-w-sm space-y-0.5 text-sm">
          <p className="flex justify-between">
            <span>Total HT</span>
            <span className="tabular-nums">{formaterCentimes(d.totaux.totalHtCentimes)}</span>
          </p>
          {d.totaux.parTaux.map((t) => (
            <p key={t.taux} className="flex justify-between">
              <span>
                TVA {t.taux} sur {formaterCentimes(t.baseHtCentimes)}
              </span>
              <span className="tabular-nums">{formaterCentimes(t.tvaCentimes)}</span>
            </p>
          ))}
          <p className="flex justify-between border-t border-black/40 pt-1 text-base font-bold">
            <span>{d.titre === "Avoir" ? "Total TTC de l'avoir" : "Total TTC"}</span>
            <span className="tabular-nums">{formaterCentimes(d.totaux.totalTtcCentimes)}</span>
          </p>
        </div>

        {d.mentionTva && (
          <p className="fac-bloc text-sm">
            <Valeur c={d.mentionTva} />
          </p>
        )}

        {d.paiement.some((c) => c.valeur || c.requis) && (
          <div className="fac-bloc space-y-0.5 text-xs">
            <Lignes champs={d.paiement} />
          </div>
        )}

        {d.notes && <p className="fac-bloc whitespace-pre-line text-sm">{d.notes}</p>}

        {d.accord && (
          <div className="fac-bloc grid grid-cols-2 gap-8 pt-4 text-sm">
            <div />
            <div className="space-y-1">
              <p className="font-semibold">Bon pour accord</p>
              <p className="text-xs">Date, nom et signature du client, précédés de la mention manuscrite « Bon pour accord ».</p>
              {d.accord.date && (
                <p className="text-xs">
                  Accepté le {d.accord.date}
                  {d.accord.signataire ? ` par ${d.accord.signataire}` : ""}.
                </p>
              )}
              <div className="h-20 border-b border-black/40" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
