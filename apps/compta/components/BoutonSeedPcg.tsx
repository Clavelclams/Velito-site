"use client";

/**
 * Boutons de gestion du plan comptable — composant CLIENT.
 *  - Initialiser / compléter le plan comptable (seed PCG) ;
 *  - Régénérer toutes les écritures (backfill après seed, si des transactions
 *    existaient déjà et n'avaient pas encore d'écriture).
 * Appelle les actions puis rafraîchit la page.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { seedPcgAction, resynchroniserToutAction } from "@/app/[entiteId]/comptabilite/actions";

export function BoutonSeedPcg({
  entiteId,
  dejaInitialise,
}: {
  entiteId: string;
  dejaInitialise: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function initialiser() {
    setMessage(null);
    demarrer(async () => {
      const r = await seedPcgAction(entiteId);
      if (r.success) {
        setMessage(r.crees === 0 ? "Plan comptable déjà à jour." : `${r.crees} compte(s) ajouté(s).`);
        router.refresh();
      } else {
        setMessage(r.error ?? "Initialisation impossible.");
      }
    });
  }

  function resynchroniser() {
    setMessage(null);
    demarrer(async () => {
      const r = await resynchroniserToutAction(entiteId);
      if (r.success) {
        setMessage(`Écritures régénérées pour ${r.traitees} transaction(s).`);
        router.refresh();
      } else {
        setMessage(r.error ?? "Régénération impossible.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={initialiser}
        disabled={enCours}
        className="rounded-md border border-compta-border px-3 py-1.5 text-sm transition-colors hover:bg-compta-bg disabled:opacity-50"
      >
        {enCours ? "…" : dejaInitialise ? "Compléter le plan comptable" : "Initialiser le plan comptable"}
      </button>

      {dejaInitialise && (
        <button
          type="button"
          onClick={resynchroniser}
          disabled={enCours}
          className="rounded-md border border-compta-border px-3 py-1.5 text-sm transition-colors hover:bg-compta-bg disabled:opacity-50"
          title="Régénère les écritures de toutes les transactions (utile après l'initialisation)."
        >
          {enCours ? "…" : "Régénérer les écritures"}
        </button>
      )}

      {message && <span className="text-xs text-compta-text-muted">{message}</span>}
    </div>
  );
}
