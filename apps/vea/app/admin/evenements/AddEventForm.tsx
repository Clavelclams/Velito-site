/**
 * AddEventForm — Client Component pour creer un evenement.
 *
 * Form simple : nom, slug, date, lieu, type, description, capacite.
 * Submit -> createEventAction. Apres succes, affiche le QR code de l'event.
 */
"use client";

import { useState, useTransition } from "react";
import { createEventAction } from "./actions";
import { datesHebdomadaires } from "@/lib/calendrier-scolaire";
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
  const [heure, setHeure] = useState("");
  const [lieu, setLieu] = useState("Amiens");
  const [type, setType] = useState<EventType>("tournoi");
  const [description, setDescription] = useState("");
  const [capacite, setCapacite] = useState("");
  // [28/10/2026] Récurrence hebdomadaire (ex. Mercredis Elbeuf)
  const [repeter, setRepeter] = useState(false);
  const [jusquAu, setJusquAu] = useState("");
  const [serieCreee, setSerieCreee] = useState<{ n: number; sautees: { date: string; raison: string }[] } | null>(null);

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
        heure: heure || undefined,
        lieu,
        description: description || undefined,
        type,
        capacite: capacite ? Number(capacite) : undefined,
        repeter_jusqu_au: repeter && jusquAu ? jusquAu : undefined,
      });

      if (result.success && result.seances) {
        setSerieCreee({ n: result.seances, sautees: result.sautees ?? [] });
      } else if (result.success && result.token) {
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

  // [28/10/2026] Aperçu de la récurrence, calculé avec la même fonction que le serveur.
  const apercu = repeter && date && jusquAu && jusquAu >= date ? datesHebdomadaires(date, jusquAu) : null;
  const jjmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

  if (serieCreee) {
    return (
      <div className="card-clean p-8 text-center">
        <div className="inline-block mb-4 bg-vea-accent-soft border border-vea-accent/20 rounded-full px-4 py-1 text-xs uppercase tracking-widest font-bold text-vea-accent">
          {serieCreee.n} séances créées
        </div>
        <h2 className="text-2xl font-black text-vea-text mb-2">{nom}</h2>
        <p className="text-sm text-vea-text-muted mb-4">
          Chaque séance a sa fiche et son propre QR code, dans la liste ci-dessous.
        </p>
        {serieCreee.sautees.length > 0 && (
          <p className="text-xs text-vea-text-dim mb-4">
            Sans séance : {serieCreee.sautees.map((x) => `${jjmm(x.date)} (${x.raison})`).join(", ")}.
          </p>
        )}
        <button
          type="button"
          onClick={() => { setSerieCreee(null); setNom(""); setSlug(""); setDate(""); setHeure(""); setDescription(""); setCapacite(""); setRepeter(false); setJusquAu(""); }}
          className="btn-outline text-sm"
        >
          Creer un autre event
        </button>
      </div>
    );
  }

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
              setHeure("");
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="date" className={labelClass}>Date *</label>
          <input
            type="date" id="date" value={date}
            onChange={(e) => setDate(e.target.value)}
            required className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="heure" className={labelClass}>Heure</label>
          <input
            type="time" id="heure" value={heure}
            onChange={(e) => setHeure(e.target.value)}
            className={inputClass}
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

      {/* [28/10/2026] Récurrence hebdomadaire */}
      <div className="rounded-lg border border-vea-border p-4 space-y-3">
        <label className="flex items-center gap-3 text-sm font-semibold text-vea-text cursor-pointer">
          <input type="checkbox" checked={repeter} onChange={(e) => setRepeter(e.target.checked)} className="w-4 h-4 accent-vea-accent" />
          Répéter chaque semaine (même jour, même heure)
        </label>
        {repeter && (
          <>
            <div>
              <label htmlFor="jusquau" className={labelClass}>Jusqu&apos;au (inclus) *</label>
              <input type="date" id="jusquau" value={jusquAu} min={date || undefined} onChange={(e) => setJusquAu(e.target.value)} required className={inputClass} />
            </div>
            <p className="text-[11px] text-vea-text-dim">
              Les vacances scolaires (zone B) et les jours fériés sont sautés. Une séance = un événement avec son QR :
              chaque présence compte et rapporte ses points.
            </p>
            {apercu && (
              <div className="text-xs text-vea-text-muted space-y-1">
                <p><strong>{apercu.dates.length} séance{apercu.dates.length > 1 ? "s" : ""} :</strong> {apercu.dates.map(jjmm).join(", ")}</p>
                {apercu.sautees.length > 0 && (
                  <p>Sautées : {apercu.sautees.map((x) => `${jjmm(x.date)} (${x.raison})`).join(", ")}</p>
                )}
                {apercu.horsCalendrier && (
                  <p className="text-vea-accent">Attention : les vacances après l&apos;été 2027 ne sont pas encore dans le calendrier (lib/calendrier-scolaire.ts).</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-3 text-sm text-vea-accent">
          {error}
        </div>
      )}

      <button type="submit" disabled={isPending}
        className="btn-primary w-full disabled:opacity-60">
        {isPending ? "Creation..." : repeter ? `Creer ${apercu ? apercu.dates.length : ""} seances + QR` : "Creer l'event + generer QR"}
      </button>
    </form>
  );
}
