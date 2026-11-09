"use client";

/**
 * Boutons de cycle de vie d'une facture ou d'un avoir (09/11/2026) :
 *   brouillon : Émettre (le numéro légal est attribué par la base), Supprimer ;
 *   facture émise : Préparer un avoir, Préparer une correction (avoir total
 *   et nouveau brouillon copié).
 * Les mentions manquantes sont listées par la page ; le serveur et la base
 * revérifient tout (service + trigger).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SensFacture, StatutFactureStocke } from "@/types/facturation";
import { emettreFactureAction, preparerAvoirAction, preparerCorrectionAction, supprimerFactureAction } from "@/app/[entiteId]/factures/actions";
import { BOUTON, BOUTON_SECONDAIRE } from "@/components/FormulaireNoteFrais";

export function ActionsFacture({
  entiteId,
  factureId,
  sens,
  statut,
  emissionBloquee,
  peutAvoir,
  peutCorriger,
}: {
  entiteId: string;
  factureId: string;
  sens: SensFacture;
  statut: StatutFactureStocke;
  /** Une mention obligatoire manque : le bouton Émettre est désactivé. */
  emissionBloquee: boolean;
  peutAvoir: boolean;
  peutCorriger: boolean;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const doc = sens === "avoir" ? "l'avoir" : "la facture";

  const lancer = (fn: () => Promise<{ success: boolean; error?: string; id?: string }>, question?: string) => {
    if (question && !window.confirm(question)) return;
    setErreur(null);
    demarrer(async () => {
      const r = await fn();
      if (!r.success) {
        setErreur(r.error ?? "Action impossible.");
        return;
      }
      if (r.id) router.push(`/${entiteId}/factures/${r.id}`);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-compta-border bg-compta-surface p-4">
      {statut === "brouillon" && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={enCours || emissionBloquee}
            className={BOUTON}
            onClick={() =>
              lancer(
                () => emettreFactureAction(entiteId, factureId),
                `Émettre ${doc} ? Le numéro légal sera attribué et le document ne pourra plus être modifié ni supprimé.`,
              )
            }
          >
            Émettre {doc}
          </button>
          <span className="text-sm text-compta-text-muted">
            {emissionBloquee
              ? "Complète d'abord les mentions signalées ci-dessus."
              : "Le numéro suit l'ordre des dates d'émission, sans trou. Après l'émission, plus rien ne change."}
          </span>
        </div>
      )}

      {statut === "emise" && sens === "facture" && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={enCours || !peutAvoir}
              className={BOUTON_SECONDAIRE}
              onClick={() => lancer(() => preparerAvoirAction(entiteId, factureId))}
            >
              Préparer un avoir
            </button>
            <button
              type="button"
              disabled={enCours || !peutCorriger}
              className={BOUTON_SECONDAIRE}
              onClick={() =>
                lancer(
                  () => preparerCorrectionAction(entiteId, factureId),
                  "Préparer une correction ? Un brouillon d'avoir total et un nouveau brouillon de facture copié seront créés. Rien n'est émis.",
                )
              }
            >
              Préparer une correction
            </button>
          </div>
          <p className="text-xs text-compta-text-muted">
            Une facture émise ne se modifie plus. L&apos;avoir (brouillon copié, à ajuster pour un avoir partiel) l&apos;annule en tout ou en
            partie ; la correction prépare l&apos;avoir total et la facture qui la remplace.
          </p>
        </div>
      )}

      {statut === "brouillon" && (
        <div>
          <button
            type="button"
            disabled={enCours}
            onClick={() => lancer(() => supprimerFactureAction(entiteId, factureId), "Supprimer ce brouillon ? Aucun numéro n'a été attribué.")}
            className="text-xs text-compta-depense underline-offset-2 hover:underline disabled:opacity-50"
          >
            Supprimer le brouillon
          </button>
        </div>
      )}

      {enCours && <p className="text-sm text-compta-text-muted">En cours…</p>}
      {erreur && <p className="text-sm text-compta-depense">{erreur}</p>}
    </div>
  );
}
