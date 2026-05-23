/**
 * EditEventForm — Édite un événement à venir sans le supprimer/recréer.
 *
 * Panneau repliable sur la fiche /admin/evenements/[id]. Pré-rempli avec les
 * valeurs actuelles. Le slug n'est PAS éditable (il relie les présences/scans).
 *
 * Si la date est modifiée, une case "prévenir les abonnés" apparaît : à la
 * sauvegarde, les participants ayant un compte + notifications d'events activées
 * reçoivent une notif cloche du changement de date.
 */
"use client";

import { useState, useTransition } from "react";
import { updateEventAction } from "./actions";

const TYPES = [
  { value: "tournoi", label: "Tournoi" },
  { value: "animation", label: "Animation" },
  { value: "programme", label: "Programme" },
  { value: "reunion", label: "Réunion" },
  { value: "autre", label: "Autre" },
];

interface EditEventFormProps {
  event: {
    id: string;
    event_slug: string;
    nom: string;
    date: string; // YYYY-MM-DD (ou ISO)
    heure?: string | null; // HH:MM (colonne `heure`)
    lieu: string;
    type: string;
    description: string | null;
    capacite?: number | null;
  };
}

export default function EditEventForm({ event }: EditEventFormProps) {
  const [open, setOpen] = useState(false);

  const initialDate = (event.date ?? "").slice(0, 10); // garde AAAA-MM-JJ
  const [nom, setNom] = useState(event.nom ?? "");
  const [date, setDate] = useState(initialDate);
  const [heure, setHeure] = useState(event.heure ?? "");
  const [lieu, setLieu] = useState(event.lieu ?? "");
  const [type, setType] = useState(event.type ?? "animation");
  const [description, setDescription] = useState(event.description ?? "");
  const [capacite, setCapacite] = useState(
    event.capacite != null ? String(event.capacite) : "",
  );
  const [notifier, setNotifier] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dateChangee = date !== initialDate;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateEventAction({
        id: event.id,
        eventSlug: event.event_slug,
        nom,
        date,
        heure: heure || null,
        lieu,
        type,
        description,
        capacite: capacite.trim() === "" ? null : Number(capacite),
        notifierChangementDate: dateChangee && notifier,
      });
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      if (result.dateChangee && (result.notifies ?? 0) > 0) {
        setSuccess(`Événement mis à jour. ${result.notifies} abonné(s) notifié(s) du changement de date.`);
      } else {
        setSuccess("Événement mis à jour.");
      }
    });
  }

  const inputClass =
    "w-full bg-white border border-vea-border rounded-lg px-3 py-2 text-sm text-vea-text focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15";
  const labelClass = "block text-xs font-semibold text-vea-text-muted mb-1";

  return (
    <div className="card-clean p-4 mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-bold text-vea-text">
          Éditer l&apos;événement {open ? "▲" : "▼"}
        </span>
        <span className="text-[11px] text-vea-text-dim">
          changer date / lieu / infos sans supprimer
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="ev-nom" className={labelClass}>Nom *</label>
            <input id="ev-nom" value={nom} onChange={(e) => setNom(e.target.value.slice(0, 200))} required className={inputClass} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="ev-date" className={labelClass}>Date *</label>
              <input type="date" id="ev-date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label htmlFor="ev-heure" className={labelClass}>Heure</label>
              <input type="time" id="ev-heure" value={heure} onChange={(e) => setHeure(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="ev-lieu" className={labelClass}>Lieu *</label>
              <input id="ev-lieu" value={lieu} onChange={(e) => setLieu(e.target.value.slice(0, 200))} required className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ev-type" className={labelClass}>Type *</label>
              <select id="ev-type" value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ev-cap" className={labelClass}>Capacité (optionnel)</label>
              <input type="number" min={0} id="ev-cap" value={capacite} onChange={(e) => setCapacite(e.target.value)} className={inputClass} placeholder="—" />
            </div>
          </div>

          <div>
            <label htmlFor="ev-desc" className={labelClass}>Description</label>
            <textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value.slice(0, 2000))} rows={3} className={inputClass} />
          </div>

          {/* Slug en lecture seule (non modifiable) */}
          <p className="text-[11px] text-vea-text-dim">
            Identifiant (non modifiable) : <span className="font-mono">{event.event_slug}</span>
          </p>

          {dateChangee && (
            <label className="flex items-start gap-2 text-sm text-vea-text bg-vea-accent-soft/30 border border-vea-accent/20 rounded-lg px-3 py-2">
              <input type="checkbox" checked={notifier} onChange={(e) => setNotifier(e.target.checked)} className="mt-0.5 w-4 h-4 accent-vea-accent" />
              <span>La date a changé — <strong>prévenir les abonnés</strong> (membres avec notifications d&apos;events activées).</span>
            </label>
          )}

          {error && (
            <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}
          {success && (
            <div role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</div>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="px-4 py-2 rounded-full bg-vea-accent text-white text-sm font-bold hover:bg-vea-accent-hover disabled:opacity-50">
              {isPending ? "Enregistrement…" : "Enregistrer les modifications"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-full border border-vea-border text-sm text-vea-text-muted hover:text-vea-text">
              Fermer
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
