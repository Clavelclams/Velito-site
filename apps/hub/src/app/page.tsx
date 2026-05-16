/**
 * Hub Velito — Page d'accueil.
 *
 * Cette page rend GalaxyHero, le composant orchestrateur qui gère :
 *  - Le fond Galaxy WebGL (desktop) ou gradient (mobile/SSR)
 *  - La sphère 3D rotative InfiniteMenu avec les 5 modules de l'écosystème
 *  - Le fallback reduced-motion (grille statique sans animation)
 *  - Le skip link + la liste a11y des modules (lecteurs d'écran / clavier)
 *
 * Page.tsx reste un Server Component (rendu côté serveur pour le SEO du <main>).
 * GalaxyHero est marqué "use client" : c'est lui qui fait les dynamic imports
 * ssr:false vers Galaxy et InfiniteMenu (qui ont besoin de window/WebGL).
 *
 * Historique : avant le 16/05/2026, cette page rendait CinemaHubLoader (expérience
 * cinéma scroll-driven GSAP + Canvas 2D). Les fichiers components/CinemaHub/ sont
 * laissés en place mais déconnectés de la home — décision archivage soft.
 */

import GalaxyHero from "@/components/galaxy/GalaxyHero";

export default function HomePage() {
  return (
    <main id="main-content">
      <GalaxyHero />

      {/* TODO Section "Comment ça marche" — 3 cartes : Hub → Modules → Compte unique V2 */}
      {/* TODO Section "Module vedette : VEA" — gros visuel + CTA */}
      {/* TODO Footer */}
    </main>
  );
}
