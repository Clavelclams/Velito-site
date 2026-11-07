"use client";

/**
 * Boutons de cycle de vie d'une note de frais (07/11/2026), selon le statut :
 *   brouillon  : Soumettre, Supprimer ;
 *   à vérifier : Valider, Refuser (motif), Renvoyer en brouillon, Supprimer ;
 *   validée    : Rembourser (choix de l'opération bancaire réelle),
 *                Abandonner (date de la renonciation écrite) ;
 *   remboursée, abandonnée, refusée : Préparer une correction.
 * Le serveur et la base revérifient chaque transition (service + trigger).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StatutNoteFrais } from "@/types/notes-de-frais";
import { formaterCentimes } from "@/lib/services/montants";
import {
  abandonnerNoteAction,
  changerStatutAction,
  preparerCorrectionAction,
  rembourserNoteAction,
  supprimerNoteAction,
  validerNoteAction,
} from "@/app/[entiteId]/notes-de-frais/actions";
import { BOUTON, BOUTON_SECONDAIRE, CHAMP, ETIQUETTE } from "@/components/FormulaireNoteFrais";

export interface VueCandidate {
  id: string;
  date: string;
  libelle: string;
  compte: string;
  montantCentimes: number;
}

const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function ActionsNoteFrais({
  entiteId,
  noteId,
  statut,
  totalCentimes,
  candidates,
  aujourdHui,
}: {
  entiteId: string;
  noteId: string;
  statut: StatutNoteFrais;
  totalCentimes: number;
  /** Dépenses bancaires (hors virements), celles du bon montant en premier. */
  candidates: VueCandidate[];
  aujourdHui: string;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const [operationId, setOperationId] = useState("");
  const [dateRenonciation, setDateRenonciation] = useState("");

  const lancer = (fn: () => Promise<{ success: boolean; error?: string; id?: string }>, question?: string) => {
    if (question && !window.confirm(question)) return;
    setErreur(null);
    demarrer(async () => {
      const r = await fn();
      if (!r.success) {
        setErreur(r.error ?? "Action impossible.");
        return;
      }
      if (r.id) router.push(`/${entiteId}/notes-de-frais/${r.id}`);
      else router.refresh();
    });
  };

  const choisie = candidates.find((c) => c.id === operationId);
  const ecart = choisie ? choisie.montantCentimes - totalCentimes : 0;

  return (
    <div className="space-y-3 rounded-lg border border-compta-border bg-compta-surface p-4">
      {statut === "brouillon" && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={enCours} className={BOUTON} onClick={() => lancer(() => changerStatutAction(entiteId, noteId, "a_verifier"))}>
            Soumettre
          </button>
          <span className="text-sm text-compta-text-muted">La note passe « à vérifier » : le trésorier la contrôle avant de la valider.</span>
        </div>
      )}

      {statut === "a_verifier" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={enCours}
              className={BOUTON}
              onClick={() =>
                lancer(
                  () => validerNoteAction(entiteId, noteId),
                  "Valider la note ? Chaque ligne devient une dépense sur le compte « Avances des membres ». Les opérations déjà importées sont rattachées à ce compte, pas recréées.",
                )
              }
            >
              Valider
            </button>
            <button type="button" disabled={enCours} className={BOUTON_SECONDAIRE} onClick={() => lancer(() => changerStatutAction(entiteId, noteId, "brouillon"))}>
              Renvoyer en brouillon
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className={`${ETIQUETTE} min-w-[16rem] flex-1`}>
              Motif du refus
              <input value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={500} placeholder="Ticket illisible, dépense non prévue…" className={CHAMP} />
            </label>
            <button
              type="button"
              disabled={enCours || motif.trim().length < 3}
              className={BOUTON_SECONDAIRE}
              onClick={() => lancer(() => changerStatutAction(entiteId, noteId, "refusee", motif), "Refuser la note ? Elle ne se modifiera plus.")}
            >
              Refuser
            </button>
          </div>
        </div>
      )}

      {statut === "validee" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Rembourser</p>
            <p className="text-xs text-compta-text-muted">
              Choisis l&apos;opération du relevé qui a payé le membre (souvent « VIR REMBOURSEMENT »). Elle devient un virement
              interne vers « Avances des membres » : ce n&apos;est pas une seconde dépense. Son montant doit être égal au total
              ({formaterCentimes(totalCentimes)}).
            </p>
            {candidates.length === 0 ? (
              <p className="text-sm text-compta-accent">
                Aucune dépense bancaire disponible. Importe d&apos;abord le relevé qui contient le remboursement.
              </p>
            ) : (
              <>
                <select value={operationId} onChange={(e) => setOperationId(e.target.value)} className={CHAMP}>
                  <option value="">Choisis l&apos;opération bancaire</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.montantCentimes === totalCentimes ? "Montant égal · " : ""}
                      {dateFr(c.date)} · {c.libelle} · {c.compte} · {formaterCentimes(c.montantCentimes)}
                    </option>
                  ))}
                </select>
                {choisie && ecart !== 0 && (
                  <p className="text-sm text-compta-depense">
                    Écart de {formaterCentimes(Math.abs(ecart))} avec le total de la note : le remboursement sera refusé.
                  </p>
                )}
                <button
                  type="button"
                  disabled={enCours || !operationId}
                  className={BOUTON}
                  onClick={() =>
                    lancer(
                      () => rembourserNoteAction(entiteId, noteId, operationId),
                      "Marquer la note remboursée par cette opération ? Elle ne se modifiera plus.",
                    )
                  }
                >
                  Rembourser
                </button>
              </>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Abandonner (don)</p>
            <p className="text-xs text-compta-text-muted">
              Le membre renonce par écrit au remboursement. Sa créance envers l&apos;association est éteinte par son don :
              une fiche « Frais abandonnés » est créée dans Bénévolat (à vérifier), aucun encaissement n&apos;est enregistré.
            </p>
            <label className={ETIQUETTE}>
              Date de la renonciation écrite
              <input type="date" value={dateRenonciation} max={aujourdHui} onChange={(e) => setDateRenonciation(e.target.value)} className={CHAMP} />
            </label>
            <button
              type="button"
              disabled={enCours || !dateRenonciation}
              className={BOUTON_SECONDAIRE}
              onClick={() =>
                lancer(
                  () => abandonnerNoteAction(entiteId, noteId, dateRenonciation),
                  "Enregistrer l'abandon ? La note ne se modifiera plus.",
                )
              }
            >
              Abandonner
            </button>
          </div>
        </div>
      )}

      {(statut === "remboursee" || statut === "abandonnee" || statut === "refusee") && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={enCours} className={BOUTON_SECONDAIRE} onClick={() => lancer(() => preparerCorrectionAction(entiteId, noteId))}>
            Préparer une correction
          </button>
          <span className="text-sm text-compta-text-muted">
            Cette note ne se modifie plus. La correction est un nouveau brouillon copié, l&apos;original reste.
          </span>
        </div>
      )}

      {(statut === "brouillon" || statut === "a_verifier") && (
        <div>
          <button
            type="button"
            disabled={enCours}
            onClick={() => lancer(() => supprimerNoteAction(entiteId, noteId), "Supprimer cette note ? Les opérations liées restent en compta.")}
            className="text-xs text-compta-depense underline-offset-2 hover:underline disabled:opacity-50"
          >
            Supprimer la note
          </button>
        </div>
      )}

      {enCours && <p className="text-sm text-compta-text-muted">En cours…</p>}
      {erreur && <p className="text-sm text-compta-depense">{erreur}</p>}
    </div>
  );
}
