/**
 * Page Agenda VEA — /agenda
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
 *
 * Le composant EventCard gère l'affichage d'un événement
 * avec couleur par type et badge "À venir" / "Passé".
 */
"use client";

import { useState, useEffect } from "react";

// 👉 Type qui correspond exactement au model Prisma Evenement
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

  // 👉 Au montage du composant, on fetch TOUS les événements (passés + futurs)
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

  // 👉 Sépare les événements en 2 listes :
  // - À venir = date future + actif
  // - Passés = date passée (peu importe actif)
  const aVenir = evenements.filter(
    (e) => new Date(e.date) >= now && e.actif
  );
  const passes = evenements.filter((e) => new Date(e.date) < now);

  // 👉 Liste des filtres — correspond aux valeurs de l'enum TypeEvenement
  const filtres = ["tous", "TOURNOI", "ATELIER", "ANIMATION", "COMPETITION"];

  // 👉 Applique le filtre sur une liste d'événements
  const eventsFiltres = (liste: Evenement[]) =>
    filtre === "tous" ? liste : liste.filter((e) => e.type === filtre);

  return (
    <main className="min-h-screen bg-[#060d1f] pt-32 pb-20">
      <div className="container mx-auto px-6">
        {/* ===== Header ===== */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-black text-gradient uppercase mb-4">
            Agenda &amp; Événements
          </h1>
          <div className="section-separator w-24 mx-auto" />
          <p className="text-[#7a8fa6] mt-4">
            Toutes les actions VEA depuis 2022.
          </p>
        </div>

        {/* ===== Filtres ===== */}
        <div className="flex flex-wrap gap-2 mb-12 justify-center">
          {filtres.map((f) => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filtre === f
                  ? "bg-[#4d9fff] text-white"
                  : "border border-[#1e3a5f] text-[#7a8fa6] hover:border-[#4d9fff]"
              }`}
            >
              {/* 👉 "tous" → affiche "Tous", sinon capitalise la première lettre */}
              {f === "tous"
                ? "Tous"
                : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* ===== Loading ===== */}
        {loading && (
          <p className="text-center text-[#7a8fa6] py-12">Chargement...</p>
        )}

        {/* ===== Prochains événements ===== */}
        {eventsFiltres(aVenir).length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#4d9fff] animate-pulse inline-block" />
              Prochains événements
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventsFiltres(aVenir).map((ev) => (
                <EventCard key={ev.id} ev={ev} futur />
              ))}
            </div>
          </section>
        )}

        {/* ===== Événements passés ===== */}
        {eventsFiltres(passes).length > 0 && (
          <section>
            <h2 className="text-2xl font-black text-white mb-6">
              Nos dernières actions
            </h2>
            <p className="text-[#7a8fa6] text-sm mb-6">
              Tout ce que VEA a organisé ou participé depuis sa création.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventsFiltres(passes).map((ev) => (
                <EventCard key={ev.id} ev={ev} />
              ))}
            </div>
          </section>
        )}

        {/* ===== État vide ===== */}
        {!loading && evenements.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#7a8fa6] text-lg">
              Aucun événement pour le moment.
            </p>
            <p className="text-[#7a8fa6] text-sm mt-2">
              Va dans le dashboard admin pour importer les événements VEA.
            </p>
          </div>
        )}

        {/* ===== Compteur ===== */}
        {!loading && evenements.length > 0 && (
          <p className="text-xs text-[#4a5568] text-center mt-12">
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
 * Composant EventCard
 *
 * 👉 Affiche un événement avec :
 * - Badge de type coloré (tournoi=bleu, atelier=vert, animation=violet, compétition=jaune)
 * - Badge "À venir" ou "Passé"
 * - Titre, description, date formatée en français, lieu
 * - Bouton "S'inscrire" seulement pour les événements futurs
 */
function EventCard({
  ev,
  futur = false,
}: {
  ev: Evenement;
  futur?: boolean;
}) {
  const date = new Date(ev.date);

  // 👉 Couleurs différentes par type d'événement
  const typeColors: Record<string, string> = {
    TOURNOI: "text-[#4d9fff] border-[#4d9fff]",
    ATELIER: "text-green-400 border-green-400",
    ANIMATION: "text-purple-400 border-purple-400",
    COMPETITION: "text-yellow-400 border-yellow-400",
  };

  return (
    <div className="card-glow p-6 rounded-2xl flex flex-col gap-4">
      {/* Ligne du haut : badge type + badge statut */}
      <div className="flex items-center justify-between">
        <span
          className={`text-xs px-3 py-1 rounded-full border font-semibold uppercase tracking-wider ${
            typeColors[ev.type] || "text-[#4d9fff] border-[#4d9fff]"
          }`}
        >
          {ev.type.toLowerCase()}
        </span>
        {futur ? (
          <span className="text-xs bg-[#4d9fff]/20 text-[#4d9fff] px-3 py-1 rounded-full">
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
          <p className="text-[#7a8fa6] text-sm line-clamp-2">
            {ev.description}
          </p>
        )}
      </div>

      {/* Date + lieu (poussés en bas grâce à mt-auto) */}
      <div className="mt-auto space-y-1">
        <p className="text-[#7a8fa6] text-sm flex items-center gap-2">
          <span>📅</span>
          {date.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <p className="text-[#7a8fa6] text-sm flex items-center gap-2">
          <span>📍</span>
          {ev.lieu}
        </p>
      </div>

      {/* Bouton inscription — seulement pour les futurs */}
      {futur && (
        <a
          href="/inscription"
          className="w-full text-center bg-[#4d9fff] hover:bg-[#60b4ff] text-white font-bold py-2 rounded-xl transition-all text-sm hover:shadow-[0_0_20px_rgba(77,159,255,0.4)]"
        >
          S&apos;inscrire
        </a>
      )}
    </div>
  );
}
