/**
 * RapportForm — Client Component pour rédiger un nouveau rapport
 *
 * V1 simple : champs principaux + textarea Markdown brut (pas de preview live).
 * V2 : preview Markdown live + export PDF auto via skill pdf.
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRapportAction, type RapportType } from "../actions";

interface ParticipantOption {
  id: string;
  prenom: string;
  nom: string;
  role: string;
  est_mineur: boolean | null;
}

interface RapportFormProps {
  participants: ParticipantOption[];
}

const TYPES: { value: RapportType; label: string; description: string }[] = [
  { value: "PV_CA", label: "PV de CA", description: "Procès-verbal Conseil d'Administration" },
  { value: "PV_AG", label: "PV d'AG", description: "Procès-verbal Assemblée Générale" },
  { value: "convocation", label: "Convocation", description: "Convocation réunion (CA, AG, bureau)" },
  { value: "rapport_activite", label: "Rapport d'activité", description: "Rapport annuel d'activité" },
  { value: "CR_reunion", label: "CR de réunion", description: "Compte-rendu informel" },
  { value: "autre", label: "Autre", description: "Tout document de gouvernance" },
];

function displayName(p: ParticipantOption): string {
  if (p.est_mineur) {
    return `${p.prenom} ${(p.nom ?? "").charAt(0).toUpperCase()}.`;
  }
  return `${p.prenom} ${p.nom}`;
}

// Template prerempli selon le type, pour aider à structurer
function getTemplate(type: RapportType): string {
  switch (type) {
    case "PV_CA":
      return `# Procès-verbal du Conseil d'Administration

**Date** :
**Lieu** :
**Heure de début** :

## Présents

-

## Ordre du jour

1.

## Délibérations

### 1.

## Décisions

-

## Clôture

Heure de fin :
`;
    case "PV_AG":
      return `# Procès-verbal de l'Assemblée Générale

**Date** :
**Lieu** :
**Heure de début** :

## Quorum

Membres présents :
Membres représentés :
Total :

## Ordre du jour

1.

## Rapports

### Rapport moral du président

### Rapport financier du trésorier

### Rapport d'activité

## Votes

| Résolution | Pour | Contre | Abstention |
|---|---|---|---|
|  |  |  |  |

## Clôture

Heure de fin :
`;
    case "convocation":
      return `# Convocation

Vous êtes convoqué(e) à la réunion suivante :

**Date** :
**Heure** :
**Lieu** :

## Ordre du jour

1.

Merci de confirmer votre présence avant le _date_.
`;
    case "rapport_activite":
      return `# Rapport d'activité — Saison ____

## Vie de l'association

## Événements organisés

## Indicateurs

- Nombre d'adhérents :
- Nombre d'événements :
- Heures de bénévolat :

## Partenariats

## Bilan financier (résumé)

## Perspectives saison suivante
`;
    case "CR_reunion":
      return `# Compte-rendu de réunion

**Date** :
**Présents** :

## Sujets abordés

1.

## Décisions / actions

-
`;
    default:
      return "";
  }
}

export default function RapportForm({ participants }: RapportFormProps) {
  const router = useRouter();
  const [type, setType] = useState<RapportType>("CR_reunion");
  const [titre, setTitre] = useState("");
  const [dateReunion, setDateReunion] = useState(new Date().toISOString().slice(0, 10));
  const [contenu, setContenu] = useState(getTemplate("CR_reunion"));
  const [participantsPresents, setParticipantsPresents] = useState<string[]>([]);
  const [participantsSearch, setParticipantsSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleTypeChange(newType: RapportType) {
    setType(newType);
    // Si le contenu est vide ou un template précédent, on remplace
    const isOnlyTemplate = TYPES.some((t) => contenu.trim() === getTemplate(t.value).trim());
    if (!contenu.trim() || isOnlyTemplate) {
      setContenu(getTemplate(newType));
    }
  }

  function toggleParticipant(id: string) {
    setParticipantsPresents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!titre.trim()) {
      setError("Titre requis.");
      return;
    }

    startTransition(async () => {
      const result = await createRapportAction({
        type,
        titre,
        date_reunion: dateReunion,
        contenu_markdown: contenu,
        participants_presents: participantsPresents,
      });

      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      router.push(`/admin/rapports/${result.rapportId}`);
      router.refresh();
    });
  }

  const filteredParticipants = participantsSearch.trim()
    ? participants.filter((p) => {
        const q = participantsSearch.toLowerCase();
        return p.prenom.toLowerCase().includes(q) || (p.nom ?? "").toLowerCase().includes(q);
      })
    : participants;

  const inputClass =
    "w-full bg-white border border-vea-border rounded-lg px-4 py-3 text-vea-text text-sm placeholder-vea-text-dim focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15 transition-all";
  const labelClass =
    "block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="card-clean p-6 space-y-5">
      {/* Type */}
      <div>
        <label htmlFor="type" className={labelClass}>
          Type
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => handleTypeChange(e.target.value as RapportType)}
          className={inputClass}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label} — {t.description}
            </option>
          ))}
        </select>
      </div>

      {/* Titre + Date */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="titre" className={labelClass}>
            Titre <span className="text-vea-accent">*</span>
          </label>
          <input
            type="text"
            id="titre"
            value={titre}
            onChange={(e) => setTitre(e.target.value.slice(0, 200))}
            maxLength={200}
            className={inputClass}
            placeholder="Ex : PV de CA du 12 juin 2026"
          />
        </div>
        <div>
          <label htmlFor="date_reunion" className={labelClass}>
            Date réunion <span className="text-vea-accent">*</span>
          </label>
          <input
            type="date"
            id="date_reunion"
            value={dateReunion}
            onChange={(e) => setDateReunion(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Participants présents */}
      <div>
        <label htmlFor="participants_search" className={labelClass}>
          Participants présents (optionnel)
        </label>
        <input
          type="text"
          id="participants_search"
          value={participantsSearch}
          onChange={(e) => setParticipantsSearch(e.target.value)}
          className={inputClass}
          placeholder="Tapez pour filtrer..."
        />
        <div className="mt-2 max-h-40 overflow-y-auto border border-vea-border rounded-lg">
          {filteredParticipants.length === 0 ? (
            <p className="text-xs text-vea-text-dim italic p-3 text-center">Aucun membre</p>
          ) : (
            filteredParticipants.slice(0, 30).map((p) => {
              const isSelected = participantsPresents.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleParticipant(p.id)}
                  className={`w-full text-left px-3 py-2 text-xs border-b border-vea-border last:border-0 transition-colors ${
                    isSelected ? "bg-vea-accent-soft text-vea-accent font-semibold" : "hover:bg-vea-bg text-vea-text"
                  }`}
                >
                  <span className="inline-block w-4 mr-2">
                    {isSelected ? "✓" : "·"}
                  </span>
                  {displayName(p)}
                  <span className="text-[9px] text-vea-text-dim ml-2">({p.role})</span>
                </button>
              );
            })
          )}
        </div>
        {participantsPresents.length > 0 && (
          <p className="text-[10px] text-vea-accent mt-1">
            {participantsPresents.length} participant(s) sélectionné(s)
          </p>
        )}
      </div>

      {/* Contenu Markdown */}
      <div>
        <label htmlFor="contenu" className={labelClass}>
          Contenu (Markdown)
        </label>
        <textarea
          id="contenu"
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          rows={18}
          className={inputClass + " font-mono text-xs"}
          placeholder="# Titre&#10;## Section&#10;- Point 1&#10;- Point 2"
        />
        <p className="text-[10px] text-vea-text-dim mt-1 italic">
          Markdown supporté : titres (#, ##), listes (-), gras (**texte**),
          italique (*texte*), tableaux. Le rendu apparaîtra sur la page détail.
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-3 text-sm text-vea-accent">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Création..." : "Créer le brouillon"}
      </button>
      <p className="text-[10px] text-vea-text-dim italic text-center">
        Le rapport sera créé en statut <strong>Brouillon</strong>. Tu pourras
        ensuite le passer en <strong>Validé</strong> puis <strong>Publié</strong> depuis le détail.
      </p>
    </form>
  );
}
