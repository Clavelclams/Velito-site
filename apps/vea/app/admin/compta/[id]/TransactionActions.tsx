/**
 * TransactionActions — Boutons pour modifier le statut + supprimer.
 * Pas de form d'édition complète en V1 (V2 plus tard).
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateTransactionAction,
  deleteTransactionAction,
  type TransactionStatut,
} from "../actions";

interface Props {
  transactionId: string;
  currentStatut: TransactionStatut;
}

export default function TransactionActions({ transactionId, currentStatut }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeStatut(newStatut: TransactionStatut) {
    if (newStatut === currentStatut) return;
    setError(null);
    startTransition(async () => {
      const result = await updateTransactionAction(transactionId, { statut: newStatut });
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    const ok = window.confirm(
      "Supprimer définitivement cette transaction ? Action irréversible. Préfère le statut 'annulé' si tu veux garder une trace."
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTransactionAction(transactionId);
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      router.push("/admin/compta");
      router.refresh();
    });
  }

  const btn = (statut: TransactionStatut, label: string, color: string) => (
    <button
      key={statut}
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
      {btn("effectue", "Effectué", "bg-emerald-100 text-emerald-700 border-emerald-200")}
      {btn("planifie", "Planifié", "bg-amber-100 text-amber-700 border-amber-200")}
      {btn("annule", "Annulé", "bg-vea-bg text-vea-text-dim border-vea-border")}
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
