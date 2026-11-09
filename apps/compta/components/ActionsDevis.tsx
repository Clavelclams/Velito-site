"use client";

/**
 * Boutons de cycle de vie d'un devis (09/11/2026), selon le statut :
 *   brouillon : Envoyer, Supprimer ;
 *   envoyé    : Accepter (date du « Bon pour accord », signataire), Refuser,
 *               Repasser en brouillon ;
 *   accepté   : Transformer en facture (nouveau brouillon, lignes copiées).
 * Le serveur et la base revérifient chaque transition (service + trigger).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StatutDevisStocke } from "@/types/facturation";
import { changerStatutDevisAction, supprimerDevisAction, transformerEnFactureAction } from "@/app/[entiteId]/devis/actions";
import { BOUTON, BOUTON_SECONDAIRE, CHAMP, ETIQUETTE } from "@/components/FormulaireNoteFrais";

export function ActionsDevis({
  entiteId,
  devisId,
  statut,
  expire,
  dejaFacture,
  aujourdHui,
}: {
  entiteId: string;
  devisId: string;
  statut: StatutDevisStocke;
  expire: boolean;
  dejaFacture: boolean;
  aujourdHui: string;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [dateAcceptation, setDateAcceptation] = useState(aujourdHui);
  const [signataire, setSignataire] = useState("");

  const lancer = (fn: () => Promise<{ success: boolean; error?: string; id?: string }>, question?: string, vers?: (id: string) => string) => {
    if (question && !window.confirm(question)) return;
    setErreur(null);
    demarrer(async () => {
      const r = await fn();
      if (!r.success) {
        setErreur(r.error ?? "Action impossible.");
        return;
      }
      if (r.id && vers) router.push(vers(r.id));
      else router.refresh();
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-compta-border bg-compta-surface p-4">
      {statut === "brouillon" && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={enCours} className={BOUTON} onClick={() => lancer(() => changerStatutDevisAction(entiteId, devisId, "envoye"))}>
            Marquer comme envoyé
          </button>
          <span className="text-sm text-compta-text-muted">Un devis envoyé reste modifiable jusqu&apos;à son acceptation ou son refus.</span>
        </div>
      )}

      {statut === "envoye" && (
        <div className="space-y-3">
          {expire && <p className="text-sm text-compta-accent">Ce devis est expiré : sa date de fin de validité est dépassée.</p>}
          <div className="flex flex-wrap items-end gap-2">
            <label className={ETIQUETTE}>
              Date du « Bon pour accord »
              <input type="date" value={dateAcceptation} max={aujourdHui} onChange={(e) => setDateAcceptation(e.target.value)} className={CHAMP} />
            </label>
            <label className={`${ETIQUETTE} min-w-[14rem] flex-1`}>
              Signataire (facultatif)
              <input value={signataire} onChange={(e) => setSignataire(e.target.value)} maxLength={200} className={CHAMP} />
            </label>
            <button
              type="button"
              disabled={enCours || !dateAcceptation}
              className={BOUTON}
              onClick={() =>
                lancer(
                  () => changerStatutDevisAction(entiteId, devisId, "accepte", dateAcceptation, signataire),
                  "Enregistrer l'acceptation ? Le devis ne se modifiera plus.",
                )
              }
            >
              Accepté
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={enCours}
              className={BOUTON_SECONDAIRE}
              onClick={() => lancer(() => changerStatutDevisAction(entiteId, devisId, "refuse"), "Enregistrer le refus ? Le devis ne se modifiera plus.")}
            >
              Refusé
            </button>
            <button type="button" disabled={enCours} className={BOUTON_SECONDAIRE} onClick={() => lancer(() => changerStatutDevisAction(entiteId, devisId, "brouillon"))}>
              Repasser en brouillon
            </button>
          </div>
        </div>
      )}

      {statut === "accepte" && !dejaFacture && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={enCours}
            className={BOUTON}
            onClick={() =>
              lancer(
                () => transformerEnFactureAction(entiteId, devisId),
                "Créer un brouillon de facture à partir de ce devis ? Le devis n'est pas modifié, aucun encaissement n'est créé.",
                (id) => `/${entiteId}/factures/${id}`,
              )
            }
          >
            Transformer en facture
          </button>
          <span className="text-sm text-compta-text-muted">Crée un brouillon de facture qui copie les lignes. Le numéro légal viendra à l&apos;émission.</span>
        </div>
      )}

      {(statut === "accepte" && dejaFacture) || statut === "refuse" ? (
        <p className="text-sm text-compta-text-muted">Ce devis ne se modifie plus.</p>
      ) : null}

      {statut === "brouillon" && (
        <div>
          <button
            type="button"
            disabled={enCours}
            onClick={() => lancer(() => supprimerDevisAction(entiteId, devisId), "Supprimer ce devis ?")}
            className="text-xs text-compta-depense underline-offset-2 hover:underline disabled:opacity-50"
          >
            Supprimer le devis
          </button>
        </div>
      )}

      {enCours && <p className="text-sm text-compta-text-muted">En cours…</p>}
      {erreur && <p className="text-sm text-compta-depense">{erreur}</p>}
    </div>
  );
}
