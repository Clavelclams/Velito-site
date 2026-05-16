/**
 * Hook : détecte si on est en breakpoint desktop (>= 1024px) ou mobile.
 *
 * Pourquoi un hook custom plutôt que d'utiliser les classes responsive de Tailwind ?
 *   - Ici on doit conditionner du JS, pas seulement du CSS : on charge ou NON
 *     le composant Galaxy WebGL selon l'écran (pour économiser la batterie mobile).
 *   - Tailwind ne peut pas faire ça côté JS — il faut matchMedia.
 *
 * Subtilité SSR (Next.js) :
 *   - Côté serveur, window n'existe pas. On retourne null pour signaler "pas encore connu".
 *   - GalaxyHero affiche un placeholder pendant ce court instant (évite le flash de
 *     contenu côté hydration où le serveur rendrait "desktop" alors qu'on est mobile).
 *
 * Référence MDN : window.matchMedia + événement "change".
 */

import { useEffect, useState } from "react";

export type Breakpoint = "desktop" | "mobile" | null;

const DESKTOP_QUERY = "(min-width: 1024px)";

export function useBreakpoint(): Breakpoint {
  // null = on ne sait pas encore (SSR ou tout premier rendu client).
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(null);

  useEffect(() => {
    // Cet effet ne tourne QUE côté client — donc window est disponible.
    const mediaQuery = window.matchMedia(DESKTOP_QUERY);

    // Mise à jour immédiate au montage avec la valeur réelle.
    const applyMatch = (matches: boolean) => {
      setBreakpoint(matches ? "desktop" : "mobile");
    };
    applyMatch(mediaQuery.matches);

    // Écoute des changements (rotation tablette, redimensionnement fenêtre).
    const listener = (event: MediaQueryListEvent) => applyMatch(event.matches);
    mediaQuery.addEventListener("change", listener);

    // Nettoyage à la destruction du composant — évite les fuites mémoire.
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  return breakpoint;
}
