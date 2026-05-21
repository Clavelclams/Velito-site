/**
 * DemandesManager — liste interactive des demandes de devis VENA.
 *
 * "use client" : filtre par statut, dépli des détails, boutons de changement
 * de statut (appellent updateStatutAction côté serveur).
 */
"use client";

import { useState, useTransition } from "react";
import { updateStatutAction } from "./actions";

export interface Demande {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  structure: string | null;
  fonction: string | null;
  service_demande: string;
  budget_envisage: string | null;
  delai: string | null;
  message: string;
  source_decouverte: string | null;
  statut: string;
  created_at: string;
}

type Statut = "nouveau" | "en_cours" | "traite" | "archive";

const STATUT_META: Record<string, { label: string; cls: string }> = {
  nouveau: { label: "Nouveau", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  en_cours: { label: "En cours", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  traite: { label: "Traité", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  archive: { label: "Archivé", cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

const FALLBACK_META = {
  label: "—",
  cls: "bg-gray-100 text-gray-500 border-gray-200",
};

// Accès sûr : STATUT_META[clé] peut être undefined (noUncheckedIndexedAccess).
function metaOf(s: string): { label: string; cls: string } {
  return STATUT_META[s] ?? FALLBACK_META;
}

const FILTERS: { label: string; value: "tous" | Statut }[] = [
  { label: "Tous", value: "tous" },
  { label: "Nouveau", value: "nouveau" },
  { label: "En cours", value: "en_cours" },
  { label: "Traité", value: "traite" },
  { label: "Archivé", value: "archive" },
];

export default function DemandesManager({ demandes }: { demandes: Demande[] }) {
  const [filtre, setFiltre] = useState<"tous" | Statut>("tous");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visibles =
    filtre === "tous" ? demandes : demandes.filter((d) => d.statut === filtre);

  function setStatut(id: string, statut: Statut) {
    startTransition(async () => {
      await updateStatutAction(id, statut);
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
          Aucune demande {filtre !== "tous" ? "dans ce statut" : ""}.
        </p>
      ) : (
        <div className="space-y-3">
          {visibles.map((d) => {
            const meta = metaOf(d.statut);
            const open = openId === d.id;
            return (
              <div
                key={d.id}
                className="bg-white border border-vena-border rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : d.id)}
                  className="w-full text-left p-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-vena-kaki text-sm">
                        {d.prenom} {d.nom}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs text-vena-text-muted mt-1 truncate">
                      {d.structure ? `${d.structure} · ` : ""}
                      {d.service_demande}
                    </p>
                  </div>
                  <span className="text-[11px] text-vena-text-dim whitespace-nowrap">
                    {fmtDate(d.created_at)}
                  </span>
                </button>

                {open && (
                  <div className="px-4 pb-4 border-t border-vena-border pt-4 space-y-2 text-sm">
                    <p className="text-vena-text">
                      <span className="text-vena-text-dim">Email :</span>{" "}
                      <a
                        href={`mailto:${d.email}`}
                        className="text-vena-kaki underline"
                      >
                        {d.email}
                      </a>
                    </p>
                    {d.telephone && (
                      <p className="text-vena-text">
                        <span className="text-vena-text-dim">Tél :</span>{" "}
                        {d.telephone}
                      </p>
                    )}
                    {d.fonction && (
                      <p className="text-vena-text">
                        <span className="text-vena-text-dim">Fonction :</span>{" "}
                        {d.fonction}
                      </p>
                    )}
                    <p className="text-vena-text">
                      <span className="text-vena-text-dim">Budget :</span>{" "}
                      {d.budget_envisage || "—"}
                      {"  ·  "}
                      <span className="text-vena-text-dim">Délai :</span>{" "}
                      {d.delai || "—"}
                    </p>
                    {d.source_decouverte && (
                      <p className="text-vena-text">
                        <span className="text-vena-text-dim">Découvert via :</span>{" "}
                        {d.source_decouverte}
                      </p>
                    )}
                    <div className="bg-vena-cream rounded-lg p-3 text-vena-text whitespace-pre-wrap">
                      {d.message}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {(["nouveau", "en_cours", "traite", "archive"] as Statut[]).map(
                        (s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={pending || d.statut === s}
                            onClick={() => setStatut(d.id, s)}
                            className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                              d.statut === s
                                ? metaOf(s).cls
                                : "bg-white border-vena-border text-vena-text-muted hover:border-vena-kaki"
                            }`}
                          >
                            {metaOf(s).label}
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
