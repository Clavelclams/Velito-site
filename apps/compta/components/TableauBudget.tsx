"use client";

/**
 * Tableau prévu contre réalisé d'un exercice (07/11/2026).
 * Le prévu se modifie sur la ligne (Entrée ou bouton « OK ») ; un champ vidé
 * retire l'enveloppe et la catégorie repasse à « — ». Tous les calculs
 * viennent du service pur budgets, passés tout faits par la page serveur.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TypeFlux } from "@/types/database";
import type { LigneBudget, PrevuRealise, TotalSens } from "@/lib/services/budgets";
import { LIBELLES_SENS } from "@/lib/services/budgets";
import { centimesVersSaisie, formaterCentimes } from "@/lib/services/montants";
import { copierBudgetPrecedentAction, enregistrerEnveloppeAction } from "@/app/[entiteId]/budgets/actions";

function montant(c: number | null) {
  return c === null ? "—" : formaterCentimes(c);
}

function taux(t: number | null) {
  return t === null ? "—" : `${t.toLocaleString("fr-FR")} %`;
}

/**
 * [07/11/2026] Couleur de l'écart : en dépense, dépasser le prévu est
 * défavorable ; en recette, rester en dessous l'est.
 */
function classeEcart(ecart: number | null, sens: TypeFlux) {
  if (ecart === null || ecart === 0) return "";
  const defavorable = sens === "depense" ? ecart > 0 : ecart < 0;
  return defavorable ? "text-compta-depense" : "text-compta-recette";
}

function CelluleNonValidees({ n }: { n: number }) {
  return n === 0 ? <span className="text-compta-text-muted">0</span> : <span className="text-compta-accent">{n}</span>;
}

function SaisiePrevu({
  entiteId,
  exercice,
  ligne,
  modifiable,
}: {
  entiteId: string;
  exercice: number;
  ligne: LigneBudget;
  modifiable: boolean;
}) {
  const router = useRouter();
  const initial = ligne.prevu === null ? "" : centimesVersSaisie(ligne.prevu);
  const [valeur, setValeur] = useState(initial);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  if (!modifiable || ligne.categorieId === null) {
    return <span className="tabular-nums">{montant(ligne.prevu)}</span>;
  }
  const categorieId = ligne.categorieId;
  const change = valeur.trim() !== initial;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErreur(null);
        demarrer(async () => {
          const r = await enregistrerEnveloppeAction(entiteId, exercice, categorieId, valeur);
          if (!r.success) {
            setErreur(r.error ?? "Enregistrement impossible.");
            return;
          }
          router.refresh();
        });
      }}
      className="flex items-center justify-end gap-1"
    >
      <input
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        inputMode="decimal"
        placeholder="—"
        aria-label={`Prévu ${ligne.nom}`}
        title={erreur ?? "Vide le champ pour retirer l'enveloppe."}
        className={`w-28 rounded-md border bg-white px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-compta-accent ${
          erreur ? "border-compta-depense" : "border-compta-border"
        }`}
      />
      {change && (
        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-compta-accent px-2 py-1 text-xs font-medium text-white hover:bg-compta-accent-hover disabled:opacity-50"
        >
          OK
        </button>
      )}
    </form>
  );
}

function BlocSens({
  entiteId,
  exercice,
  sens,
  lignes,
  total,
  modifiable,
}: {
  entiteId: string;
  exercice: number;
  sens: TypeFlux;
  lignes: LigneBudget[];
  total: TotalSens;
  modifiable: boolean;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{LIBELLES_SENS[sens]}</h3>
      <div className="overflow-x-auto rounded-lg border border-compta-border">
        <table className="w-full text-sm">
          <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Catégorie</th>
              <th className="px-3 py-2 text-right font-medium">Prévu</th>
              <th className="px-3 py-2 text-right font-medium">Réalisé</th>
              <th className="px-3 py-2 text-right font-medium">Écart</th>
              <th className="px-3 py-2 text-right font-medium">Taux</th>
              <th className="px-3 py-2 text-right font-medium" title="Opérations comptées mais pas encore validées">
                Non validées
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-compta-border bg-compta-surface">
            {lignes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-3 text-compta-text-muted">
                  Aucune catégorie de {sens === "recette" ? "recette" : "dépense"} pour l&apos;instant.
                </td>
              </tr>
            )}
            {lignes.map((l) => (
              <tr key={l.categorieId ?? `sans-${sens}`}>
                <td className="px-3 py-2">
                  <span className={l.categorieId === null ? "italic text-compta-text-muted" : "font-medium"}>{l.nom}</span>
                  {!l.active && <span className="ml-2 text-xs text-compta-text-muted">archivée</span>}
                  {l.commentaire && <span className="block text-xs text-compta-text-muted">{l.commentaire}</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  <SaisiePrevu
                    // La clé suit le prévu enregistré : après rafraîchissement, le champ repart de la valeur en base.
                    key={`${l.categorieId}-${l.prevu}`}
                    entiteId={entiteId}
                    exercice={exercice}
                    ligne={l}
                    modifiable={modifiable && l.active}
                  />
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formaterCentimes(l.realise)}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${classeEcart(l.ecart, sens)}`}>{montant(l.ecart)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{taux(l.taux)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <CelluleNonValidees n={l.nbNonValidees} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-compta-bg font-semibold">
            <tr>
              <td className="px-3 py-2">Total {LIBELLES_SENS[sens].toLowerCase()}</td>
              <td className="px-3 py-2 text-right tabular-nums">{montant(total.prevu)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formaterCentimes(total.realise)}</td>
              <td className={`px-3 py-2 text-right tabular-nums ${classeEcart(total.ecart, sens)}`}>{montant(total.ecart)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{taux(total.taux)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                <CelluleNonValidees n={total.nbNonValidees} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export function TableauBudget({
  entiteId,
  donnees,
  modifiable,
}: {
  entiteId: string;
  donnees: PrevuRealise;
  modifiable: boolean;
}) {
  return (
    <div className="space-y-6">
      <BlocSens
        entiteId={entiteId}
        exercice={donnees.exercice}
        sens="recette"
        lignes={donnees.recettes}
        total={donnees.totaux.recette}
        modifiable={modifiable}
      />
      <BlocSens
        entiteId={entiteId}
        exercice={donnees.exercice}
        sens="depense"
        lignes={donnees.depenses}
        total={donnees.totaux.depense}
        modifiable={modifiable}
      />
    </div>
  );
}

/** « Copier le budget de l'exercice précédent » : ne crée que les enveloppes manquantes. */
export function BoutonCopierBudget({ entiteId, exercice }: { entiteId: string; exercice: number }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={enCours}
        onClick={() => {
          setMessage(null);
          demarrer(async () => {
            const r = await copierBudgetPrecedentAction(entiteId, exercice);
            if (!r.success) {
              setMessage({ ok: false, texte: r.error ?? "Copie impossible." });
              return;
            }
            const n = r.copiees ?? 0;
            setMessage({
              ok: true,
              texte:
                n === 0
                  ? "Rien à copier : toutes les enveloppes existent déjà."
                  : `${n} enveloppe${n > 1 ? "s" : ""} copiée${n > 1 ? "s" : ""} depuis ${exercice - 1}.`,
            });
            router.refresh();
          });
        }}
        className="rounded-md border border-compta-accent px-3 py-1.5 text-sm font-medium text-compta-accent hover:bg-compta-accent hover:text-white disabled:opacity-50"
      >
        Copier le budget de l&apos;exercice précédent
      </button>
      {message && <span className={`text-sm ${message.ok ? "text-compta-recette" : "text-compta-depense"}`}>{message.texte}</span>}
    </div>
  );
}
