/**
 * <DashboardAudio /> — Player de fond pour la galerie de jeux.
 *
 * Composant Client minimal : joue la musique dashboard en boucle, bouton mute.
 * Pourquoi en composant séparé : /dashboard/page.tsx est Server Component
 * (pour l'auth côté serveur), donc les hooks React ne peuvent pas y vivre.
 *
 * Note autoplay : la 1re fois qu'un user arrive sur le dashboard, le
 * navigateur peut bloquer le son tant qu'il n'a pas cliqué. C'est normal.
 * Une fois qu'il clique sur n'importe quoi, le son démarre.
 */
"use client";

import { useBackgroundMusic, AUDIO } from "@/lib/audio";

export default function DashboardAudio() {
  const { muted, toggleMute } = useBackgroundMusic(AUDIO.dashboardMusic, 0.18);

  return (
    <button
      type="button"
      onClick={toggleMute}
      className="fixed bottom-6 right-6 z-50 rounded-full border border-white/15 bg-ink/80 px-3 py-2 text-lg backdrop-blur-sm transition hover:bg-white/[0.06]"
      title={muted ? "Activer la musique" : "Couper la musique"}
      aria-label={muted ? "Activer la musique" : "Couper la musique"}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
