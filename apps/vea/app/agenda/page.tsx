/**
 * Page Agenda VEA — refonte DA claire + fusion archive statique + Prisma.
 *
 * Strategie hybride (16/05/2026) :
 *   - L'historique des evenements depuis 2023 est statique (lib/events-archive.ts).
 *     21 events documentes via rapport reseaux sociaux + base Notion.
 *   - Les NOUVEAUX evenements (a venir ou recents apres mise en place du dashboard)
 *     viennent de Prisma/MySQL via /api/evenements?all=true.
 *   - On fusionne les deux listes, dedoublonne par id, trie par date.
 *
 * Resultat : la page agenda affiche un historique riche meme si la BDD MySQL
 * est vide. Quand le dashboard admin sera utilise, les nouveaux events s'ajoutent
 * automatiquement.
 *
 * Filtres conserves : Tous / Tournoi / Atelier / Animation / Competition.
 * DA refondue pour etre coherente avec la home (fond clair, card-clean,
 * btn-primary, palette accent rouge).
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import { EVENTS_ARCHIVE, type EventArchive } from "@/lib/events-archive";

type Evenement = {
  id: string;
  titre: string;
  description: string | null;
  date: string;
  lieu: string;
  type: string;
  actif: boolean;
  /** Slug de galerie pour bouton "Voir les photos" -> /medias?event=<slug> */
  gallerySlug?: string;
};

export default function AgendaPage() {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [filtre, setFiltre] = useState<string>("tous");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Je fetch les events Prisma, puis je fusionne avec l'archive statique.
    // Si l'API plante, je tombe en fallback sur l'archive uniquement —
    // comme ca la page n'est jamais vide.
    fetch("/api/evenements?all=true")
      .then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json() as Promise<Evenement[]>;
      })
      .then((dataPrisma) => {
        // Dedoublonnage par id (la BDD peut avoir des events avec id "archive-*"
        // si Clavel a deja seede — auquel cas la BDD gagne).
        const idsPrisma = new Set(dataPrisma.map((e) => e.id));
        const archive: Evenement[] = (EVENTS_ARCHIVE as EventArchive[])
          .filter((e) => !idsPrisma.has(e.id))
          .map((e) => ({ ...e, description: e.description, gallerySlug: e.gallerySlug }));
        const merged = [...dataPrisma, ...archive];
        // Tri par date decroissante (plus recent en haut)
        merged.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setEvenements(merged);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("[Agenda] API Prisma indisponible — fallback archive:", err);
        // Fallback : on affiche au moins l'archive
        const archiveOnly: Evenement[] = (EVENTS_ARCHIVE as EventArchive[]).map(
          (e) => ({ ...e, description: e.description, gallerySlug: e.gallerySlug })
        );
        archiveOnly.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setEvenements(archiveOnly);
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
    <>
      {/* HERO */}
      <section className="hero-bg pt-28 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <span className="badge-red mb-4">Activites</span>
            <h1 className="text-4xl sm:text-5xl font-black text-vea-text mb-4 mt-4">
              Agenda &amp; <span className="text-vea-accent">Evenements</span>
            </h1>
            <p className="text-base text-vea-text-muted max-w-2xl mx-auto">
              Toutes les actions VEA depuis 2022 — tournois, animations,
              competitions et ateliers dans les quartiers d&apos;Amiens.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-12 px-4 bg-vea-bg">
        <div className="max-w-6xl mx-auto">

          {/* FILTRES */}
          <div className="flex flex-wrap gap-2 mb-12 justify-center">
            {filtres.map((f) => (
              <button
                key={f}
                onClick={() => setFiltre(f)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filtre === f
                    ? "bg-vea-accent text-white shadow-btn-accent"
                    : "bg-white border border-vea-border text-vea-text-muted hover:border-vea-accent hover:text-vea-accent"
                }`}
              >
                {f === "tous"
                  ? "Tous"
                  : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* LOADING */}
          {loading && (
            <p className="text-center text-vea-text-muted py-12">Chargement...</p>
          )}

          {/* PROCHAINS EVENEMENTS */}
          {!loading && eventsFiltres(aVenir).length > 0 && (
            <section className="mb-16">
              <ScrollReveal>
                <h2 className="text-2xl font-bold text-vea-text mb-6 flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-vea-accent animate-pulse inline-block" />
                  Prochains evenements
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

          {/* EVENEMENTS PASSES */}
          {!loading && eventsFiltres(passes).length > 0 && (
            <section>
              <ScrollReveal>
                <h2 className="text-2xl font-bold text-vea-text mb-2">
                  Nos dernieres actions
                </h2>
                <p className="text-vea-text-muted text-sm mb-8">
                  Tout ce que VEA a organise ou auquel l&apos;association a
                  participe depuis sa creation.
                </p>
              </ScrollReveal>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventsFiltres(passes).map((ev, i) => (
                  <ScrollReveal key={ev.id} delay={Math.min(i * 0.03, 0.5)}>
                    <EventCard ev={ev} />
                  </ScrollReveal>
                ))}
              </div>
            </section>
          )}

          {/* ETAT VIDE */}
          {!loading && evenements.length === 0 && (
            <div className="text-center py-20">
              <p className="text-vea-text-muted text-lg">
                Aucun evenement pour le moment.
              </p>
            </div>
          )}

          {/* COMPTEUR */}
          {!loading && evenements.length > 0 && (
            <p className="text-xs text-vea-text-dim text-center mt-12">
              {eventsFiltres([...aVenir, ...passes]).length} evenement
              {eventsFiltres([...aVenir, ...passes]).length > 1 ? "s" : ""}{" "}
              affiche{eventsFiltres([...aVenir, ...passes]).length > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 section-bg">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <div className="card-clean p-10 bg-vea-accent-soft border-vea-accent/15">
              <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mb-3">
                Tu veux participer ?
              </h2>
              <p className="text-vea-text-muted mb-6 max-w-lg mx-auto">
                Inscris-toi pour recevoir les prochaines dates et rejoindre la
                communaute VEA.
              </p>
              <Link href="/inscription" className="btn-primary">
                S&apos;inscrire
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}

/**
 * Card d'un evenement — DA claire, palette accent rouge.
 */
function EventCard({
  ev,
  futur = false,
}: {
  ev: Evenement;
  futur?: boolean;
}) {
  const date = new Date(ev.date);

  // Couleur d'accent du badge type — toutes en rouge VEA pour la coherence,
  // on differencie juste par opacite (les vieux types avaient des couleurs
  // multiples ce qui creait du bruit sur fond clair).
  const typeBadge = "text-vea-accent bg-vea-accent-soft border-vea-accent/20";

  return (
    <div className="card-clean p-6 flex flex-col gap-4 h-full">
      {/* Ligne du haut : badge type + statut */}
      <div className="flex items-center justify-between">
        <span
          className={`text-xs px-3 py-1 rounded-full border font-semibold uppercase tracking-wider ${typeBadge}`}
        >
          {ev.type.toLowerCase()}
        </span>
        {futur ? (
          <span className="text-xs bg-vea-accent text-white px-3 py-1 rounded-full font-semibold">
            A venir
          </span>
        ) : (
          <span className="text-xs bg-vea-surface-soft text-vea-text-dim px-3 py-1 rounded-full">
            Passe
          </span>
        )}
      </div>

      {/* Titre + description */}
      <div>
        <h3 className="text-vea-text font-bold text-base leading-tight mb-2">
          {ev.titre}
        </h3>
        {ev.description && (
          <p className="text-vea-text-muted text-sm leading-relaxed line-clamp-3">
            {ev.description}
          </p>
        )}
      </div>

      {/* Date + lieu */}
      <div className="mt-auto space-y-1 pt-2 border-t border-vea-border">
        <p className="text-vea-text-muted text-xs flex items-center gap-2">
          <span aria-hidden="true">📅</span>
          {date.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <p className="text-vea-text-muted text-xs flex items-center gap-2">
          <span aria-hidden="true">📍</span>
          {ev.lieu}
        </p>
      </div>

      {/* Bouton "Voir les photos" si l'event a une galerie associee */}
      {ev.gallerySlug && (
        <Link
          href={`/medias?event=${ev.gallerySlug}`}
          className="btn-outline text-xs py-2"
        >
          Voir les photos
        </Link>
      )}

      {/* Bouton inscription — seulement pour les futurs */}
      {futur && (
        <Link href="/inscription" className="btn-primary text-xs py-2">
          S&apos;inscrire
        </Link>
      )}
    </div>
  );
}
