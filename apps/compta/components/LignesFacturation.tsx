"use client";

/**
 * Lignes d'un devis, d'une facture ou d'un avoir (09/11/2026) : tableau,
 * totaux par taux, ajout et retrait. Les totaux sont calculés par la page
 * serveur (service pur calculerTotaux) et simplement affichés ici. Le
 * serveur revalide chaque ligne (quantité en millièmes, prix en centimes,
 * taux 0 imposé en franchise) et la base vérifie le montant HT.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formaterCentimes } from "@/lib/services/montants";
import { ajouterLigneDevisAction, supprimerLigneDevisAction } from "@/app/[entiteId]/devis/actions";
import { ajouterLigneFactureAction, supprimerLigneFactureAction } from "@/app/[entiteId]/factures/actions";
import { BOUTON, CHAMP, ETIQUETTE } from "@/components/FormulaireNoteFrais";

export interface VueLigneDocument {
  id: string;
  designation: string;
  quantite: string; // déjà formatée (« 1,5 »)
  unite: string | null;
  prixUnitaireCentimes: number;
  taux: string; // déjà formaté (« 20 % »)
  montantHtCentimes: number;
}

export interface VueTotaux {
  parTaux: { taux: string; baseHtCentimes: number; tvaCentimes: number }[];
  totalHtCentimes: number;
  totalTvaCentimes: number;
  totalTtcCentimes: number;
}

export function LignesFacturation({
  entiteId,
  type,
  documentId,
  modifiable,
  lignes,
  totaux,
  tauxParDefaut,
  sansTva,
}: {
  entiteId: string;
  type: "devis" | "facture";
  documentId: string;
  modifiable: boolean;
  lignes: VueLigneDocument[];
  totaux: VueTotaux;
  /** « 0 » en franchise ; vide sinon (aucun taux n'est deviné). */
  tauxParDefaut: string;
  /** Régime sans TVA : le champ taux est figé à 0. */
  sansTva: boolean;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const vide = { designation: "", quantite: "1", unite: "", prixUnitaire: "", taux: tauxParDefaut };
  const [f, setF] = useState(vide);
  const maj = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  const lancer = (fn: () => Promise<{ success: boolean; error?: string }>, apres?: () => void) => {
    setErreur(null);
    demarrer(async () => {
      const r = await fn();
      if (!r.success) setErreur(r.error ?? "Action impossible.");
      else apres?.();
      router.refresh();
    });
  };

  const th = "px-3 py-2 font-medium";
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-compta-border">
        <table className="w-full text-sm">
          <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
            <tr>
              <th className={th}>Désignation</th>
              <th className={`${th} text-right`}>Quantité</th>
              <th className={`${th} text-right`}>Prix unitaire HT</th>
              <th className={`${th} text-right`}>TVA</th>
              <th className={`${th} text-right`}>Montant HT</th>
              {modifiable && <th className={th} />}
            </tr>
          </thead>
          <tbody className="divide-y divide-compta-border bg-compta-surface">
            {lignes.length === 0 && (
              <tr>
                <td colSpan={modifiable ? 6 : 5} className="px-3 py-4 text-center text-compta-text-muted">
                  Aucune ligne pour l&apos;instant.
                </td>
              </tr>
            )}
            {lignes.map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-2">{l.designation}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {l.quantite}
                  {l.unite ? ` ${l.unite}` : ""}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formaterCentimes(l.prixUnitaireCentimes)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{l.taux}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formaterCentimes(l.montantHtCentimes)}</td>
                {modifiable && (
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={enCours}
                      onClick={() =>
                        lancer(() => (type === "devis" ? supprimerLigneDevisAction(entiteId, l.id) : supprimerLigneFactureAction(entiteId, l.id)))
                      }
                      className="text-xs text-compta-depense underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      Retirer
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-compta-bg text-sm">
            {totaux.parTaux.map((t) => (
              <tr key={t.taux}>
                <td colSpan={4} className="px-3 py-1 text-right text-compta-text-muted">
                  TVA {t.taux} sur {formaterCentimes(t.baseHtCentimes)} HT
                </td>
                <td className="whitespace-nowrap px-3 py-1 text-right tabular-nums">{formaterCentimes(t.tvaCentimes)}</td>
                {modifiable && <td />}
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="px-3 py-1 text-right">
                Total HT
              </td>
              <td className="whitespace-nowrap px-3 py-1 text-right tabular-nums">{formaterCentimes(totaux.totalHtCentimes)}</td>
              {modifiable && <td />}
            </tr>
            <tr>
              <td colSpan={4} className="px-3 py-1 text-right">
                Total TVA
              </td>
              <td className="whitespace-nowrap px-3 py-1 text-right tabular-nums">{formaterCentimes(totaux.totalTvaCentimes)}</td>
              {modifiable && <td />}
            </tr>
            <tr className="font-semibold">
              <td colSpan={4} className="px-3 py-2 text-right">
                Total TTC
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formaterCentimes(totaux.totalTtcCentimes)}</td>
              {modifiable && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {modifiable && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lancer(
              () => (type === "devis" ? ajouterLigneDevisAction(entiteId, documentId, f) : ajouterLigneFactureAction(entiteId, documentId, f)),
              () => setF(vide),
            );
          }}
          className="grid grid-cols-2 gap-2 rounded-lg border border-compta-border bg-compta-surface p-3 sm:grid-cols-6"
        >
          <label className={`${ETIQUETTE} col-span-2`}>
            Désignation
            <input value={f.designation} onChange={maj("designation")} required maxLength={500} className={CHAMP} />
          </label>
          <label className={ETIQUETTE}>
            Quantité
            <input value={f.quantite} onChange={maj("quantite")} required inputMode="decimal" className={CHAMP} />
          </label>
          <label className={ETIQUETTE}>
            Unité
            <input value={f.unite} onChange={maj("unite")} maxLength={30} placeholder="heure, jour…" className={CHAMP} />
          </label>
          <label className={ETIQUETTE}>
            Prix unitaire HT (€)
            <input value={f.prixUnitaire} onChange={maj("prixUnitaire")} required inputMode="decimal" className={CHAMP} />
          </label>
          <label className={ETIQUETTE}>
            Taux de TVA (%)
            <input value={f.taux} onChange={maj("taux")} required readOnly={sansTva} inputMode="decimal" placeholder="20, 5,5 ou 0" className={CHAMP} />
          </label>
          <div className="col-span-2 flex items-center gap-3 sm:col-span-6">
            <button type="submit" disabled={enCours} className={BOUTON}>
              Ajouter la ligne
            </button>
            {sansTva && <span className="text-xs text-compta-text-muted">Régime sans TVA : taux de 0 sur chaque ligne.</span>}
          </div>
        </form>
      )}
      {erreur && <p className="text-sm text-compta-depense">{erreur}</p>}
    </div>
  );
}
