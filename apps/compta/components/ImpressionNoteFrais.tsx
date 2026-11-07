"use client";

/**
 * Note de frais imprimable, à faire signer (07/11/2026). Composant CLIENT
 * uniquement pour le bouton « Imprimer » (window.print). Aucun calcul ici :
 * la page serveur passe des données déjà prêtes.
 *
 * [07/11/2026] Même principe que DossierAg : le menu et l'en-tête viennent du
 * layout (non modifié par ce module), on les masque à l'impression par CSS,
 * via :has() sur le conteneur direct de la note. Format A4.
 */
import Link from "next/link";
import { formaterCentimes } from "@/lib/services/montants";

const CSS_IMPRESSION = `
@page { size: A4; margin: 1.6cm 1.5cm; }
@media print {
  nav, .ndf-ecran { display: none !important; }
  div:has(> .ndf-impression) > header { display: none !important; }
  div:has(> .ndf-impression) { max-width: none !important; margin: 0 !important; padding: 0 !important; }
  html, body { background: #fff !important; }
  .ndf-impression { font-size: 10.5pt; color: #000; }
  .ndf-papier { border: none !important; box-shadow: none !important; padding: 0 !important; }
  .ndf-impression table { width: 100%; border-collapse: collapse; }
  .ndf-impression thead { display: table-header-group; }
  .ndf-impression tr, .ndf-bloc { break-inside: avoid; page-break-inside: avoid; }
}
`;

export interface DonneesImpression {
  structure: string;
  numero: string;
  statut: string;
  beneficiaire: string;
  objet: string;
  date: string;
  commentaire: string | null;
  lignes: { date: string; libelle: string; categorie: string; nature: string; montantCentimes: number }[];
  trajets: { date: string; trajet: string; motif: string; distance: string; allerRetour: boolean; taux: string; montantCentimes: number }[];
  totalCentimes: number;
  reglement: string | null;
}

const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const th = "border-b border-black/40 px-2 py-1 text-left text-xs font-semibold uppercase";
const td = "border-b border-black/20 px-2 py-1 align-top";

export function ImpressionNoteFrais({ d, retour }: { d: DonneesImpression; retour: string }) {
  return (
    <div className="ndf-impression space-y-4">
      <style>{CSS_IMPRESSION}</style>
      <div className="ndf-ecran flex items-center justify-between gap-3">
        <Link href={retour} className="text-sm text-compta-text-muted hover:text-compta-accent">
          ← Retour à la note
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white hover:bg-compta-accent-hover"
        >
          Imprimer ou enregistrer en PDF
        </button>
      </div>

      <div className="ndf-papier space-y-5 rounded-lg border border-compta-border bg-white p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm">{d.structure}</p>
            <h2 className="text-xl font-bold">Note de frais {d.numero}</h2>
            <p className="text-sm">Statut : {d.statut}</p>
          </div>
          <div className="text-right text-sm">
            <p>Date : {dateFr(d.date)}</p>
          </div>
        </div>

        <div className="ndf-bloc grid grid-cols-2 gap-2 text-sm">
          <p>
            <span className="font-semibold">Bénéficiaire :</span> {d.beneficiaire}
          </p>
          <p>
            <span className="font-semibold">Objet :</span> {d.objet}
          </p>
          {d.commentaire && <p className="col-span-2">{d.commentaire}</p>}
        </div>

        <table className="text-sm">
          <thead>
            <tr>
              <th className={th}>Date</th>
              <th className={th}>Dépense</th>
              <th className={th}>Catégorie</th>
              <th className={`${th} text-right`}>Montant TTC</th>
            </tr>
          </thead>
          <tbody>
            {d.lignes.map((l, i) => (
              <tr key={i}>
                <td className={`${td} whitespace-nowrap`}>{dateFr(l.date)}</td>
                <td className={td}>
                  {l.libelle}
                  <span className="block text-xs">{l.nature}</span>
                </td>
                <td className={td}>{l.categorie}</td>
                <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{formaterCentimes(l.montantCentimes)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} className="px-2 py-2 text-right font-semibold">
                Total à rembourser
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-right font-bold tabular-nums">{formaterCentimes(d.totalCentimes)}</td>
            </tr>
          </tbody>
        </table>

        {d.trajets.length > 0 && (
          <div className="ndf-bloc space-y-1">
            <p className="text-sm font-semibold">Détail des indemnités kilométriques</p>
            <table className="text-xs">
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Trajet</th>
                  <th className={th}>Motif</th>
                  <th className={`${th} text-right`}>Km réels</th>
                  <th className={`${th} text-right`}>Taux (€/km)</th>
                  <th className={`${th} text-right`}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {d.trajets.map((t, i) => (
                  <tr key={i}>
                    <td className={td}>{dateFr(t.date)}</td>
                    <td className={td}>
                      {t.trajet}
                      {t.allerRetour ? " (aller-retour)" : ""}
                    </td>
                    <td className={td}>{t.motif}</td>
                    <td className={`${td} text-right tabular-nums`}>{t.distance}</td>
                    <td className={`${td} text-right tabular-nums`}>{t.taux}</td>
                    <td className={`${td} text-right tabular-nums`}>{formaterCentimes(t.montantCentimes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs">
              Distance saisie : kilomètres réellement parcourus, retour compris s&apos;il a été fait. Taux fixé par
              l&apos;association. Montant arrondi au centime pour chaque trajet.
            </p>
          </div>
        )}

        {d.reglement && <p className="ndf-bloc text-sm">{d.reglement}</p>}

        <div className="ndf-bloc grid grid-cols-2 gap-8 pt-6 text-sm">
          <div className="space-y-1">
            <p className="font-semibold">Le bénéficiaire</p>
            <p className="text-xs">Je certifie l&apos;exactitude des dépenses ci-dessus, avancées pour l&apos;association.</p>
            <p className="pt-2 text-xs">Date et signature :</p>
            <div className="h-20 border-b border-black/40" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold">Pour l&apos;association (trésorier ou président)</p>
            <p className="text-xs">Vérifié et approuvé.</p>
            <p className="pt-2 text-xs">Date et signature :</p>
            <div className="h-20 border-b border-black/40" />
          </div>
        </div>

        <div className="ndf-bloc space-y-1 border-t border-black/20 pt-3 text-xs">
          <p className="font-semibold">Renonciation au remboursement (à remplir seulement en cas d&apos;abandon)</p>
          <p>
            Je soussigné(e) {d.beneficiaire} renonce au remboursement des frais ci-dessus, d&apos;un montant de{" "}
            {formaterCentimes(d.totalCentimes)}, et les abandonne à l&apos;association à titre de don.
          </p>
          <p className="pt-2">Date et signature :</p>
          <div className="h-14 border-b border-black/40" />
        </div>
      </div>
    </div>
  );
}
