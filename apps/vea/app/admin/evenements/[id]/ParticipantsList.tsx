/**
 * ParticipantsList — Client Component pour /admin/evenements/[id]
 *
 * Affiche la liste des participants d'un event avec :
 *   - Cases a cocher Jouer / Aider / Regarder (multi-select, au moins 1 obligatoire)
 *   - Input nb heures (si Aider est coché)
 *   - Bouton "Enregistrer" -> appelle updateParticipantMotifsAction
 *   - Bouton "Retirer" -> appelle removeParticipantFromEventAction
 *
 * Regle : le bouton "Enregistrer" est DESACTIVE si aucune case n'est cochée.
 * (Si l'admin veut tout retirer, il utilise "Retirer" explicitement.)
 */
"use client";

import { useState, useTransition } from "react";
import {
  updateParticipantMotifsAction,
  removeParticipantFromEventAction,
} from "./actions";

type Motif = "jouer" | "aider" | "regarder";

export interface ParticipantRow {
  participant_id: string;
  prenom: string;
  nom: string;
  sexe: "F" | "M" | "X" | null;
  date_naissance: string | null;
  phone: string | null;
  pre_inscrit: boolean;
  // motifs deja cochés (issus de vea.presences)
  motifs: Motif[];
  heures_aide: number;
}

interface ParticipantsListProps {
  eventSlug: string;
  participants: ParticipantRow[];
}

export default function ParticipantsList({ eventSlug, participants }: ParticipantsListProps) {
  if (participants.length === 0) {
    return (
      <div className="card-clean p-8 text-center">
        <p className="text-sm text-vea-text-muted">
          Aucun participant pour le moment.
        </p>
        <p className="text-xs text-vea-text-dim mt-2">
          Quand quelqu&apos;un scannera le QR ou que tu ajouteras manuellement,
          il apparaitra ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {participants.map((p) => (
        <ParticipantRowCard
          key={p.participant_id}
          eventSlug={eventSlug}
          row={p}
        />
      ))}
    </div>
  );
}

// ============================================================================
// ParticipantRowCard : une card editable par participant
// ============================================================================
interface RowProps {
  eventSlug: string;
  row: ParticipantRow;
}

function ParticipantRowCard({ eventSlug, row }: RowProps) {
  const [motifs, setMotifs] = useState<Set<Motif>>(new Set(row.motifs));
  const [heures, setHeures] = useState(String(row.heures_aide || 1));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  // Calcul age pour affichage
  const age = row.date_naissance
    ? Math.floor(
        (Date.now() - new Date(row.date_naissance).getTime()) /
          (365.25 * 24 * 3600 * 1000)
      )
    : null;

  // Detection si modif faite par rapport a l'etat initial
  const initialMotifs = new Set(row.motifs);
  const isDirty =
    motifs.size !== initialMotifs.size ||
    [...motifs].some((m) => !initialMotifs.has(m)) ||
    (motifs.has("aider") && Number(heures) !== row.heures_aide);

  // Regle : >= 1 motif obligatoire pour pouvoir valider
  const canSave = motifs.size > 0 && isDirty;

  function toggle(m: Motif) {
    setError("");
    setMessage("");
    setMotifs((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }

  function handleSave() {
    if (!canSave) return;
    setError("");
    setMessage("");

    startTransition(async () => {
      const result = await updateParticipantMotifsAction({
        participantId: row.participant_id,
        eventSlug,
        motifs: [...motifs] as Motif[],
        heuresAide: motifs.has("aider") ? Number(heures) : undefined,
      });
      if (!result.success) {
        setError(result.error ?? "Erreur inconnue");
      } else {
        setMessage("Enregistre.");
      }
    });
  }

  function handleRemove() {
    if (!confirm(`Retirer ${row.prenom} ${row.nom} entierement de cet event ?\nSes XP gagnes sur cet event seront supprimes (recalcul auto).`)) {
      return;
    }
    setError("");
    setMessage("");

    startTransition(async () => {
      const result = await removeParticipantFromEventAction({
        participantId: row.participant_id,
        eventSlug,
      });
      if (!result.success) {
        setError(result.error ?? "Erreur inconnue");
      } else {
        setMessage("Retire de l'event.");
        setMotifs(new Set());
      }
    });
  }

  return (
    <div className="card-clean p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-vea-text">
            {row.prenom} {row.nom}
            {row.pre_inscrit && (
              <span className="ml-2 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-vea-bg text-vea-text-dim">
                Pre-inscrit
              </span>
            )}
          </h3>
          <p className="text-[11px] text-vea-text-muted mt-0.5">
            {row.sexe === "F" ? "Fille" : row.sexe === "M" ? "Garcon" : "Autre"}
            {age !== null && ` · ${age} ans`}
            {row.phone && ` · ${row.phone}`}
          </p>
        </div>
      </div>

      {/* Cases motifs */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <MotifCheck label="🎮 Jouer" active={motifs.has("jouer")} onClick={() => toggle("jouer")} />
        <MotifCheck label="💪 Aider" active={motifs.has("aider")} onClick={() => toggle("aider")} />
        <MotifCheck label="👀 Regarder" active={motifs.has("regarder")} onClick={() => toggle("regarder")} />
      </div>

      {/* Si Aider, input heures */}
      {motifs.has("aider") && (
        <div className="mb-3">
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-vea-text-muted mb-1">
            Heures aide
          </label>
          <input
            type="number" step="0.5" min="0.5" max="24"
            value={heures}
            onChange={(e) => setHeures(e.target.value)}
            className="w-32 bg-white border border-vea-border rounded-lg px-3 py-1.5 text-vea-text text-sm focus:outline-none focus:border-vea-accent"
          />
        </div>
      )}

      {/* Warning regle "1 motif min" */}
      {motifs.size === 0 && (
        <p className="text-[10px] text-vea-accent italic mb-2">
          Au moins 1 motif requis. Pour retirer le participant entierement,
          utilise le bouton Retirer.
        </p>
      )}

      {/* Erreurs / messages */}
      {error && (
        <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-3 py-2 text-xs text-vea-accent mb-2">
          {error}
        </div>
      )}
      {message && (
        <div className="border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2 text-xs text-emerald-700 mb-2">
          {message}
        </div>
      )}

      {/* Boutons actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || isPending}
          className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full bg-vea-accent text-white hover:bg-vea-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? "..." : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border border-vea-border text-vea-text-muted hover:border-red-500 hover:text-red-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Retirer de l&apos;event
        </button>
      </div>
    </div>
  );
}

// Mini button checkbox-like
function MotifCheck({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-semibold py-2 rounded-lg border-2 transition-all ${
        active
          ? "border-vea-accent bg-vea-accent-soft text-vea-accent"
          : "border-vea-border bg-white text-vea-text-muted hover:border-vea-accent/40"
      }`}
    >
      {label}
    </button>
  );
}
