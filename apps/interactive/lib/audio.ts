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
 * Tracker des SFX en cours par src. Évite qu'un même SFX se joue 2 fois si
 * appelé en rapide succession (ex: state Realtime qui re-trigger une phase).
 *
 * Throttle : pour un même src, on ignore les appels qui arrivent < 300ms après
 * le précédent. Sinon les SFX longs (round-end.mp3 = 8s) se cumulent.
 */
const _lastPlayedAt = new Map<string, number>();
const _activeSfx = new Set<HTMLAudioElement>();

/**
 * Joue un SFX one-shot.
 *
 *  - Throttle 300 ms : un même src ne peut pas être lancé 2 fois en moins de 300ms
 *  - Tracking : on garde la ref de l'audio pour pouvoir tout couper au mute global
 *  - Cleanup auto : quand l'audio finit, on l'enlève du tracker
 *
 * @param src    Chemin du fichier (utilise AUDIO.xxx)
 * @param volume Entre 0 et 1, défaut 0.5
 */
export function playSfx(src: string, volume: number = 0.5): void {
  if (typeof window === "undefined") return;
  if (isGloballyMuted()) return;

  // Throttle par src
  const now = Date.now();
  const last = _lastPlayedAt.get(src) ?? 0;
  if (now - last < 300) return;
  _lastPlayedAt.set(src, now);

  try {
    const audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, volume));
    _activeSfx.add(audio);
    audio.addEventListener("ended", () => {
      _activeSfx.delete(audio);
    });
    audio.addEventListener("error", () => {
      _activeSfx.delete(audio);
    });
    audio.play().catch((err) => {
      _activeSfx.delete(audio);
      if (err.name !== "NotAllowedError") {
        console.warn("[playSfx] erreur lecture:", err.message);
      }
    });
  } catch (e) {
    console.warn("[playSfx] exception:", e);
  }
}

/**
 * Coupe TOUS les SFX en cours immédiatement.
 * Appelé au mute global pour stopper les longs SFX déjà déclenchés.
 */
function stopAllSfx(): void {
  for (const a of _activeSfx) {
    try { a.pause(); a.currentTime = 0; a.src = ""; } catch {}
  }
  _activeSfx.clear();
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
 * Singleton global STRICT — garantit qu'UNE seule musique de fond joue à la fois.
 * On stocke sur window pour survivre aux remounts React StrictMode.
 *
 * Fix du bug "double musique avec écho" :
 *  - On stoppe l'ancien audio AVANT de créer le nouveau
 *  - On force `audio.src = ""` pour libérer le stream (pas juste pause)
 *  - On utilise un compteur d'instances pour ignorer les cleanups tardifs
 */
interface ActiveMusic {
  id: number;
  src: string;
  audio: HTMLAudioElement;
}

declare global {
  // eslint-disable-next-line no-var
  var __velitoActiveMusic: ActiveMusic | null;
  // eslint-disable-next-line no-var
  var __velitoMusicCounter: number;
}

function getActiveMusic(): ActiveMusic | null {
  if (typeof window === "undefined") return null;
  return globalThis.__velitoActiveMusic ?? null;
}

function setActiveMusic(m: ActiveMusic | null): void {
  if (typeof window === "undefined") return;
  globalThis.__velitoActiveMusic = m;
}

function nextMusicId(): number {
  if (typeof window === "undefined") return 0;
  globalThis.__velitoMusicCounter = (globalThis.__velitoMusicCounter ?? 0) + 1;
  return globalThis.__velitoMusicCounter;
}

/**
 * Registry global de TOUTES les audio "background music" jamais créées.
 * Quand un nouveau useBackgroundMusic démarre, on TUE toutes les anciennes —
 * peu importe si elles ont déjà été cleanup ou pas. Bug double-musique fini.
 */
declare global {
  // eslint-disable-next-line no-var
  var __velitoAllBgMusic: Set<HTMLAudioElement> | undefined;
}

function getAllBgMusic(): Set<HTMLAudioElement> {
  if (typeof window === "undefined") return new Set();
  if (!globalThis.__velitoAllBgMusic) {
    globalThis.__velitoAllBgMusic = new Set();
  }
  return globalThis.__velitoAllBgMusic;
}

/** Tue TOUTES les musiques de fond en cours. Robuste, idempotent. */
function killAllBgMusic(): void {
  const all = getAllBgMusic();
  for (const a of all) {
    try {
      a.pause();
      a.currentTime = 0;
      a.src = "";
      a.load();
    } catch {
      /* ignore */
    }
  }
  all.clear();
}

// Cleanup quand l'utilisateur quitte la page
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", killAllBgMusic);
  window.addEventListener("pagehide", killAllBgMusic);
}

export function useBackgroundMusic(
  src: string,
  volume: number = 0.25
): { muted: boolean; toggleMute: () => void } {
  const [muted, setMuted] = useState<boolean>(() => isGloballyMuted());

  useEffect(() => {
    // 1. TUE toute musique existante (registre global) → fini le double-écho
    killAllBgMusic();

    // 2. Crée et lance la nouvelle
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = isGloballyMuted() ? 0 : volume;
    audio.muted = isGloballyMuted();

    // 3. Enregistre AVANT le play (au cas où le play échoue mais le registry sait)
    getAllBgMusic().add(audio);

    audio.play().catch((err) => {
      if (err.name !== "NotAllowedError") {
        console.warn("[useBackgroundMusic] autoplay bloqué:", err.message);
      }
    });

    function onMuteChange(e: Event) {
      const m = (e as CustomEvent<boolean>).detail;
      audio.muted = m;
      setMuted(m);
      if (m) stopAllSfx();
    }
    window.addEventListener("velito-mute-change", onMuteChange);

    return () => {
      window.removeEventListener("velito-mute-change", onMuteChange);
      // Cleanup MA propre audio (et seulement la mienne)
      getAllBgMusic().delete(audio);
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
        audio.load();
      } catch {
        /* ignore */
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
