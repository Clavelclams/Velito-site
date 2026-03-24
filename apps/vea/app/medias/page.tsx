/**
 * Page Médiathèque VEA
 * Onglets Photos / Vidéos avec placeholders.
 *
 * "use client" pour le switch d'onglets.
 */
"use client";

import { useState } from "react";

type TabValue = "photos" | "videos";

export default function MediasPage() {
  const [tab, setTab] = useState<TabValue>("photos");

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="pt-20 pb-12 px-4 bg-gradient-to-b from-vea-dark to-vea-navy">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-gradient mb-4">
            Médiathèque
          </h1>
          <p className="text-lg text-vea-text-muted max-w-2xl mx-auto">
            Photos et vidéos de nos événements.
          </p>
        </div>
      </section>

      {/* ===== ONGLETS ===== */}
      <section className="py-8 px-4">
        <div className="max-w-5xl mx-auto flex gap-2">
          <button
            type="button"
            onClick={() => setTab("photos")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "photos"
                ? "bg-vea-accent text-white"
                : "bg-vea-card border border-vea-border text-vea-text-muted hover:text-vea-white"
            }`}
          >
            Photos
          </button>
          <button
            type="button"
            onClick={() => setTab("videos")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "videos"
                ? "bg-vea-accent text-white"
                : "bg-vea-card border border-vea-border text-vea-text-muted hover:text-vea-white"
            }`}
          >
            Vidéos
          </button>
        </div>
      </section>

      {/* ===== CONTENU ===== */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          {tab === "photos" ? (
            <>
              {/* Grille photos placeholder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-video card-glow flex items-center justify-center"
                  >
                    <span className="text-vea-text-dim text-xs uppercase tracking-wider">
                      Photo {i + 1}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-center text-vea-text-dim text-sm mt-8">
                Photos de nos événements bientôt disponibles.
              </p>
            </>
          ) : (
            <>
              {/* Grille vidéos placeholder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-video card-glow flex items-center justify-center relative group cursor-pointer"
                  >
                    {/* Play button */}
                    <div className="w-14 h-14 rounded-full bg-vea-accent/20 flex items-center justify-center group-hover:bg-vea-accent/30 transition-colors">
                      <div className="w-0 h-0 border-l-[18px] border-l-vea-accent border-y-[11px] border-y-transparent ml-1" />
                    </div>
                    <span className="absolute bottom-3 left-4 text-vea-text-dim text-xs">
                      Vidéo {i + 1} — YouTube @velitoesport
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-center text-vea-text-dim text-sm mt-8">
                Vidéos de nos événements bientôt sur YouTube.
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
