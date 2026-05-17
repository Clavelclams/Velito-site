/**
 * CountUp — Animation de compteur numerique
 *
 * Anime un nombre de 0 a `end` quand l'element entre dans le viewport.
 *
 * Props :
 *   - end : le nombre cible (ex: 100)
 *   - duration : duree de l'animation en secondes (defaut 2)
 *   - suffix : texte apres le nombre (ex: "+", "%", "€")
 *   - prefix : texte avant le nombre
 *   - separator : si true, formate avec separateur de milliers fr-FR
 *     (ex: 3686 -> "3 686"). Defaut false pour ne pas casser les
 *     annees affichees comme "2022" (qui doivent rester sans espace).
 *
 * "use client" obligatoire car on utilise useState, useEffect, useRef, useInView
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

interface CountUpProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  separator?: boolean;
}

export default function CountUp({
  end,
  duration = 2,
  suffix = "",
  prefix = "",
  separator = false,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    // On ne lance l'animation qu'une seule fois
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now();
    const durationMs = duration * 1000;

    // Easing cubic ease-out : rapide au debut, ralentit a la fin
    function easeOutCubic(t: number): number {
      return 1 - Math.pow(1 - t, 3);
    }

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = easeOutCubic(progress);
      setCount(Math.round(easedProgress * end));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [isInView, end, duration]);

  // Formatage : toLocaleString fr-FR utilise un espace insecable (U+202F)
  // entre les milliers. Parfait pour "3 686 h".
  const displayCount = separator ? count.toLocaleString("fr-FR") : count;

  return (
    <span ref={ref}>
      {prefix}
      {displayCount}
      {suffix}
    </span>
  );
}
