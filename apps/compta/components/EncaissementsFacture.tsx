"use client";

/**
 * Encaissements d'une facture émise (09/11/2026). On RATTACHE une recette
 * réelle déjà en compta (importée du relevé ou saisie), avec le montant
 * affecté ; on ne crée jamais de paiement. Option : proposer la catégorie
 * « Ventes et prestations » à une opération pas encore classée.
 * Le serveur et la base refusent tout dépassement.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formaterCentimes } from "@/lib/services/montants";
import { rattacherEncaissementAction, retirerEncaissementAction } from "@/app/[entiteId]/factures/actions";
import { BOUTON, CHAMP, ETIQUETTE } from "@/components/FormulaireNoteFrais";

export interface VueEncaissement {
  id: string;
  date: string;
  libelle: string;
  montantCentimes: number;
}

export interface VueRecette {
  id: string;
  date: string;
  libelle: string;
  resteCentimes: number;
  sansCategorie: boolean;
}

const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function EncaissementsFacture({
  entiteId,
  factureId,
  encaissements,
  recettes,
  resteCentimes,
  lectureSeule,
  categorieVentesExiste,
}: {
  entiteId: string;
  factureId: string;
  encaissements: VueEncaissement[];
  recettes: VueRecette[];
  resteCentimes: number;
  lectureSeule: boolean;
  categorieVentesExiste: boolean;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [operationId, setOperationId] = useState("");
  const [montant, setMontant] = useState("");
  const [classer, setClasser] = useState(true);
  const choisie = recettes.find((r) => r.id === operationId);

  const lancer = (fn: () => Promise<{ success: boolean; error?: string }>, question?: string) => {
    if (question && !window.confirm(question)) return;
    setErreur(null);
    demarrer(async () => {
      const r = await fn();
      if (!r.success) setErreur(r.error ?? "Action impossible.");
      else {
        setOperationId("");
        setMontant("");
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-compta-border bg-compta-surface p-4">
      {encaissements.length === 0 ? (
        <p className="text-sm text-compta-text-muted">Aucun encaissement rattaché.</p>
      ) : (
        <ul className="divide-y divide-compta-border text-sm">
          {encaissements.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-1">
              <span>
                {dateFr(e.date)} · {e.libelle}
              </span>
              <span className="flex items-center gap-3">
                <span className="tabular-nums">{formaterCentimes(e.montantCentimes)}</span>
                {!lectureSeule && (
                  <button
                    type="button"
                    disabled={enCours}
                    onClick={() => lancer(() => retirerEncaissementAction(entiteId, e.id), "Retirer ce rattachement ? L'opération reste en compta.")}
                    className="text-xs text-compta-depense underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    Retirer
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!lectureSeule && resteCentimes > 0 && (
        <div className="space-y-2 border-t border-compta-border pt-3">
          <p className="text-sm font-medium">Rattacher une recette du relevé</p>
          {recettes.length === 0 ? (
            <p className="text-sm text-compta-accent">
              Aucune recette disponible. Importe d&apos;abord le relevé qui contient le paiement, ou saisis l&apos;opération : la facture
              n&apos;est jamais une recette en elle-même.
            </p>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <label className={`${ETIQUETTE} min-w-[18rem] flex-1`}>
                Opération
                <select value={operationId} onChange={(e) => setOperationId(e.target.value)} className={CHAMP}>
                  <option value="">Choisis la recette</option>
                  {recettes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.resteCentimes === resteCentimes ? "Montant égal · " : ""}
                      {dateFr(r.date)} · {r.libelle} · reste {formaterCentimes(r.resteCentimes)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={ETIQUETTE}>
                Montant affecté (€, vide = maximum)
                <input value={montant} onChange={(e) => setMontant(e.target.value)} inputMode="decimal" className={CHAMP} />
              </label>
              <button
                type="button"
                disabled={enCours || !operationId}
                className={BOUTON}
                onClick={() => lancer(() => rattacherEncaissementAction(entiteId, factureId, operationId, montant, classer && categorieVentesExiste))}
              >
                Rattacher
              </button>
            </div>
          )}
          {categorieVentesExiste && choisie?.sansCategorie && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={classer} onChange={(e) => setClasser(e.target.checked)} />
              Classer cette opération en « Ventes et prestations » (elle n&apos;a pas encore de catégorie)
            </label>
          )}
        </div>
      )}
      {erreur && <p className="text-sm text-compta-depense">{erreur}</p>}
    </div>
  );
}
