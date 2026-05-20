/**
 * RapportActions — Changement de statut + suppression d'un rapport.
 *
 * Workflow conseille : brouillon → valide → publie → (archive)
 * Le passage en 'valide' declenche une notification cloche aux autres
 * dirigeants (cf trigger SQL).
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateRapportAction,
  deleteRapportAction,
  type RapportStatut,
} from "../actions";

interface Props {
  rapportId: string;
  currentStatut: RapportStatut;
}

export default function RapportActions({ rapportId, currentStatut }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeStatut(newStatut: RapportStatut) {
    if (newStatut === currentStatut) return;
    setError(null);
    startTransition(async () => {
      const result = await updateRapportAction(rapportId, { statut: newStatut });
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    const ok = window.confirm("Supprimer définitivement ce rapport ? Action irréversible.");
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteRapportAction(rapportId);
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      router.push("/admin/rapports");
      router.refresh();
    });
  }

  const btn = (statut: RapportStatut, label: string, color: string) => (
    <button
      type="button"
      onClick={() => changeStatut(statut)}
      disabled={isPending || statut === currentStatut}
      className={`text-xs uppercase tracking-widest font-bold px-3 py-2 rounded-full border transition-colors disabled:opacity-60 ${
        statut === currentStatut
          ? `${color} cursor-default`
          : "border-vea-border text-vea-text-dim hover:border-vea-accent hover:text-vea-accent"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {btn("brouillon", "Brouillon", "bg-vea-bg text-vea-text-dim border-vea-border")}
      {btn("valide", "Validé", "bg-amber-100 text-amber-700 border-amber-200")}
      {btn("publie", "Publié", "bg-emerald-100 text-emerald-700 border-emerald-200")}
      {btn("archive", "Archivé", "bg-vea-bg text-vea-text-dim border-vea-border")}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-[10px] uppercase tracking-widest font-bold px-3 py-2 rounded-full text-vea-text-dim hover:text-red-600 transition-colors disabled:opacity-60"
      >
        Supprimer
      </button>
      {error && <div className="w-full text-sm text-red-600 mt-2">{error}</div>}
    </div>
  );
}
