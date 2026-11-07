"use client";

/**
 * Lignes d'une note de frais (07/11/2026) : tableau, catégorie, retrait, et
 * deux façons d'ajouter une dépense :
 *  - une ligne libre (ticket qui n'est pas encore en compta) ;
 *  - une opération DÉJÀ en compta dont le compte est inconnu (ticket importé,
 *    payé avec la carte d'un membre) : elle n'est pas recréée, elle sera
 *    rattachée au compte « Avances des membres » à la validation.
 * Les trajets IK se rattachent depuis l'écran IK. Le serveur revalide tout.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formaterCentimes } from "@/lib/services/montants";
import {
  ajouterLigneAction,
  ajouterLigneOperationAction,
  classerLigneAction,
  supprimerLigneAction,
} from "@/app/[entiteId]/notes-de-frais/actions";
import { BOUTON, BOUTON_SECONDAIRE, CHAMP, ETIQUETTE } from "@/components/FormulaireNoteFrais";

export interface VueLigne {
  id: string;
  origine: "saisie" | "operation" | "ik";
  date: string;
  libelle: string;
  categorieId: string | null;
  montantCentimes: number;
}

export interface VueOperation {
  id: string;
  date: string;
  libelle: string;
  montantCentimes: number;
}

const ORIGINE: Record<VueLigne["origine"], string> = {
  saisie: "Ticket",
  operation: "Opération importée",
  ik: "Trajet IK",
};

const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function LignesNoteFrais({
  entiteId,
  noteId,
  modifiable,
  lignes,
  categories,
  operations,
  dateParDefaut,
}: {
  entiteId: string;
  noteId: string;
  modifiable: boolean;
  lignes: VueLigne[];
  /** Catégories de DÉPENSE actives. */
  categories: { id: string; nom: string }[];
  /** Dépenses sans compte, pas déjà dans une autre note. */
  operations: VueOperation[];
  dateParDefaut: string;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [f, setF] = useState({ date: dateParDefaut, libelle: "", categorieId: "", montant: "" });
  const [operationId, setOperationId] = useState("");
  const total = lignes.reduce((s, l) => s + l.montantCentimes, 0);
  const nomCategorie = new Map(categories.map((c) => [c.id, c.nom]));

  const lancer = (fn: () => Promise<{ success: boolean; error?: string }>, apres?: () => void) => {
    setErreur(null);
    demarrer(async () => {
      const r = await fn();
      if (!r.success) setErreur(r.error ?? "Action impossible.");
      else apres?.();
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-compta-border">
        <table className="w-full text-sm">
          <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Dépense</th>
              <th className="px-3 py-2 font-medium">Catégorie</th>
              <th className="px-3 py-2 text-right font-medium">Montant TTC</th>
              {modifiable && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-compta-border bg-compta-surface">
            {lignes.length === 0 && (
              <tr>
                <td colSpan={modifiable ? 5 : 4} className="px-3 py-4 text-center text-compta-text-muted">
                  Aucune ligne pour l&apos;instant.
                </td>
              </tr>
            )}
            {lignes.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap px-3 py-2">{dateFr(l.date)}</td>
                <td className="px-3 py-2">
                  {l.libelle}
                  <span className="block text-xs text-compta-text-muted">{ORIGINE[l.origine]}</span>
                </td>
                <td className="px-3 py-2">
                  {modifiable ? (
                    <select
                      value={l.categorieId ?? ""}
                      disabled={enCours}
                      onChange={(e) => lancer(() => classerLigneAction(entiteId, l.id, e.target.value))}
                      className="rounded-md border border-compta-border bg-white px-2 py-1 text-xs"
                    >
                      <option value="">À classer</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs">{l.categorieId ? (nomCategorie.get(l.categorieId) ?? "Catégorie archivée") : "À classer"}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formaterCentimes(l.montantCentimes)}</td>
                {modifiable && (
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={enCours}
                      onClick={() => {
                        const q =
                          l.origine === "operation"
                            ? "Retirer cette ligne ? L'opération reste en compta, seul le lien avec la note disparaît."
                            : "Retirer cette ligne de la note ?";
                        if (window.confirm(q)) lancer(() => supprimerLigneAction(entiteId, l.id));
                      }}
                      className="text-xs text-compta-depense underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      Retirer
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-compta-bg font-semibold">
            <tr>
              <td colSpan={3} className="px-3 py-2 text-right">
                Total
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formaterCentimes(total)}</td>
              {modifiable && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {erreur && <p className="text-sm text-compta-depense">{erreur}</p>}

      {modifiable && (
        <div className="grid gap-3 lg:grid-cols-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              lancer(() => ajouterLigneAction(entiteId, noteId, f), () => setF({ ...f, libelle: "", montant: "" }));
            }}
            className="grid grid-cols-2 gap-2 rounded-lg border border-compta-border bg-compta-surface p-3"
          >
            <p className="col-span-2 text-sm font-medium">Ajouter un ticket</p>
            <label className={ETIQUETTE}>
              Date
              <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required className={CHAMP} />
            </label>
            <label className={ETIQUETTE}>
              Montant TTC (€)
              <input value={f.montant} onChange={(e) => setF({ ...f, montant: e.target.value })} required inputMode="decimal" placeholder="12,50" className={CHAMP} />
            </label>
            <label className={`${ETIQUETTE} col-span-2`}>
              Libellé
              <input value={f.libelle} onChange={(e) => setF({ ...f, libelle: e.target.value })} required maxLength={255} placeholder="Péage, carburant, fournitures…" className={CHAMP} />
            </label>
            <label className={`${ETIQUETTE} col-span-2`}>
              Catégorie
              <select value={f.categorieId} onChange={(e) => setF({ ...f, categorieId: e.target.value })} className={CHAMP}>
                <option value="">À classer plus tard</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </label>
            <div className="col-span-2">
              <button type="submit" disabled={enCours} className={BOUTON}>
                Ajouter la ligne
              </button>
            </div>
          </form>

          <div className="space-y-2 rounded-lg border border-compta-border bg-compta-surface p-3">
            <p className="text-sm font-medium">Ajouter une opération déjà importée</p>
            <p className="text-xs text-compta-text-muted">
              Dépenses dont le compte est inconnu (payées avec la carte d&apos;un membre). Elles ne seront pas recréées :
              à la validation, elles passent sur le compte « Avances des membres ».
            </p>
            {operations.length === 0 ? (
              <p className="text-sm text-compta-text-muted">Aucune dépense sans compte disponible.</p>
            ) : (
              <>
                <select value={operationId} onChange={(e) => setOperationId(e.target.value)} className={CHAMP}>
                  <option value="">Choisis une opération</option>
                  {operations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {dateFr(o.date)} · {o.libelle} · {formaterCentimes(o.montantCentimes)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={enCours || !operationId}
                  onClick={() => lancer(() => ajouterLigneOperationAction(entiteId, noteId, operationId), () => setOperationId(""))}
                  className={BOUTON_SECONDAIRE}
                >
                  Ajouter cette opération
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
