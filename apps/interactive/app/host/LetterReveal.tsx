/**
 * <LetterReveal /> — Animation type roulette pour le tirage de la lettre Petit Bac.
 *
 * Visuellement :
 *  - Au début du round, les lettres défilent vite (50ms entre chaque)
 *  - Progressivement ralentit (slot machine effect)
 *  - S'arrête sur la lettre cible
 *  - Effet "boom" final + SFX
 *
 * Tech :
 *  - Composant Client
 *  - Utilise un setTimeout récursif pour animer (plus simple qu'un requestAnimationFrame)
 *  - À chaque nouveau `targetLetter` (prop), relance l'animation
 *
 * Côté Host uniquement : pas de son côté joueur.
 */
"use client";

import { useEffect, useState } from "react";
import { playSfx, AUDIO } from "@/lib/audio";

const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface LetterRevealProps {
  /** Lettre finale (la vraie lettre du round). */
  targetLetter: string;
  /** ID unique du round, pour relancer l'animation à chaque changement. */
  roundKey: number;
  /** Durée totale de l'animation en ms. */
  durationMs?: number;
}

export default function LetterReveal({
  targetLetter,
  roundKey,
  durationMs = 2500,
}: LetterRevealProps) {
  const [displayLetter, setDisplayLetter] = useState(targetLetter);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsAnimating(true);
    const startedAt = Date.now();

    function tick() {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt;
      const progress = elapsed / durationMs; // 0 → 1

      if (progress >= 1) {
        // Fin : on fige sur la lettre cible
        setDisplayLetter(targetLetter);
        setIsAnimating(false);
        // SFX final "ding"
        playSfx(AUDIO.revealExplain, 0.6);
        return;
      }

      // Pendant l'animation : on choisit une lettre random
      // Plus on avance, plus on a de chances de tomber sur la cible
      // (mais on garde du suspense jusqu'à la fin)
      const random = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
      setDisplayLetter(random ?? targetLetter);

      // Easing : on commence vite (50ms) et on ralentit (jusqu'à 200ms)
      // delay = 50 + (progress^2) * 150 → courbe quadratique
      const delay = 50 + Math.pow(progress, 2) * 150;
      setTimeout(tick, delay);
    }

    // Démarre le tirage avec un SFX "tension"
    playSfx(AUDIO.transition, 0.4);
    tick();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey]);

  return (
    <p
      className={
        "font-display font-black leading-none text-amber-300 drop-shadow-[0_0_60px_rgba(252,211,77,0.4)] transition-transform " +
        (isAnimating
          ? "scale-95 text-[10rem] sm:text-[12rem]"
          : "scale-100 text-[12rem] sm:text-[16rem]")
      }
    >
      {displayLetter}
    </p>
  );
}
