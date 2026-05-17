/**
 * Page Mediatheque VEA — galerie photo + presse (17/05/2026 v2).
 *
 * Categories de filtrage :
 *   - Tout / Soirees & events / Terrain / Tournois / Ateliers / Presse
 * Filtrage par event via URL ?event=<gallerySlug> (envoye depuis /agenda).
 *
 * "use client" + Suspense pour useSearchParams.
 */
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

interface Photo {
  src: string;
  alt: string;
  cat: "soiree" | "terrain" | "tournoi" | "atelier" | "presse";
  caption: string;
  event?: string;
}

const PHOTOS: Photo[] = [
  // === E-Night World Cup 5 dec 2024 ===
  { src: "/images/events/hero-event-animation.jpg", alt: "E-Night World Cup - animation micro et PS5", cat: "soiree", caption: "E-Night - animation", event: "e-night-world-cup" },
  { src: "/images/events/gallery-soiree-rollup-vea.jpg", alt: "Roll-up VEA lors de la E-Night World Cup", cat: "soiree", caption: "E-Night - roll-up VEA", event: "e-night-world-cup" },
  { src: "/images/events/gallery-soiree-mixite-filles.jpg", alt: "Groupe de jeunes filles - mixite VEA", cat: "soiree", caption: "E-Night - mixite", event: "e-night-world-cup" },
  { src: "/images/events/gallery-soiree-ambiance.jpg", alt: "Ambiance gaming E-Night", cat: "soiree", caption: "E-Night - ambiance", event: "e-night-world-cup" },
  { src: "/images/events/gallery-soiree-trois-joueurs.jpg", alt: "Trois joueurs E-Night", cat: "soiree", caption: "E-Night - en partie", event: "e-night-world-cup" },
  { src: "/images/events/gallery-soiree-rires.jpg", alt: "Rires entre joueurs E-Night", cat: "soiree", caption: "E-Night - rires", event: "e-night-world-cup" },
  { src: "/images/events/gallery-soiree-portrait.jpg", alt: "Portrait d'ambiance E-Night", cat: "soiree", caption: "E-Night - portrait", event: "e-night-world-cup" },
  { src: "/images/events/presse-courrier-esport-quartiers-2024.jpg", alt: "Article Courrier Picard - l'e-sport debarque dans les quartiers prioritaires", cat: "presse", caption: "Courrier Picard - E-sport quartiers prioritaires", event: "e-night-world-cup" },

  // === Parc Saint-Pierre ete 2024 ===
  { src: "/images/events/hero-parc-saint-pierre.jpg", alt: "Animation Parc Saint-Pierre 2024", cat: "terrain", caption: "Parc Saint-Pierre - ete 2024", event: "parc-saint-pierre" },
  { src: "/images/events/presse-courrier-parc-saint-pierre-2024.jpg", alt: "Article Courrier Picard - Les jeunes s'initient aux jeux video", cat: "presse", caption: "Courrier Picard - Parc Saint-Pierre", event: "parc-saint-pierre" },

  // === TIQE Secteur Est - Elbeuf 2024 ===
  { src: "/images/events/tournoi-tiqe-elbeuf.jpg", alt: "TIQE secteur Est centre social Elbeuf", cat: "tournoi", caption: "TIQE Elbeuf 2024", event: "tiqe-est-elbeuf" },

  // === TIQE Final - Le Corner juin 2024 ===
  { src: "/images/events/tiqe-final-corner-2024.jpg", alt: "TIQE Final Le Corner public et MABB", cat: "tournoi", caption: "TIQE Final - Le Corner", event: "tiqe-final-corner" },
  { src: "/images/events/tiqe-vainqueurs-ps5-2024.jpg", alt: "Vainqueurs TIQE Final avec PS5", cat: "tournoi", caption: "Vainqueurs TIQE - lots PS5", event: "tiqe-final-corner" },

  // === TIQE Etouvie nov 2023 (premier TIQE fondateur) ===
  { src: "/images/events/presse-courrier-tiqe-etouvie-2023.jpg", alt: "Article Courrier Picard - Le jeu video a ses adeptes", cat: "presse", caption: "Courrier Picard - Premier TIQE Etouvie", event: "tiqe-etouvie" },

  // === TIQE Sud (Table du Marais) dec 2023 ===
  { src: "/images/events/tiqe-sud-public-2023.jpg", alt: "TIQE Sud public mur graffiti Table du Marais", cat: "tournoi", caption: "TIQE Sud - Table du Marais", event: "tiqe-sud" },
  { src: "/images/events/post-tiqe-sud-faisal-2023.jpg", alt: "Post Instagram - Faisal vainqueur TIQE Sud", cat: "presse", caption: "Post Insta - Vainqueur Faisal", event: "tiqe-sud" },

  // === FIFA Tour du Marais (deuxieme reussite) jan 2024 ===
  { src: "/images/events/presse-courrier-fifa-tour-marais-2024.jpg", alt: "Article Courrier Picard - Deuxieme reussite tournoi FIFA", cat: "presse", caption: "Courrier Picard - Tournoi FIFA Tour du Marais", event: "fifa-amiens-vea" },

  // === SF6 Warpzone Amiens fev 2024 ===
  { src: "/images/events/sf6-warpzone-2024.jpg", alt: "Tournoi SF6 au bar Warpzone Amiens", cat: "tournoi", caption: "SF6 Warpzone - Amiens", event: "sf6-warpzone" },

  // === Championnat Federal SF6 - Vitry Gaming juin 2024 (Pinh 3e France) ===
  { src: "/images/events/presse-gazette-sf6-vitry-2024.jpg", alt: "Article Gazette Sports - Championnat federal SF6 a Vitry Gaming", cat: "presse", caption: "Gazette Sports - SF6 Vitry Gaming", event: "sf6-fed-vitry" },
  { src: "/images/events/presse-france-bleu-pinh-2024.jpg", alt: "France Bleu Picardie - Interview Pinh", cat: "presse", caption: "France Bleu - Interview Pinh", event: "sf6-fed-vitry" },

  // === Ateliers VR + Animation sept-oct 2023 (sans event-tag direct) ===
  { src: "/images/events/atelier-jeux-video.jpg", alt: "Atelier jeux video pour enfants 2023", cat: "atelier", caption: "Atelier jeux video 2023" },
  { src: "/images/events/atelier-vr-enfants-2023.jpg", alt: "Atelier VR decouverte enfants", cat: "atelier", caption: "Atelier VR - decouverte" },
  { src: "/images/events/demo-vr-2023.jpg", alt: "Demonstration casque VR Oculus", cat: "atelier", caption: "Demo VR Oculus" },
  { src: "/images/events/event-gymnase-grdf-2023.jpg", alt: "Animation gymnase partenariat GRDF Plus Offensif", cat: "terrain", caption: "Gymnase - partenariat GRDF" },
  { src: "/images/events/just-dance-filles.jpg", alt: "Just Dance jeunes filles 2024", cat: "soiree", caption: "Just Dance 2024" },
];

const FILTERS: { label: string; value: "tous" | Photo["cat"] }[] = [
  { label: "Tout", value: "tous" },
  { label: "Soirees & events", value: "soiree" },
  { label: "Terrain", value: "terrain" },
  { label: "Tournois", value: "tournoi" },
  { label: "Ateliers", value: "atelier" },
  { label: "Presse", value: "presse" },
];

const EVENT_LABELS: Record<string, string> = {
  "e-night-world-cup": "E-Night World Cup - 5 dec 2024",
  "parc-saint-pierre": "Parc Saint-Pierre - ete 2024",
  "tiqe-est-elbeuf": "TIQE Secteur Est - Elbeuf 2024",
  "tiqe-final-corner": "TIQE Final - Le Corner juin 2024",
  "tiqe-etouvie": "Premier TIQE Etouvie - nov 2023",
  "tiqe-sud": "TIQE Sud - Table du Marais dec 2023",
  "fifa-amiens-vea": "FIFA Amiens - Tour du Marais jan 2024",
  "sf6-warpzone": "SF6 Warpzone - Amiens fev 2024",
  "sf6-fed-vitry": "Championnat Federal SF6 - Vitry Gaming juin 2024",
};

function MediasContent() {
  const searchParams = useSearchParams();
  const eventFilter = searchParams.get("event");
  const [filtre, setFiltre] = useState<(typeof FILTERS)[number]["value"]>("tous");
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
    }
    if (lightbox) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const photos = useMemo(() => {
    if (eventFilter) return PHOTOS.filter((p) => p.event === eventFilter);
    if (filtre === "tous") return PHOTOS;
    return PHOTOS.filter((p) => p.cat === filtre);
  }, [eventFilter, filtre]);

  return (
    <>
      <section className="hero-bg pt-28 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <span className="badge-red mb-4">Galerie</span>
            <h1 className="text-4xl sm:text-5xl font-black text-vea-text mb-4 mt-4">
              Mediatheque <span className="text-vea-accent">VEA</span>
            </h1>
            <p className="text-base text-vea-text-muted max-w-2xl mx-auto">
              Photos de nos evenements + couverture presse depuis 2023. Visages
              des mineurs floutes par defaut (RGPD).
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-12 px-4 bg-vea-bg">
        <div className="max-w-6xl mx-auto">

          {eventFilter && EVENT_LABELS[eventFilter] && (
            <div className="card-clean bg-vea-accent-soft border-vea-accent/15 p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-vea-text">
                <span className="font-semibold">Galerie filtree :</span>{" "}
                <span className="text-vea-accent">{EVENT_LABELS[eventFilter]}</span>
              </p>
              <Link href="/medias" className="text-xs text-vea-accent hover:underline font-semibold">
                Voir toutes les photos
              </Link>
            </div>
          )}

          {!eventFilter && (
            <div className="flex flex-wrap gap-2 mb-10 justify-center">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFiltre(f.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    filtre === f.value
                      ? "bg-vea-accent text-white shadow-btn-accent"
                      : "bg-white border border-vea-border text-vea-text-muted hover:border-vea-accent hover:text-vea-accent"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((p, i) => (
              <ScrollReveal key={p.src} delay={Math.min(i * 0.03, 0.4)}>
                <button
                  type="button"
                  onClick={() => setLightbox(p)}
                  className="card-clean relative aspect-[4/3] w-full overflow-hidden group block focus:outline-none focus:ring-2 focus:ring-vea-accent"
                  aria-label={`Agrandir : ${p.caption}`}
                >
                  <Image
                    src={p.src}
                    alt={p.alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-medium">{p.caption}</p>
                  </div>
                  {p.cat === "presse" && (
                    <span className="absolute top-2 left-2 text-[10px] bg-vea-accent text-white px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                      Presse
                    </span>
                  )}
                </button>
              </ScrollReveal>
            ))}
          </div>

          {photos.length === 0 && (
            <p className="text-center text-vea-text-muted py-20">
              Aucune photo pour cet event ou cette categorie.
            </p>
          )}

          <p className="text-xs text-vea-text-dim text-center mt-10">
            {photos.length} photo{photos.length > 1 ? "s" : ""} affichee{photos.length > 1 ? "s" : ""}
            {" - "}Visages floutes pour proteger les mineurs (RGPD)
          </p>
        </div>
      </section>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.caption}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Fermer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="relative max-w-5xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-[4/3] w-full">
              <Image src={lightbox.src} alt={lightbox.alt} fill sizes="100vw" className="object-contain" />
            </div>
            <p className="text-white text-sm text-center mt-4">{lightbox.caption}</p>
          </div>
        </div>
      )}
    </>
  );
}

export default function MediasPage() {
  return (
    <Suspense fallback={<div className="pt-32 text-center text-vea-text-muted">Chargement...</div>}>
      <MediasContent />
    </Suspense>
  );
}
