/**
 * Page Agenda VEA
 * Filtres (Tous/Tournois/Événements/Ateliers) + grille d'événements placeholders.
 *
 * "use client" car on utilise useState pour le filtre actif.
 */
"use client";

import { useState } from "react";

type EventType = "all" | "tournoi" | "evenement" | "atelier";

interface VeaEvent {
  title: string;
  date: string;
  location: string;
  type: EventType;
  cta: string;
}

const FILTERS: { label: string; value: EventType }[] = [
  { label: "Tous", value: "all" },
  { label: "Tournois", value: "tournoi" },
  { label: "Événements", value: "evenement" },
  { label: "Ateliers", value: "atelier" },
];

const EVENTS: VeaEvent[] = [
  {
    title: "Tournoi EA FC mensuel",
    date: "12 Avril 2026",
    location: "Amiens — MJC Nord",
    type: "tournoi",
    cta: "S'inscrire",
  },
  {
    title: "Soirée découverte VR",
    date: "26 Avril 2026",
    location: "Amiens — MJC Étouvie",
    type: "evenement",
    cta: "En savoir plus",
  },
  {
    title: "Atelier sensibilisation numérique",
    date: "5 Mai 2026",
    location: "Amiens — Centre social",
    type: "atelier",
    cta: "En savoir plus",
  },
  {
    title: "Clash Royale Open #3",
    date: "17 Mai 2026",
    location: "En ligne",
    type: "tournoi",
    cta: "S'inscrire",
  },
  {
    title: "Gaming & Insertion",
    date: "7 Juin 2026",
    location: "Amiens — Espace Dewailly",
    type: "evenement",
    cta: "En savoir plus",
  },
  {
    title: "Atelier création de contenu",
    date: "21 Juin 2026",
    location: "Amiens — MJC Nord",
    type: "atelier",
    cta: "En savoir plus",
  },
];

const TYPE_BADGES: Record<EventType, string> = {
  all: "",
  tournoi: "Tournoi",
  evenement: "Événement",
  atelier: "Atelier",
};

export default function AgendaPage() {
  const [filter, setFilter] = useState<EventType>("all");

  const filtered = filter === "all"
    ? EVENTS
    : EVENTS.filter((e) => e.type === filter);

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="pt-20 pb-12 px-4 bg-gradient-to-b from-vea-dark to-vea-navy">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-vea-white mb-4">
            Agenda &amp; Événements
          </h1>
          <p className="text-lg text-vea-text-muted max-w-2xl mx-auto">
            Retrouvez tous les événements VEA à venir.
          </p>
        </div>
      </section>

      {/* ===== FILTRES ===== */}
      <section className="py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-vea-accent text-white"
                  : "bg-vea-card border border-vea-border text-vea-text-muted hover:text-vea-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* ===== GRILLE ===== */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((event) => (
              <div
                key={event.title}
                className="bg-vea-card border border-vea-border rounded-xl overflow-hidden hover:border-vea-accent/30 transition-colors group"
              >
                {/* Image placeholder */}
                <div className="h-40 bg-vea-navy flex items-center justify-center">
                  <span className="text-vea-text-dim text-xs uppercase tracking-wider">
                    Photo à venir
                  </span>
                </div>

                <div className="p-5">
                  {/* Badge type */}
                  <span className="inline-block mb-2 text-[10px] font-semibold uppercase tracking-wider text-vea-accent bg-vea-accent/10 px-2.5 py-1 rounded-md">
                    {TYPE_BADGES[event.type]}
                  </span>

                  <p className="text-xs text-vea-text-dim mb-1">
                    {event.date}
                  </p>
                  <h3 className="text-base font-bold text-vea-white mb-1 group-hover:text-vea-accent transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-xs text-vea-text-muted mb-4">
                    {event.location}
                  </p>

                  <button
                    type="button"
                    className="w-full bg-vea-accent/10 hover:bg-vea-accent/20 text-vea-accent text-sm font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    {event.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
