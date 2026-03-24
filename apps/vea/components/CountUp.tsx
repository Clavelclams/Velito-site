/**
 * CountUp — Animation de compteur numérique
 *
 * 👉 Anime un nombre de 0 à `end` quand l'élément entre dans le viewport.
 * 👉 Props :
 *   - end : le nombre cible (ex: 100)
 *   - duration : durée de l'animation en secondes (défaut 2)
 *   - suffix : texte après le nombre (ex: "+", "%", "€")
 *   - prefix : texte avant le nombre (ex: "TOP ")
 *
 * 👉 "use client" obligatoire car on utilise useState, useEffect, useRef, useInView
 *
 * 👉 Comment ça marche :
 *   1. useInView détecte quand le composant est visible
 *   2. Un useEffect lance un requestAnimationFrame loop
 *   3. Le loop incrémente progressivement de 0 → end avec un easing "ease-out"
 *   4. Quand on atteint la durée, on fixe la valeur finale
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

interface CountUpProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

export default function CountUp({
  end,
  duration = 2,
  suffix = "",
  prefix = "",
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    // 👉 On ne lance l'animation qu'une seule fois
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now();
    const durationMs = duration * 1000;

    // 👉 Fonction d'easing "ease-out" : rapide au début, ralentit à la fin
    // Formule : 1 - (1 - t)^3  (cubic ease-out)
    function easeOutCubic(t: number): number {
      return 1 - Math.pow(1 - t, 3);
    }

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;

      // 👉 progress va de 0 à 1 sur la durée
      const progress = Math.min(elapsed / durationMs, 1);

      // 👉 On applique l'easing pour un mouvement naturel
      const easedProgress = easeOutCubic(progress);

      // 👉 On calcule la valeur actuelle et on arrondit
      setCount(Math.round(easedProgress * end));

      // 👉 Si pas fini, on continue l'animation
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [isInView, end, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {count}
      {suffix}
    </span>
  );
}
