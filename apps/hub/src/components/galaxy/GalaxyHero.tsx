/**
 * GalaxyHero — composant orchestrateur du hero de la home velito.com.
 *
 * Responsabilités :
 *   1. Charger dynamiquement Galaxy et InfiniteMenu (ssr:false — ils utilisent window/WebGL)
 *   2. Détecter breakpoint (desktop / mobile) et prefers-reduced-motion
 *   3. Observer la visibilité du hero (IntersectionObserver) pour mettre en pause
 *      les boucles d'animation quand le hero sort du viewport → économie batterie
 *   4. Rendre la version appropriée :
 *      - reduced-motion → grille HTML statique des 5 modules
 *      - mobile        → InfiniteMenu seul + fond gradient (pas de Galaxy)
 *      - desktop       → Galaxy en fond + InfiniteMenu au premier plan
 *      - SSR/inconnu   → placeholder gradient (évite flash d'hydration)
 *   5. Fournir un skip link + ModulesList sr-only pour le clavier/lecteurs d'écran
 *
 * Pourquoi un Client Component ?
 *   - Les hooks useBreakpoint, usePrefersReducedMotion, useState, useRef, useEffect
 *     ne fonctionnent que côté client.
 *   - next/dynamic avec ssr:false n'est utilisable QUE depuis un Client Component
 *     dans Next.js 16 (cf. apps/hub/src/app/page.tsx pour la note correspondante).
 */

"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { modules } from "./modules";
import type { MenuItem } from "./infinite-menu/grid-engine";
import ModulesList from "./ModulesList";

// Conversion VelitoModule → MenuItem (le format attendu par InfiniteMenu).
// Calculée au niveau module (pas dans le composant) pour ne pas recréer
// l'array à chaque render. Données statiques, sûr.
const menuItems: MenuItem[] = modules.map((m) => ({
  image: m.image,
  link: m.url,
  title: m.name,
  description: m.description,
}));

// ============================================================
// IMPORTS DYNAMIQUES — Galaxy et InfiniteMenu utilisent WebGL et window,
// donc on les charge UNIQUEMENT côté client. ssr:false empêche Next.js
// d'essayer de les rendre côté serveur (ce qui crasherait au build).
// ============================================================
const Galaxy = dynamic(() => import("./Galaxy"), {
  ssr: false,
  loading: () => <GalaxyPlaceholder />,
});

const InfiniteMenu = dynamic(() => import("./InfiniteMenu"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-white/40">
      Chargement de la galaxie...
    </div>
  ),
});

/** Placeholder gradient affiché pendant le chargement de Galaxy ou en SSR. */
function GalaxyPlaceholder() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse at center, #1a0033 0%, #04040e 70%, #04040e 100%)",
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Fallback "reduced-motion" : grille statique des 5 modules.
 * Pas d'animation, pas de WebGL, juste 5 cartes navigables au clavier.
 */
function ReducedMotionFallback() {
  return (
    <div className="min-h-screen bg-[#04040e] flex flex-col items-center justify-center p-8">
      <h1 className="font-orbitron text-4xl md:text-5xl font-bold text-white mb-12 text-center">
        Velito — Ton univers numérique
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl w-full">
        {modules.map((m) => (
          <a
            key={m.slug}
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-6 rounded-lg border border-white/10 hover:border-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            style={{ borderTop: `4px solid ${m.accent}` }}
          >
            <h2 className="font-orbitron font-bold text-xl text-white mb-2">
              {m.name}
            </h2>
            <p className="text-sm text-white/70">{m.tagline}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function GalaxyHero() {
  const breakpoint = useBreakpoint();
  const prefersReducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  // ============================================================
  // EFFET : IntersectionObserver pour mettre en pause les animations
  // quand le hero sort du viewport (ex: scroll vers les sections en dessous).
  // ============================================================
  useEffect(() => {
    if (!containerRef.current) return;
    const target = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsVisible(entry.isIntersecting);
        }
      },
      // threshold 0.1 = on considère "visible" dès 10% du hero dans le viewport.
      { threshold: 0.1 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // ============================================================
  // BRANCHE 1 : reduced-motion → pas de WebGL du tout, grille statique.
  // ============================================================
  if (prefersReducedMotion) {
    return (
      <>
        <SkipLink />
        <ModulesList />
        <ReducedMotionFallback />
      </>
    );
  }

  return (
    <>
      <SkipLink />
      <ModulesList />
      <div
        ref={containerRef}
        role="img"
        aria-label="Galaxie interactive des modules Velito. Une liste alternative est accessible via la touche Tab."
        className="relative w-screen h-screen overflow-hidden bg-[#04040e]"
      >
        {/* BRANCHE 2 : SSR / breakpoint inconnu → placeholder gradient (évite flash). */}
        {breakpoint === null && <GalaxyPlaceholder />}

        {/* BRANCHE 3 : Desktop → Galaxy en fond + InfiniteMenu au premier plan. */}
        {breakpoint === "desktop" && (
          <>
            <div className="absolute inset-0 z-0">
              <Galaxy
                hueShift={280}
                saturation={0.6}
                density={1.2}
                glowIntensity={0.4}
                starSpeed={0.3}
                twinkleIntensity={0.4}
                rotationSpeed={0.05}
                mouseInteraction={true}
                mouseRepulsion={true}
                repulsionStrength={2}
                transparent={true}
                disableAnimation={!isVisible}
              />
            </div>
            <div className="relative z-10 w-full h-full">
              <InfiniteMenu items={menuItems} scale={1.3} isVisible={isVisible} />
            </div>
          </>
        )}

        {/* BRANCHE 4 : Mobile → placeholder gradient + InfiniteMenu plus petit. */}
        {breakpoint === "mobile" && (
          <>
            {/* TODO : remplacer par /public/galaxy-mobile.webp quand l'asset sera prêt. */}
            <div
              className="absolute inset-0 z-0"
              style={{
                background:
                  "linear-gradient(180deg, #04010a 0%, #1a0033 50%, #04010a 100%)",
              }}
              aria-hidden="true"
            />
            <div className="relative z-10 w-full h-full">
              <InfiniteMenu items={menuItems} scale={1.1} isVisible={isVisible} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** Lien "Aller au contenu principal" — accessibilité WCAG 2.4.1. */
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:bg-purple-600 focus:text-white focus:px-4 focus:py-2 focus:rounded focus:z-50"
    >
      Aller au contenu principal
    </a>
  );
}
