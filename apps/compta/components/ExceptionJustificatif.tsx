"use client";

/**
 * Saisie d'une exception de justificatif (07/11/2026) : pourquoi cette ligne
 * n'a pas de pièce, en au moins 10 caractères. Enregistrée, la ligne sort de
 * la liste « sans justificatif » et ne bloque plus la clôture.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirExceptionAction } from "@/app/[entiteId]/transactions/sans-justificatif/actions";
import { EXCEPTION_MAX, EXCEPTION_MIN } from "@/lib/services/cloture";

export function ExceptionJustificatif({
  entiteId,
  transactionId,
  lectureSeule = false,
}: {
  entiteId: string;
  transactionId: string;
  /** [07/11/2026] Lecteur : rien n'est rendu (pas de saisie d'exception). */
  lectureSeule?: boolean;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const assezLong = texte.trim().length >= EXCEPTION_MIN;

  // [07/11/2026] Après les hooks (ordre d'appel constant), on ne rend rien au lecteur.
  if (lectureSeule) return null;

  if (!ouvert) {
    return (
      <button type="button" onClick={() => setOuvert(true)} className="text-xs text-compta-accent hover:underline">
        Pas de pièce ? Explique pourquoi
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErreur(null);
        demarrer(async () => {
          const r = await definirExceptionAction(entiteId, transactionId, texte);
          if (r.success) router.refresh();
          else setErreur(r.error ?? "Enregistrement impossible.");
        });
      }}
      className="space-y-1"
    >
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={2}
        maxLength={EXCEPTION_MAX}
        aria-label="Motif de l'absence de justificatif"
        placeholder="Ex. : frais bancaires, visibles sur le relevé"
        className="w-full rounded-md border border-compta-border bg-white px-2 py-1.5 text-xs outline-none focus:border-compta-accent"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={enCours || !assezLong}
          className="rounded-md bg-compta-accent px-3 py-1 text-xs font-medium text-white hover:bg-compta-accent-hover disabled:opacity-50"
        >
          Enregistrer l&apos;exception
        </button>
        <button type="button" onClick={() => setOuvert(false)} className="text-xs text-compta-text-muted hover:underline">
          Annuler
        </button>
        {!assezLong && <span className="text-xs text-compta-text-muted">{EXCEPTION_MIN} caractères au moins</span>}
      </div>
      {erreur && <p className="text-xs text-compta-depense">{erreur}</p>}
    </form>
  );
}
