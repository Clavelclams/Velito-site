/**
 * SignalementsManager — liste interactive des signalements (admin Velito).
 *
 * Filtre par statut, dépli des détails, ouverture de la pièce jointe (URL
 * signée), boutons de changement de statut (updateSignalementStatutAction).
 */
"use client";

import { useState, useTransition } from "react";
import { updateSignalementStatutAction } from "./actions";

export interface Signalement {
  id: string;
  created_at: string;
  email: string | null;
  app: string;
  categorie: string;
  projet: string | null;
  description: string;
  attachment_path: string | null;
  attachmentUrl?: string;
  statut: string;
}

type Statut = "nouveau" | "en_cours" | "traite" | "archive";

const STATUT_META: Record<string, { label: string; cls: string }> = {
  nouveau: { label: "Nouveau", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  en_cours: { label: "En cours", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  traite: { label: "Traité", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  archive: { label: "Archivé", cls: "bg-gray-100 text-gray-500 border-gray-200" },
};
const FALLBACK_META = { label: "—", cls: "bg-gray-100 text-gray-500 border-gray-200" };
function metaOf(s: string) {
  return STATUT_META[s] ?? FALLBACK_META;
}

const CAT_LABEL: Record<string, string> = {
  bug_technique: "Bug / site",
  souci_projet: "Souci projet",
  souci_vea: "Souci VEA",
  autre: "Autre",
};

const FILTERS: { label: string; value: "tous" | Statut }[] = [
  { label: "Tous", value: "tous" },
  { label: "Nouveau", value: "nouveau" },
  { label: "En cours", value: "en_cours" },
  { label: "Traité", value: "traite" },
  { label: "Archivé", value: "archive" },
];

export default function SignalementsManager({
  signalements,
}: {
  signalements: Signalement[];
}) {
  const [filtre, setFiltre] = useState<"tous" | Statut>("tous");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visibles =
    filtre === "tous" ? signalements : signalements.filter((s) => s.statut === filtre);

  function setStatut(id: string, statut: Statut) {
    startTransition(async () => {
      await updateSignalementStatutAction(id, statut);
    });
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFiltre(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filtre === f.value
                ? "bg-vena-kaki text-vena-cream"
                : "bg-white border border-vena-border text-vena-text-muted hover:border-vena-kaki"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="bg-white border border-vena-border rounded-xl p-8 text-center text-sm text-vena-text-muted">
          Aucun signalement {filtre !== "tous" ? "dans ce statut" : ""}.
        </p>
      ) : (
        <div className="space-y-3">
          {visibles.map((s) => {
            const meta = metaOf(s.statut);
            const open = openId === s.id;
            return (
              <div
                key={s.id}
                className="bg-white border border-vena-border rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : s.id)}
                  className="w-full text-left p-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-vena-cream border border-vena-border text-vena-text-muted">
                        {s.app}
                      </span>
                      <span className="font-bold text-vena-kaki text-sm">
                        {CAT_LABEL[s.categorie] ?? s.categorie}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs text-vena-text-muted mt-1 truncate">
                      {s.projet ? `${s.projet} · ` : ""}
                      {s.description}
                    </p>
                  </div>
                  <span className="text-[11px] text-vena-text-dim whitespace-nowrap">
                    {fmtDate(s.created_at)}
                  </span>
                </button>

                {open && (
                  <div className="px-4 pb-4 border-t border-vena-border pt-4 space-y-2 text-sm">
                    {s.email && (
                      <p className="text-vena-text">
                        <span className="text-vena-text-dim">De :</span>{" "}
                        <a href={`mailto:${s.email}`} className="text-vena-kaki underline">
                          {s.email}
                        </a>
                      </p>
                    )}
                    {s.projet && (
                      <p className="text-vena-text">
                        <span className="text-vena-text-dim">Projet / page :</span>{" "}
                        {s.projet}
                      </p>
                    )}
                    <div className="bg-vena-cream rounded-lg p-3 text-vena-text whitespace-pre-wrap">
                      {s.description}
                    </div>
                    {s.attachmentUrl && (
                      <a
                        href={s.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs font-bold text-vena-kaki underline"
                      >
                        Ouvrir la pièce jointe ↗
                      </a>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      {(["nouveau", "en_cours", "traite", "archive"] as Statut[]).map(
                        (st) => (
                          <button
                            key={st}
                            type="button"
                            disabled={pending || s.statut === st}
                            onClick={() => setStatut(s.id, st)}
                            className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                              s.statut === st
                                ? metaOf(st).cls
                                : "bg-white border-vena-border text-vena-text-muted hover:border-vena-kaki"
                            }`}
                          >
                            {metaOf(st).label}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
