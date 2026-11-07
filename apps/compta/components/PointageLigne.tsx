"use client";

/**
 * Pointage sur le relevé (07/11/2026) : une ligne (pointer avec date et
 * référence, ou dépointer) et le bouton « Pointer toutes les lignes du mois ».
 * Le serveur revérifie tout (pointage/actions.ts) ; la base refuse si
 * l'exercice est clôturé, et son message s'affiche tel quel.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  depointerLigneAction,
  pointerLigneAction,
  pointerMoisAction,
} from "@/app/[entiteId]/tresorerie/[compteId]/pointage/actions";
import { POINTE_REF_MAX } from "@/lib/services/cloture";

const champ = "rounded-md border border-compta-border bg-white px-2 py-1 text-xs outline-none focus:border-compta-accent";

function dateFr(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export function LignePointage({
  entiteId,
  compteId,
  transactionId,
  pointeLe,
  pointeRef,
  dateProposee,
  referenceProposee,
  lectureSeule,
}: {
  entiteId: string;
  compteId: string;
  transactionId: string;
  pointeLe: string | null;
  pointeRef: string | null;
  dateProposee: string;
  referenceProposee: string;
  lectureSeule: boolean;
}) {
  const router = useRouter();
  const [date, setDate] = useState(dateProposee);
  const [reference, setReference] = useState(referenceProposee);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function lancer(fn: () => Promise<{ success: boolean; error?: string }>) {
    setErreur(null);
    demarrer(async () => {
      const r = await fn();
      if (r.success) router.refresh();
      else setErreur(r.error ?? "Action impossible.");
    });
  }

  return (
    <div className="space-y-1">
      {pointeLe ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-compta-recette">
            Pointée au {dateFr(pointeLe)} · {pointeRef}
          </span>
          {!lectureSeule && (
            <button
              type="button"
              disabled={enCours}
              onClick={() => lancer(() => depointerLigneAction(entiteId, compteId, transactionId))}
              className="text-compta-text-muted underline-offset-2 hover:text-compta-depense hover:underline disabled:opacity-50"
            >
              Dépointer
            </button>
          )}
        </div>
      ) : lectureSeule ? (
        <span className="text-xs text-compta-text-muted">Non pointée</span>
      ) : (
        <div className="flex flex-wrap items-center gap-1">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date du relevé" className={champ} />
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={POINTE_REF_MAX}
            aria-label="Référence du relevé"
            className={`${champ} w-44`}
          />
          <button
            type="button"
            disabled={enCours}
            onClick={() => lancer(() => pointerLigneAction(entiteId, compteId, transactionId, date, reference))}
            className="rounded-md bg-compta-accent px-2 py-1 text-xs font-medium text-white hover:bg-compta-accent-hover disabled:opacity-50"
          >
            Pointer
          </button>
        </div>
      )}
      {erreur && <p className="text-xs text-compta-depense">{erreur}</p>}
    </div>
  );
}

export function BoutonPointerMois({
  entiteId,
  compteId,
  mois,
  nombre,
}: {
  entiteId: string;
  compteId: string;
  mois: string;
  nombre: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={enCours || nombre === 0}
        onClick={() => {
          setMessage(null);
          demarrer(async () => {
            const r = await pointerMoisAction(entiteId, compteId, mois);
            if (r.success) {
              setMessage(`${r.pointees ?? 0} ligne(s) pointée(s).`);
              router.refresh();
            } else setMessage(r.error ?? "Pointage impossible.");
          });
        }}
        className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white hover:bg-compta-accent-hover disabled:opacity-50"
      >
        {enCours ? "Pointage…" : `Pointer toutes les lignes du mois (${nombre})`}
      </button>
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}
