/**
 * Page Agenda VEA — REFONTE VIOLET + ROUGE + MOTION
 *
 * 👉 DYNAMIQUE : charge les événements depuis la BDD via /api/evenements?all=true
 * 👉 Plus aucun événement hardcodé — tout vient de Prisma/MySQL
 *
 * Structure :
 * 1. Header avec titre + séparateur
 * 2. Filtres par type (Tous, Tournoi, Atelier, Animation, Compétition)
 * 3. Section "Prochains événements" (date >= aujourd'hui + actif)
 * 4. Section "Nos dernières actions" (date < aujourd'hui = passés)
 * 5. State loading + état vide si BDD vide
 */
"use client";

import { useState, useEffect } from "react";
import ScrollReveal from "@/components/ScrollReveal";

type Evenement = {
  id: string;
  titre: string;
  description: string | null;
  date: string;
  lieu: string;
  type: string;
  actif: boolean;
};

export default function AgendaPage() {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [filtre, setFiltre] = useState<string>("tous");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/evenements?all=true")
      .then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setEvenements(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[Agenda]", err);
        setLoading(false);
      });
  }, []);

  const now = new Date();
  const aVenir = evenements.filter(
    (e) => new Date(e.date) >= now && e.actif
  );
  const passes = evenements.filter((e) => new Date(e.date) < now);

  const filtres = ["tous", "TOURNOI", "ATELIER", "ANIMATION", "COMPETITION"];

  const eventsFiltres = (liste: Evenement[]) =>
    filtre === "tous" ? liste : liste.filter((e) => e.type === filtre);

  return (
    <main className="min-h-screen bg-vea-dark pt-32 pb-20">
      <div className="container mx-auto px-6">
        {/* ===== Header ===== */}
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-black text-gradient-vea uppercase mb-4">
              Agenda &amp; Événements
            </h1>
            <div className="section-separator w-24 mx-auto" />
            <p className="text-vea-text-muted mt-4">
              Toutes les actions VEA depuis 2022.
            </p>
          </div>
        </ScrollReveal>

        {/* ===== Filtres ===== */}
        <div className="flex flex-wrap gap-2 mb-12 justify-center">
          {filtres.map((f) => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filtre === f
                  ? "bg-vea-red text-white"
                  : "border border-vea-border text-vea-text-muted hover:border-vea-red/50"
              }`}
            >
              {f === "tous"
                ? "Tous"
                : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* ===== Loading ===== */}
        {loading && (
          <p className="text-center text-vea-text-muted py-12">Chargement...</p>
        )}

        {/* ===== Prochains événements ===== */}
        {eventsFiltres(aVenir).length > 0 && (
          <section className="mb-16">
            <ScrollReveal>
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-vea-red animate-pulse inline-block" />
                Prochains événements
              </h2>
            </ScrollReveal>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventsFiltres(aVenir).map((ev, i) => (
                <ScrollReveal key={ev.id} delay={i * 0.05}>
                  <EventCard ev={ev} futur />
                </ScrollReveal>
              ))}
            </div>
          </section>
        )}

        {/* ===== Événements passés ===== */}
        {eventsFiltres(passes).length > 0 && (
          <section>
            <ScrollReveal>
              <h2 className="text-2xl font-black text-white mb-6">
                Nos dernières actions
              </h2>
              <p className="text-vea-text-muted text-sm mb-6">
                Tout ce que VEA a organisé ou participé depuis sa création.
              </p>
            </ScrollReveal>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventsFiltres(passes).map((ev, i) => (
                <ScrollReveal key={ev.id} delay={i * 0.05}>
                  <EventCard ev={ev} />
                </ScrollReveal>
              ))}
            </div>
          </section>
        )}

        {/* ===== État vide ===== */}
        {!loading && evenements.length === 0 && (
          <div className="text-center py-20">
            <p className="text-vea-text-muted text-lg">
              Aucun événement pour le moment.
            </p>
            <p className="text-vea-text-dim text-sm mt-2">
              Va dans le dashboard admin pour importer les événements VEA.
            </p>
          </div>
        )}

        {/* ===== Compteur ===== */}
        {!loading && evenements.length > 0 && (
          <p className="text-xs text-vea-text-dim text-center mt-12">
            {eventsFiltres([...aVenir, ...passes]).length} événement
            {eventsFiltres([...aVenir, ...passes]).length > 1 ? "s" : ""}{" "}
            affiché{eventsFiltres([...aVenir, ...passes]).length > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </main>
  );
}

/**
 * Composant EventCard — couleurs violet/rouge
 */
function EventCard({
  ev,
  futur = false,
}: {
  ev: Evenement;
  futur?: boolean;
}) {
  const date = new Date(ev.date);

  const typeColors: Record<string, string> = {
    TOURNOI: "text-vea-red border-vea-red",
    ATELIER: "text-green-400 border-green-400",
    ANIMATION: "text-vea-purple-light border-vea-purple-light",
    COMPETITION: "text-yellow-400 border-yellow-400",
  };

  return (
    <div className="card-glow p-6 rounded-2xl flex flex-col gap-4 h-full">
      {/* Ligne du haut : badge type + badge statut */}
      <div className="flex items-center justify-between">
        <span
          className={`text-xs px-3 py-1 rounded-full border font-semibold uppercase tracking-wider ${
            typeColors[ev.type] || "text-vea-red border-vea-red"
          }`}
        >
          {ev.type.toLowerCase()}
        </span>
        {futur ? (
          <span className="text-xs bg-vea-red/20 text-vea-red px-3 py-1 rounded-full">
            À venir
          </span>
        ) : (
          <span className="text-xs bg-gray-500/20 text-gray-400 px-3 py-1 rounded-full">
            Passé
          </span>
        )}
      </div>

      {/* Titre + description */}
      <div>
        <h3 className="text-white font-bold text-lg leading-tight mb-1">
          {ev.titre}
        </h3>
        {ev.description && (
          <p className="text-vea-text-muted text-sm line-clamp-2">
            {ev.description}
          </p>
        )}
      </div>

      {/* Date + lieu */}
      <div className="mt-auto space-y-1">
        <p className="text-vea-text-muted text-sm flex items-center gap-2">
          <span>📅</span>
          {date.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <p className="text-vea-text-muted text-sm flex items-center gap-2">
          <span>📍</span>
          {ev.lieu}
        </p>
      </div>

      {/* Bouton inscription — seulement pour les futurs */}
      {futur && (
        <a
          href="/inscription"
          className="w-full text-center bg-vea-red hover:bg-vea-accent-hover text-white font-bold py-2 rounded-xl transition-all text-sm hover:shadow-[0_0_20px_rgba(230,57,70,0.4)]"
        >
          S&apos;inscrire
        </a>
      )}
    </div>
  );
}
