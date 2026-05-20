/**
 * DotationsSection — Section "Mes recompenses a recuperer" /profil.
 *
 * Affiche les dotations attribuees au user qui sont en statut 'pending'.
 * Le user peut cliquer "Reclamer" pour passer le statut a 'reclamee'
 * (= signale aux admins qu'il veut recevoir sa recompense).
 *
 * Workflow :
 *   pending  -> reclamee  -> livree  (3 etats principaux)
 *   pending  -> annulee   (admin retire)
 *
 * Client Component pour gerer le clic Reclamer avec feedback.
 */
"use client";

import { useState, useTransition } from "react";
import { claimDotationAction } from "./actions";

export interface DotationARéclamer {
  id: string;
  dotation_nom: string;
  dotation_description: string;
  dotation_emoji: string;
  dotation_valeur_eur: number | null;
  statut: "pending" | "reclamee" | "livree" | "annulee";
  raison_attribution: string | null;
  attribue_le: string;
  reclamee_le: string | null;
  livree_le: string | null;
}

interface DotationsSectionProps {
  dotations: DotationARéclamer[];
}

const STATUT_LABELS: Record<DotationARéclamer["statut"], { label: string; color: string }> = {
  pending: { label: "A reclamer", color: "bg-vea-accent text-white" },
  reclamee: { label: "Reclamee — en cours de preparation", color: "bg-blue-100 text-blue-700" },
  livree: { label: "Livree", color: "bg-green-100 text-green-700" },
  annulee: { label: "Annulee", color: "bg-vea-bg text-vea-text-dim line-through" },
};

export default function DotationsSection({ dotations }: DotationsSectionProps) {
  const [localDotations, setLocalDotations] = useState(dotations);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (dotations.length === 0) {
    return null; // Pas de section si aucune dotation
  }

  function handleClaim(dotationId: string) {
    setError("");
    startTransition(async () => {
      const result = await claimDotationAction(dotationId);
      if (result.success) {
        // Update local : pending -> reclamee
        setLocalDotations((prev) =>
          prev.map((d) =>
            d.id === dotationId
              ? { ...d, statut: "reclamee", reclamee_le: new Date().toISOString() }
              : d
          )
        );
      } else {
        setError(result.error ?? "Erreur inconnue");
      }
    });
  }

  // Compteurs
  const pending = localDotations.filter((d) => d.statut === "pending").length;

  return (
    <section className="mb-12">
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-vea-text">Mes recompenses</h2>
        {pending > 0 && (
          <span className="text-xs uppercase tracking-widest font-bold bg-vea-accent text-white px-3 py-1 rounded-full">
            {pending} a reclamer
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-2 text-sm text-vea-accent">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {localDotations.map((d) => {
          const statutInfo = STATUT_LABELS[d.statut];
          const dateStr = new Date(d.attribue_le).toLocaleDateString("fr-FR");
          return (
            <div key={d.id} className="card-clean p-5 flex items-start gap-4">
              {/* Emoji recompense */}
              <span className="text-4xl shrink-0" aria-hidden="true">
                {d.dotation_emoji}
              </span>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
                  <h3 className="text-base font-bold text-vea-text">{d.dotation_nom}</h3>
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${statutInfo.color}`}>
                    {statutInfo.label}
                  </span>
                </div>
                <p className="text-sm text-vea-text-muted mb-2">{d.dotation_description}</p>
                {d.raison_attribution && (
                  <p className="text-xs text-vea-text-dim italic mb-2">
                    Raison : {d.raison_attribution}
                  </p>
                )}
                <p className="text-[10px] text-vea-text-dim">
                  Attribuee le {dateStr}
                  {d.dotation_valeur_eur && ` · Valeur estimee ~${d.dotation_valeur_eur}€`}
                </p>

                {/* Bouton Reclamer (uniquement si pending) */}
                {d.statut === "pending" && (
                  <button
                    type="button"
                    onClick={() => handleClaim(d.id)}
                    disabled={isPending}
                    className="btn-primary text-xs mt-3 disabled:opacity-60"
                  >
                    {isPending ? "Envoi..." : "Reclamer cette recompense"}
                  </button>
                )}
                {d.statut === "reclamee" && (
                  <p className="text-xs text-vea-text-muted mt-3 italic">
                    L&apos;equipe VEA va te contacter pour la livraison. Patiente quelques jours.
                  </p>
                )}
                {d.statut === "livree" && d.livree_le && (
                  <p className="text-xs text-green-700 mt-3">
                    ✓ Recue le {new Date(d.livree_le).toLocaleDateString("fr-FR")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
