/**
 * Système audio centralisé pour Velito Interactive.
 *
 * Mapping fichiers → usage (déposés dans /public/audio/) :
 *   - musics/ikoliks.mp3        → musique fond /dashboard (galerie de jeux)
 *   - musics/magpie.mp3         → musique fond /host lobby (transition cards → game)
 *   - sfx/click-answer.mp3      → clic sur un bouton réponse (côté joueur)
 *   - sfx/round-end.mp3         → fin d'une manche / victoire de question (énergique)
 *   - sfx/final-victory.mp3     → écran winner final
 *   - sfx/wrong-answer.mp3      → reveal d'une mauvaise réponse côté joueur
 *   - sfx/reveal-explain.mp3    → affichage de la bonne réponse (host)
 *
 * Convention de nommage : on a renommé les fichiers Pixabay pour clarté.
 * Au moment du commit, dépose les MP3 dans /public/audio/musics ou /public/audio/sfx
 * selon le mapping ci-dessus.
 *
 * Architecture :
 *   - playSfx() : Joue un son court (one-shot, pas en boucle).
 *   - useBackgroundMusic() : Hook React pour gérer une musique de fond en boucle
 *     (auto-cleanup au unmount, control mute/volume).
 *   - AudioContext API : non utilisée pour rester simple. <audio> HTML suffit.
 */

/* eslint-disable react-hooks/rules-of-hooks */
import { useEffect, useRef, useState } from "react";

/**
 * Sources audio — chemins relatifs à /public/.
 * Si tu changes de fichier MP3, change UNIQUEMENT ici.
 */
export const AUDIO = {
  // Musiques de fond (loop) — Pixabay
  dashboardMusic: "/audio/musics/dashboard.mp3", // ikoliks_aj-acoustic-spring
  lobbyMusic: "/audio/musics/lobby.mp3",         // magpiemusic-action-trailer
  // Effets sonores (one-shot)
  clickAnswer: "/audio/sfx/click.mp3",           // u_wb4wgxdwxo-boing2
  roundEnd: "/audio/sfx/round-end.mp3",          // energysound-stomp-drum
  finalVictory: "/audio/sfx/final-victory.mp3",  // universfield-old-house
  wrongAnswer: "/audio/sfx/wrong.mp3",           // u_l5xum8z250-losing-horn
  revealExplain: "/audio/sfx/reveal.mp3",        // johnnybacon156-fah
  playerJoin: "/audio/sfx/player-join.mp3",      // jeremayjimenez-discord-sfx-calling
  transition: "/audio/sfx/transition.mp3",       // viralaudio-descent-whoosh
} as const;

/**
 * Mute global — quand true, AUCUN son ne joue (musique de fond + SFX).
 * Synchronisé via localStorage pour persister entre les pages.
 */
const MUTE_STORAGE_KEY = "velito-interactive-muted";

export function isGloballyMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setGloballyMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
    // Broadcast à tous les listeners (composants audio actifs)
    window.dispatchEvent(new CustomEvent("velito-mute-change", { detail: muted }));
  } catch {
    /* ignore */
  }
}

/**
 * Joue un SFX one-shot. Crée un nouvel élément audio à chaque appel pour
 * permettre de superposer plusieurs sons (ex: clic + reveal en même temps).
 *
 * En cas d'autoplay bloqué (avant interaction user), on log juste — c'est
 * normal sur la 1re page avant qu'il clique n'importe où.
 *
 * @param src    Chemin du fichier (utilise AUDIO.xxx)
 * @param volume Entre 0 et 1, défaut 0.5
 */
export function playSfx(src: string, volume: number = 0.5): void {
  if (typeof window === "undefined") return;
  if (isGloballyMuted()) return; // Mute global : on ignore
  try {
    const audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch((err) => {
      // Autoplay bloqué tant que l'user n'a pas interagi — normal
      if (err.name !== "NotAllowedError") {
        console.warn("[playSfx] erreur lecture:", err.message);
      }
    });
  } catch (e) {
    console.warn("[playSfx] exception:", e);
  }
}

/**
 * Hook React pour gérer une musique de fond en boucle.
 *
 * Joue automatiquement au mount, arrête au unmount.
 * Retourne {muted, toggleMute} pour le bouton de contrôle.
 *
 * @param src     Source audio (utilise AUDIO.xxx)
 * @param volume  Volume entre 0 et 1, défaut 0.25 (musique de fond = doit
 *                pas couvrir les voix)
 */
/**
 * Singleton global — garantit qu'UNE seule musique de fond joue à la fois.
 * Évite le bug "musique doublée avec écho" en StrictMode ou lors d'une
 * transition lobby→game où l'ancien hook n'a pas eu le temps de cleanup.
 */
let _activeMusic: { src: string; audio: HTMLAudioElement } | null = null;

function stopActiveMusic() {
  if (_activeMusic) {
    try {
      _activeMusic.audio.pause();
      _activeMusic.audio.currentTime = 0;
    } catch {
      /* ignore */
    }
    _activeMusic = null;
  }
}

export function useBackgroundMusic(
  src: string,
  volume: number = 0.25
): { muted: boolean; toggleMute: () => void } {
  const [muted, setMuted] = useState<boolean>(() => isGloballyMuted());

  useEffect(() => {
    // STOP toute musique en cours avant d'en lancer une nouvelle (singleton)
    stopActiveMusic();

    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = isGloballyMuted() ? 0 : volume;
    audio.muted = isGloballyMuted();
    audio.play().catch((err) => {
      if (err.name !== "NotAllowedError") {
        console.warn("[useBackgroundMusic] autoplay bloqué:", err.message);
      }
    });
    _activeMusic = { src, audio };

    // Écoute le mute global
    function onMuteChange(e: Event) {
      const m = (e as CustomEvent<boolean>).detail;
      audio.muted = m;
      setMuted(m);
    }
    window.addEventListener("velito-mute-change", onMuteChange);

    return () => {
      window.removeEventListener("velito-mute-change", onMuteChange);
      // Ne stop QUE si c'est notre instance (pas si une autre l'a remplacée)
      if (_activeMusic?.audio === audio) {
        stopActiveMusic();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  function toggleMute() {
    const next = !muted;
    setGloballyMuted(next);
    setMuted(next);
  }

  return { muted, toggleMute };
}
