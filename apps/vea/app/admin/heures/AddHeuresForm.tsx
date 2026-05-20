/**
 * AddHeuresForm — Form client pour ajouter heures benevolat / XP a un participant.
 *
 * Workflow :
 *   1. Admin choisit un participant dans la liste (deroulant avec recherche)
 *   2. Choisit le type d'action :
 *      - benevolat (saisit nb heures, XP calcule auto = heures * 15)
 *      - tournoi / podium / urgent (XP fixe selon bareme)
 *      - admin_manuel (saisit XP libre)
 *   3. Saisit une description (contexte obligatoire pour audit)
 *   4. Soumet -> Server Action addHeuresAction
 *   5. Le trigger PG fait le reste (XP, badges, points VENA)
 *
 * Pourquoi Client Component : useState pour les inputs + transition pour feedback.
 */
"use client";

import { useState, useTransition } from "react";
import { addHeuresAction, type ActionType } from "./actions";
import { XP_BAREME } from "@/lib/gamification";

export interface ParticipantOption {
  id: string;
  prenom: string;
  nom: string;
  pseudo: string | null;
  role: string;
  xp_saison_actuelle: number;
}

interface AddHeuresFormProps {
  participants: ParticipantOption[];
  /** Pre-rempli automatiquement quand on arrive via /admin/evenements/[id]
   *  -> URL ?event=NOM. Le form pre-remplit la description avec [NOM] en prefixe. */
  initialDescription?: string;
  /** Action par defaut. Quand on vient d'un raccourci event 'urgence', on prend
   *  'urgent' (+20 XP) par defaut. Sinon 'benevolat'. */
  initialAction?: ActionType;
}

const ACTION_LABELS: Record<ActionType, string> = {
  benevolat: "Bénévolat (heures terrain)",
  tournoi: "Participation tournoi",
  podium: "Podium / victoire tournoi",
  urgent: "Aide ponctuelle urgente",
  admin_manuel: "Attribution manuelle (XP libre)",
};

export default function AddHeuresForm({
  participants,
  initialDescription = "",
  initialAction = "benevolat",
}: AddHeuresFormProps) {
  const [participantId, setParticipantId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [action, setAction] = useState<ActionType>(initialAction);
  const [heures, setHeures] = useState("1");
  const [xpManuel, setXpManuel] = useState("10");
  const [description, setDescription] = useState(initialDescription);
  const [saison, setSaison] = useState("2026/27");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filtrage participants par recherche (prenom/nom/pseudo)
  const filteredParticipants = searchQuery.trim()
    ? participants.filter((p) => {
        const q = searchQuery.toLowerCase();
        return (
          p.prenom?.toLowerCase().includes(q) ||
          p.nom?.toLowerCase().includes(q) ||
          (p.pseudo ?? "").toLowerCase().includes(q)
        );
      })
    : participants;

  // Preview XP qui sera attribue
  let previewXp = 0;
  if (action === "benevolat") {
    previewXp = Math.round((Number(heures) || 0) * XP_BAREME.benevolat_par_heure);
  } else if (action === "tournoi") previewXp = XP_BAREME.tournoi;
  else if (action === "podium") previewXp = XP_BAREME.podium;
  else if (action === "urgent") previewXp = XP_BAREME.urgent;
  else if (action === "admin_manuel") previewXp = Number(xpManuel) || 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(null);

    if (!participantId) {
      setError("Choisis un participant.");
      return;
    }
    if (!description.trim()) {
      setError("Une description est requise (contexte de l'action).");
      return;
    }

    startTransition(async () => {
      const result = await addHeuresAction({
        participant_id: participantId,
        action,
        heures: action === "benevolat" ? Number(heures) : undefined,
        xp_manuel: action === "admin_manuel" ? Number(xpManuel) : undefined,
        description: description.trim(),
        saison,
      });

      if (result.success) {
        const selected = participants.find((p) => p.id === participantId);
        const name = selected ? `${selected.prenom} ${selected.nom}` : "le participant";
        setSuccess(`+${result.xpGagne ?? previewXp} XP ajoutés à ${name}.`);
        // Reset partiel : on garde le participant pour permettre des ajouts en série
        setDescription("");
        if (action === "benevolat") setHeures("1");
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(result.error ?? "Erreur inconnue");
      }
    });
  }

  const inputClass =
    "w-full bg-white border border-vea-border rounded-lg px-4 py-3 text-vea-text text-sm placeholder-vea-text-dim focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15 transition-all";
  const labelClass =
    "block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="card-clean p-6 space-y-5">
      {/* Participant — recherche + select */}
      <div>
        <label htmlFor="search" className={labelClass}>
          Rechercher un participant
        </label>
        <input
          type="text"
          id="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={inputClass}
          placeholder="Tapez prénom, nom ou pseudo..."
        />
        <div className="mt-2 max-h-48 overflow-y-auto border border-vea-border rounded-lg">
          {filteredParticipants.length === 0 ? (
            <p className="text-xs text-vea-text-dim italic p-3 text-center">
              Aucun participant trouvé
            </p>
          ) : (
            filteredParticipants.slice(0, 20).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setParticipantId(p.id)}
                className={`w-full text-left px-3 py-2 text-xs border-b border-vea-border last:border-0 transition-colors ${
                  participantId === p.id
                    ? "bg-vea-accent-soft text-vea-accent font-semibold"
                    : "hover:bg-vea-bg text-vea-text"
                }`}
              >
                <div className="font-bold">
                  {p.prenom} {p.nom}{" "}
                  {p.pseudo && (
                    <span className="text-vea-text-dim font-normal">({p.pseudo})</span>
                  )}
                </div>
                <div className="text-[10px] text-vea-text-dim">
                  {p.role} · XP saison : {p.xp_saison_actuelle}
                </div>
              </button>
            ))
          )}
        </div>
        {participantId && (
          <p className="text-[10px] text-vea-accent mt-1">
            ✓ Participant sélectionné
          </p>
        )}
      </div>

      {/* Type d'action */}
      <div>
        <label htmlFor="action" className={labelClass}>
          Type d&apos;action
        </label>
        <select
          id="action"
          value={action}
          onChange={(e) => setAction(e.target.value as ActionType)}
          className={inputClass}
        >
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* Heures (si benevolat) */}
      {action === "benevolat" && (
        <div>
          <label htmlFor="heures" className={labelClass}>
            Nombre d&apos;heures
          </label>
          <input
            type="number"
            id="heures"
            min="0.5"
            step="0.5"
            max="100"
            value={heures}
            onChange={(e) => setHeures(e.target.value)}
            className={inputClass}
          />
          <p className="text-[10px] text-vea-text-dim mt-1 italic">
            1h = 15 XP. Sera aussi ajouté aux heures bénévolat de la saison.
          </p>
        </div>
      )}

      {/* XP manuel (si admin_manuel) */}
      {action === "admin_manuel" && (
        <div>
          <label htmlFor="xp_manuel" className={labelClass}>
            XP à attribuer (libre)
          </label>
          <input
            type="number"
            id="xp_manuel"
            min="1"
            max="1000"
            value={xpManuel}
            onChange={(e) => setXpManuel(e.target.value)}
            className={inputClass}
          />
        </div>
      )}

      {/* Description */}
      <div>
        <label htmlFor="description" className={labelClass}>
          Description (contexte) <span className="text-vea-accent">*</span>
        </label>
        <input
          type="text"
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 280))}
          maxLength={280}
          className={inputClass}
          placeholder="Ex : Tour du Marais 15/05/2026, encadrement"
        />
        <p className="text-[10px] text-vea-text-dim mt-1 italic">
          Apparaîtra dans l&apos;historique XP du participant (audit trail).
        </p>
      </div>

      {/* Saison */}
      <div>
        <label htmlFor="saison" className={labelClass}>
          Saison
        </label>
        <select
          id="saison"
          value={saison}
          onChange={(e) => setSaison(e.target.value)}
          className={inputClass}
        >
          <option value="2026/27">2026/27 — L&apos;Éveil (saison en cours)</option>
          <option value="2027/28">2027/28 — L&apos;Ascension</option>
        </select>
      </div>

      {/* Preview XP */}
      <div className="bg-vea-accent-soft border border-vea-accent/20 rounded-lg p-4 text-center">
        <p className="text-xs text-vea-text-muted mb-1 uppercase tracking-widest">
          XP qui sera attribué
        </p>
        <p className="text-3xl font-black text-vea-accent">+{previewXp} XP</p>
      </div>

      {/* Feedback */}
      {error && (
        <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-3 text-sm text-vea-accent">
          {error}
        </div>
      )}
      {success && (
        <div className="border border-green-300 bg-green-50 rounded-lg px-4 py-3 text-sm text-green-700">
          ✓ {success}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !participantId}
        className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Ajout en cours..." : `Ajouter +${previewXp} XP`}
      </button>
    </form>
  );
}
