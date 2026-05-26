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
import { createClient } from "@/lib/supabase/client";
import { GALLERY_EVENT_SLUGS } from "@/lib/galleries";

type Evenement = {
  id: string;
  titre: string;
  description: string | null;
  date: string;
  lieu: string;
  type: string; // lowercase normalize (tournoi/animation/atelier/competition/autre)
  actif: boolean;
  /** Heure de l'event (texte "14:00"), optionnelle — affichee si presente. */
  heure?: string | null;
  /** Slug de galerie pour bouton "Voir les photos" -> /medias?event=<slug> */
  gallerySlug?: string;
  /** Slug de l'event (Supabase) -> bouton "S'inscrire" -> /inscription?event=<slug>
   *  (previsionnel "monde attendu"). Absent pour archive/Prisma. */
  eventSlug?: string;
  /** Bilan public publie par l'admin -> bouton "Voir le bilan" sur les events
   *  passes -> /agenda/<slug>. Seuls les events Supabase peuvent en avoir un. */
  bilanPublic?: boolean;
};

/**
 * Normalise un type d'event (archive UPPERCASE, Supabase lowercase, etc.)
 * vers un format coherent pour les filtres.
 */
function normalizeType(rawType: string): string {
  const t = (rawType ?? "").toLowerCase().trim();
  // Supabase : 'programme' (recurrent hebdo) -> 'animation' pour l'agenda public
  if (t === "programme") return "animation";
  // Supabase : 'reunion' -> 'autre' (pas pertinent agenda public)
  if (t === "reunion") return "autre";
  // Mapping archive vers nouveau format (deja lowercase apres .toLowerCase())
  return t;
}

export default function AgendaPage() {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  // Default "a_venir" : on affiche en priorite les events futurs (demande Clavel 19/05/2026)
  const [filtre, setFiltre] = useState<string>("a_venir");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 3 sources fusionnees :
    //   1. /api/evenements (Prisma/MySQL, ancien systeme)
    //   2. vea.evenements (Supabase, nouveau systeme depuis 19/05/2026)
    //   3. lib/events-archive.ts (historique statique 2022-2026)
    // Dedoublonnage par id, Supabase gagne en cas de conflit.
    const supabase = createClient();

    Promise.all([
      // Source 1 : API Prisma (peut planter, on catch)
      fetch("/api/evenements?all=true")
        .then((r) => (r.ok ? (r.json() as Promise<Evenement[]>) : []))
        .catch(() => [] as Evenement[]),
      // Source 2 : Supabase vea.evenements (lecture publique via RLS)
      supabase
        .schema("vea")
        .from("evenements")
        .select("id, nom, event_slug, date, lieu, type, description, statut, bilan_public")
        .order("date", { ascending: false })
        .then(({ data }) => {
          if (!data) return [] as Evenement[];
          return data.map((e) => ({
            id: e.id,
            titre: e.nom,
            description: e.description,
            date: e.date,
            lieu: e.lieu,
            type: normalizeType(e.type),
            actif: e.statut !== "annule",
            gallerySlug: GALLERY_EVENT_SLUGS.has(e.event_slug) ? e.event_slug : undefined,
            eventSlug: e.event_slug,
            bilanPublic: (e as { bilan_public?: boolean }).bilan_public ?? false,
          })) as Evenement[];
        }),
    ])
      .then(([prismaEvents, supabaseEvents]) => {
        // Fusion par id : Supabase gagne sur Prisma
        const supabaseIds = new Set(supabaseEvents.map((e) => e.id));
        const prismaFiltered = prismaEvents
          .filter((e) => !supabaseIds.has(e.id))
          .map((e) => ({ ...e, type: normalizeType(e.type) }));

        const allIds = new Set([...supabaseIds, ...prismaFiltered.map((e) => e.id)]);
        const archive: Evenement[] = (EVENTS_ARCHIVE as EventArchive[])
          .filter((e) => !allIds.has(e.id))
          .map((e) => ({
            ...e,
            description: e.description,
            gallerySlug: e.gallerySlug,
            type: normalizeType(e.type),
          }));

        const merged = [...supabaseEvents, ...prismaFiltered, ...archive];
        merged.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setEvenements(merged);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("[Agenda] Erreur fusion sources — fallback archive:", err);
        const archiveOnly: Evenement[] = (EVENTS_ARCHIVE as EventArchive[]).map(
          (e) => ({
            ...e,
            description: e.description,
            gallerySlug: e.gallerySlug,
            type: normalizeType(e.type),
          })
        );
        archiveOnly.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setEvenements(archiveOnly);
        setLoading(false);
      });
  }, []);

  // On compare au DEBUT de la journee, pas a l'instant present : un event du
  // jour reste "a venir/d'actu" toute sa journee et ne bascule en "passe"
  // qu'une fois le jour termine (correction 23/05 : avant, il passait en
  // passe des minuit car la date etait stockee a 00h00).
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const aVenir = evenements.filter(
    (e) => new Date(e.date) >= startOfToday && e.actif
  );
  const passes = evenements.filter((e) => new Date(e.date) < startOfToday);

  // Filtres : "à venir" (default), tous, puis par type
  const filtres = ["a_venir", "tous", "tournoi", "atelier", "animation", "competition", "autre"];

  // Logique de filtrage : si "a_venir", on ne montre que les events futurs (deja gere
  // par la section "Prochains evenements" en haut). Si "tous", tout. Sinon, par type.
  const eventsFiltres = (liste: Evenement[]) => {
    if (filtre === "a_venir") {
      // On retourne uniquement les events a venir (passes ignores)
      return liste.filter((e) => new Date(e.date) >= startOfToday && e.actif);
    }
    if (filtre === "tous") return liste;
    return liste.filter((e) => e.type === filtre);
  };

  function labelFiltre(f: string): string {
    if (f === "a_venir") return "À venir";
    if (f === "tous") return "Tous";
    return f.charAt(0).toUpperCase() + f.slice(1);
  }

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

          {/* FILTRES — "À venir" est placé en premier (default), puis "Tous", puis types */}
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
                {labelFiltre(f)}
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
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-vea-accent flex-shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {date.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
          {/* Heure : affichee uniquement si une vraie heure est renseignee via
              la colonne `heure` (texte type "14:00"). La colonne `date` etant de
              type date (sans heure), on n'affiche jamais d'heure derivee d'elle
              (sinon artefact de fuseau "02:00"). */}
          {ev.heure && (
            <span className="text-vea-text-dim">{" · "}{ev.heure}</span>
          )}
        </p>
        <p className="text-vea-text-muted text-xs flex items-center gap-2">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-vea-accent flex-shrink-0">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
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

      {/* Bouton "Voir le bilan" — events passes avec bilan public publie */}
      {!futur && ev.eventSlug && ev.bilanPublic && (
        <Link
          href={`/agenda/${ev.eventSlug}`}
          className="btn-primary text-xs py-2"
        >
          Voir le bilan
        </Link>
      )}

      {/* Bouton inscription — seulement pour les futurs */}
      {futur && (
        <Link
          href={ev.eventSlug ? `/inscription?event=${ev.eventSlug}` : "/signup"}
          className="btn-primary text-xs py-2"
        >
          S&apos;inscrire
        </Link>
      )}
    </div>
  );
}
