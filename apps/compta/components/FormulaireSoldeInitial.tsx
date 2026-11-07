"use client";

/**
 * Renseigner le solde initial d'un compte après coup (Lot 6, 07/11/2026).
 * Typiquement : le solde au premier jour du premier relevé retrouvé.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirSoldeInitialAction } from "@/app/[entiteId]/tresorerie/actions";

export function FormulaireSoldeInitial({ entiteId, compteId }: { entiteId: string; compteId: string }) {
  const router = useRouter();
  const [solde, setSolde] = useState("");
  const [date, setDate] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const champ = "rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErreur(null);
        demarrer(async () => {
          const r = await definirSoldeInitialAction(entiteId, compteId, solde, date);
          if (r.success) router.refresh();
          else setErreur(r.error ?? "Enregistrement impossible.");
        });
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input value={solde} onChange={(e) => setSolde(e.target.value)} placeholder="Solde (€)" inputMode="decimal" className={champ} />
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date du solde initial" className={champ} />
      <button
        type="submit"
        disabled={enCours}
        className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white hover:bg-compta-accent-hover disabled:opacity-50"
      >
        Enregistrer
      </button>
      {erreur && <span className="text-sm text-compta-depense">{erreur}</span>}
    </form>
  );
}
