/**
 * DocumentActions — Boutons Valider / Rejeter / Supprimer pour un doc.
 *
 * Client Component avec :
 *   - Bouton "Valider" → server action directe
 *   - Bouton "Rejeter" → ouvre prompt motif, puis server action
 *   - Bouton "Supprimer" → confirm window, puis server action
 *
 * Affichage en fonction du statut courant (déjà validé = pas de bouton valider).
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  validateDocumentAction,
  rejectDocumentAction,
  deleteDocumentAction,
} from "../actions";

interface DocumentActionsProps {
  documentId: string;
  storagePath: string;
  statut: "en_attente" | "valide" | "rejete" | "archive";
}

export default function DocumentActions({
  documentId,
  storagePath,
  statut,
}: DocumentActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [motifRejet, setMotifRejet] = useState("");

  function handleValidate() {
    setError(null);
    startTransition(async () => {
      const result = await validateDocumentAction(documentId);
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      router.refresh();
    });
  }

  function handleReject() {
    if (!motifRejet.trim()) {
      setError("Motif de rejet requis.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rejectDocumentAction(documentId, motifRejet);
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      setShowRejectModal(false);
      router.refresh();
    });
  }

  function handleDelete() {
    const ok = window.confirm(
      "Supprimer définitivement ce document ? Le fichier sera retiré du stockage. Action irréversible."
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteDocumentAction(documentId, storagePath);
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      router.push("/admin/documents");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {statut === "en_attente" && (
        <>
          <button
            onClick={handleValidate}
            disabled={isPending}
            className="text-xs uppercase tracking-widest font-bold px-4 py-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            {isPending ? "..." : "Valider"}
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={isPending}
            className="text-xs uppercase tracking-widest font-bold px-4 py-2 rounded-full border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            Rejeter
          </button>
        </>
      )}
      {statut === "rejete" && (
        <button
          onClick={handleValidate}
          disabled={isPending}
          className="text-xs uppercase tracking-widest font-bold px-4 py-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
        >
          {isPending ? "..." : "Valider quand même"}
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-[10px] uppercase tracking-widest font-bold px-3 py-2 rounded-full text-vea-text-dim hover:text-red-600 transition-colors disabled:opacity-60"
      >
        Supprimer
      </button>

      {error && (
        <div className="w-full text-sm text-red-600 mt-2">{error}</div>
      )}

      {/* Modal Rejet */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRejectModal(false)}
          />
          <div className="relative z-10 w-full max-w-md card-clean p-6 space-y-4">
            <h3 className="text-lg font-bold text-vea-text">Rejeter ce document ?</h3>
            <p className="text-xs text-vea-text-muted">
              Indique le motif. L&apos;uploader recevra une notification cloche
              avec ce motif et pourra ré-uploader corrigé.
            </p>
            <textarea
              value={motifRejet}
              onChange={(e) => setMotifRejet(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Ex : Le ticket est flou, je n'arrive pas à lire le montant."
              className="w-full bg-white border border-vea-border rounded-lg px-3 py-2 text-vea-text text-sm focus:outline-none focus:border-vea-accent"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-xs uppercase tracking-widest font-bold px-4 py-2 rounded-full border border-vea-border text-vea-text-dim hover:border-vea-accent hover:text-vea-accent transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={isPending || !motifRejet.trim()}
                className="text-xs uppercase tracking-widest font-bold px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {isPending ? "..." : "Rejeter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
