/**
 * AddEventForm — Client Component pour creer un evenement.
 *
 * Form simple : nom, slug, date, lieu, type, description, capacite.
 * Submit -> createEventAction. Apres succes, affiche le QR code de l'event.
 */
"use client";

import { useState, useTransition } from "react";
import { createEventAction } from "./actions";
import { getQRCodeUrl, getScanUrl } from "@/lib/qrcode";

type EventType = "tournoi" | "animation" | "programme" | "reunion" | "autre";

const TYPE_LABELS: Record<EventType, string> = {
  tournoi: "Tournoi (compétition esport)",
  animation: "Animation (Jeudis Corner, LJSDLP, etc.)",
  programme: "Programme récurrent (Tour Marais, Vacances)",
  reunion: "Réunion (AG, CA, bureau)",
  autre: "Autre",
};

export default function AddEventForm({ siteOrigin }: { siteOrigin: string }) {
  const [nom, setNom] = useState("");
  const [slug, setSlug] = useState("");
  const [date, setDate] = useState("");
  const [lieu, setLieu] = useState("Amiens");
  const [type, setType] = useState<EventType>("tournoi");
  const [description, setDescription] = useState("");
  const [capacite, setCapacite] = useState("");

  const [error, setError] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Auto-generation du slug depuis le nom (kebab-case)
  function handleNomChange(value: string) {
    setNom(value);
    if (!createdToken) {
      // Si pas encore cree, on suggere un slug auto
      const auto = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50);
      setSlug(auto);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await createEventAction({
        nom,
        event_slug: slug,
        date,
        lieu,
        description: description || undefined,
        type,
        capacite: capacite ? Number(capacite) : undefined,
      });

      if (result.success && result.token) {
        setCreatedToken(result.token);
      } else {
        setError(result.error ?? "Erreur inconnue");
      }
    });
  }

  const inputClass =
    "w-full bg-white border border-vea-border rounded-lg px-4 py-3 text-vea-text text-sm placeholder-vea-text-dim focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15 transition-all";
  const labelClass =
    "block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5";

  // Si l'event vient d'etre cree, on affiche le QR code et l'URL a scanner
  if (createdToken) {
    const scanUrl = getScanUrl(createdToken, siteOrigin);
    const qrUrl = getQRCodeUrl(scanUrl, 400);
    return (
      <div className="card-clean p-8 text-center">
        <div className="inline-block mb-4 bg-vea-accent-soft border border-vea-accent/20 rounded-full px-4 py-1 text-xs uppercase tracking-widest font-bold text-vea-accent">
          ✓ Event cree
        </div>
        <h2 className="text-2xl font-black text-vea-text mb-2">{nom}</h2>
        <p className="text-sm text-vea-text-muted mb-6">
          {date} · {lieu} · {TYPE_LABELS[type]}
        </p>

        {/* QR code */}
        <div className="inline-block bg-white p-4 rounded-lg border border-vea-border mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR code de l'event" width={400} height={400} className="block" />
        </div>

        <p className="text-xs text-vea-text-dim mb-2">
          Affiche ce QR a l&apos;event. Les participants le scannent avec leur tel
          pour s&apos;enregistrer (jouer / aider / regarder).
        </p>
        <p className="text-[10px] text-vea-text-dim font-mono break-all">
          {scanUrl}
        </p>

        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <a href={qrUrl} download={`vea-qr-${slug}.png`} className="btn-primary text-sm">
            Telecharger QR (PNG)
          </a>
          <button
            type="button"
            onClick={() => {
              setCreatedToken(null);
              setNom("");
              setSlug("");
              setDate("");
              setDescription("");
              setCapacite("");
            }}
            className="btn-outline text-sm"
          >
            Creer un autre event
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-clean p-6 space-y-5">
      <div>
        <label htmlFor="nom" className={labelClass}>Nom de l&apos;event *</label>
        <input
          type="text" id="nom" value={nom}
          onChange={(e) => handleNomChange(e.target.value)}
          required minLength={3} maxLength={100} autoComplete="off"
          className={inputClass}
          placeholder="Ex : TIQE Nord 2026 — Etouvie"
        />
      </div>

      <div>
        <label htmlFor="slug" className={labelClass}>Slug (identifiant URL)</label>
        <input
          type="text" id="slug" value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
          required minLength={3} maxLength={50} autoComplete="off"
          className={inputClass}
          placeholder="tiqe-nord-2026"
        />
        <p className="text-[10px] text-vea-text-dim mt-1 italic">
          Genere auto depuis le nom. Utilise pour relier les presences.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className={labelClass}>Date *</label>
          <input
            type="date" id="date" value={date}
            onChange={(e) => setDate(e.target.value)}
            required className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="lieu" className={labelClass}>Lieu *</label>
          <input
            type="text" id="lieu" value={lieu}
            onChange={(e) => setLieu(e.target.value)}
            required maxLength={100} className={inputClass}
            placeholder="Amiens, Tour du Marais"
          />
        </div>
      </div>

      <div>
        <label htmlFor="type" className={labelClass}>Type</label>
        <select id="type" value={type} onChange={(e) => setType(e.target.value as EventType)} className={inputClass}>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>Description (optionnel)</label>
        <textarea
          id="description" value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500} rows={3}
          className={`${inputClass} resize-none`}
          placeholder="Tournoi de FC25, ouvert a tous. 16 places."
        />
      </div>

      <div>
        <label htmlFor="capacite" className={labelClass}>Capacite max (optionnel)</label>
        <input
          type="number" id="capacite" value={capacite}
          onChange={(e) => setCapacite(e.target.value)}
          min="1" max="500"
          className={inputClass}
          placeholder="16"
        />
      </div>

      {error && (
        <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-3 text-sm text-vea-accent">
          {error}
        </div>
      )}

      <button type="submit" disabled={isPending}
        className="btn-primary w-full disabled:opacity-60">
        {isPending ? "Creation..." : "Creer l'event + generer QR"}
      </button>
    </form>
  );
}
