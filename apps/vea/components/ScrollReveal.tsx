/**
 * ScrollReveal — Composant d'animation au scroll
 *
 * 👉 Utilise framer-motion pour animer les éléments quand ils entrent dans le viewport.
 * 👉 Props :
 *   - children : le contenu à animer
 *   - delay : délai avant l'animation (en secondes, défaut 0)
 *   - direction : depuis quelle direction l'élément arrive ('up' | 'left' | 'right', défaut 'up')
 *   - className : classes CSS supplémentaires
 *
 * 👉 "use client" obligatoire car framer-motion utilise des hooks React (useRef, etc.)
 */
"use client";

import { motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right";
  className?: string;
}

export default function ScrollReveal({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  // 👉 useInView détecte quand l'élément entre dans le viewport
  // once: true = l'animation ne se joue qu'une fois (pas de replay au re-scroll)
  // margin: "-80px" = déclenche l'animation un peu avant que l'élément soit visible
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  // 👉 On calcule le décalage initial selon la direction
  const initialOffset = {
    up: { x: 0, y: 40 },
    left: { x: -40, y: 0 },
    right: { x: 40, y: 0 },
  }[direction];

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        x: initialOffset.x,
        y: initialOffset.y,
      }}
      animate={
        isInView
          ? { opacity: 1, x: 0, y: 0 }
          : { opacity: 0, x: initialOffset.x, y: initialOffset.y }
      }
      transition={{
        duration: 0.6,
        delay,
        ease: [0.25, 0.1, 0.25, 1], // cubic-bezier smooth
      }}
    >
      {children}
    </motion.div>
  );
}
