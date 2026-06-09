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
import MuteFooter from "../host/MuteFooter";

export default function DashboardAudio() {
  // Lance la musique de fond — le mute/unmute est géré par le footer global
  useBackgroundMusic(AUDIO.dashboardMusic, 0.18);
  return <MuteFooter />;
}
