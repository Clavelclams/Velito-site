/**
 * DemandeManager — gestion d'une demande de devis (statut + notes + archive).
 *
 * Affiché sur /admin/demandes/[id]. Éditeurs+ uniquement (vérifié côté action).
 * "Archiver" = soft delete (statut 'annule'), pas de suppression dure.
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDemandeAction, archiveDemandeAction } from "./actions";

const STATUT_OPTIONS = [
  { value: "nouveau", label: "Nouveau" },
  { value: "en_cours", label: "En cours" },
  { value: "devis_envoye", label: "Devis envoyé" },
  { value: "accepte", label: "Accepté" },
  { value: "refuse", label: "Refusé" },
  { value: "annule", label: "Archivé / annulé" },
];

interface DemandeManagerProps {
  id: string;
  statut: string;
  notesInternes: string | null;
}

export default function DemandeManager({ id, statut, notesInternes }: DemandeManagerProps) {
  const router = useRouter();
  const [currentStatut, setCurrentStatut] = useState(statut || "nouveau");
  const [notes, setNotes] = useState(notesInternes ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setMsg(null);
    setError(null);
    startTransition(async () => {
      const r = await updateDemandeAction({ id, statut: currentStatut, notes_internes: notes });
      if (!r.success) {
        setError(r.error ?? "Erreur");
        return;
      }
      setMsg("Enregistré.");
      router.refresh();
    });
  }

  function archive() {
    if (!confirm("Archiver cette demande ? Elle disparaîtra de la liste active (mais reste conservée).")) {
      return;
    }
    setMsg(null);
    setError(null);
    startTransition(async () => {
      const r = await archiveDemandeAction(id);
      if (!r.success) {
        setError(r.error ?? "Erreur");
        return;
      }
      router.push("/admin/demandes");
    });
  }

  const inputClass =
    "w-full bg-white border border-vea-border rounded-lg px-3 py-2 text-sm text-vea-text focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15";

  return (
    <section className="card-clean p-5">
      <h2 className="text-xs font-black uppercase tracking-widest text-vea-accent mb-4">
        Gestion de la demande
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="statut" className="block text-[10px] uppercase tracking-widest text-vea-text-dim mb-1">
            Statut
          </label>
          <select
            id="statut"
            value={currentStatut}
            onChange={(e) => setCurrentStatut(e.target.value)}
            className={inputClass}
          >
            {STATUT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="notes" className="block text-[10px] uppercase tracking-widest text-vea-text-dim mb-1">
          Notes internes (non visibles par le demandeur)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
          rows={3}
          className={inputClass}
          placeholder="Ex : relancé par tel le 22/05, devis 350€ envoyé…"
        />
      </div>

      {error && (
        <div role="alert" className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}
      {msg && (
        <div role="status" className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{msg}</div>
      )}

      <div className="mt-4 flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="px-4 py-2 rounded-full bg-vea-accent text-white text-sm font-bold hover:bg-vea-accent-hover disabled:opacity-50"
        >
          {isPending ? "…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={archive}
          disabled={isPending}
          className="px-4 py-2 rounded-full border border-red-200 text-red-700 text-sm font-bold hover:bg-red-50 disabled:opacity-50"
        >
          Archiver
        </button>
      </div>
    </section>
  );
}
