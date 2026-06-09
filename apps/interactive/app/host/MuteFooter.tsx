/**
 * <MuteFooter /> — Bouton footer pour couper TOUT le son côté TV.
 *
 * Affiché en bottom-right fixed sur tous les écrans Host (lobby + jeux).
 * Coupe à la fois la musique de fond ET les SFX (via le flag global).
 * Persiste en localStorage donc survit entre les pages.
 *
 * Click → toggle globalement. Quand muted=true, plus aucun son ne se déclenche.
 */
"use client";

import { useEffect, useState } from "react";
import { isGloballyMuted, setGloballyMuted } from "@/lib/audio";

export default function MuteFooter() {
  const [muted, setMuted] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Au mount : lire l'état persisté + écouter les changements externes
  useEffect(() => {
    setMuted(isGloballyMuted());
    setHydrated(true);

    function onMuteChange(e: Event) {
      setMuted((e as CustomEvent<boolean>).detail);
    }
    window.addEventListener("velito-mute-change", onMuteChange);
    return () => window.removeEventListener("velito-mute-change", onMuteChange);
  }, []);

  function handleToggle() {
    const next = !muted;
    setGloballyMuted(next);
    setMuted(next);
  }

  if (!hydrated) return null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full border border-white/15 bg-ink/80 px-4 py-2.5 text-sm backdrop-blur-sm transition hover:bg-white/[0.08]"
      title={muted ? "Réactiver le son" : "Couper le son"}
      aria-label={muted ? "Réactiver le son" : "Couper le son"}
    >
      <span aria-hidden="true" className="text-lg">{muted ? "🔇" : "🔊"}</span>
      <span className="text-xs uppercase tracking-widest text-white/60">
        {muted ? "Muet" : "Son"}
      </span>
    </button>
  );
}
