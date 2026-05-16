/**
 * Hook : détecte si l'utilisateur a activé "Réduire les animations" dans son OS.
 *
 * Pourquoi c'est important :
 *   - Critère WCAG 2.3.3 : on doit respecter la préférence système.
 *   - Certaines personnes (vestibular disorders, épilepsie photosensible, autisme)
 *     ont des effets physiques douloureux face aux animations.
 *   - Une galaxie WebGL animée + une sphère 3D rotative = exactement le genre de
 *     contenu qu'on doit savoir désactiver proprement.
 *
 * Quand cette préférence est active, GalaxyHero remplace TOUT le WebGL par une
 * grille HTML statique des modules (cf. objectif 05_OBJECTIFS_TECHNIQUES.md
 * "Accessibilité WCAG 2.1 AA").
 *
 * On retourne false par défaut en SSR (pas d'info disponible) — l'utilisateur
 * verra l'animation puis on coupera dès l'hydration si nécessaire.
 */

import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    mediaQuery.addEventListener("change", listener);

    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  return prefersReducedMotion;
}
