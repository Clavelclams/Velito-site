/**
 * Composant React Galaxy — fond de galaxie procédurale animée.
 *
 * Toute la logique WebGL est dans GalaxyRenderer (galaxy/galaxy-renderer.ts).
 * Ce composant ne gère QUE :
 *   - Le cycle de vie (mount / unmount via useEffect)
 *   - Le requestAnimationFrame loop
 *   - Le lerp (interpolation douce) de la position souris côté CPU
 *   - Les listeners DOM (resize, mousemove, mouseleave)
 *
 * Pourquoi un lerp côté CPU et pas dans le shader ?
 *   - Le shader voit DÉJÀ une position souris lissée.
 *   - Sans lerp, la souris saute brutalement entre les frames → la galaxie sursaute.
 *   - Le lerp à 5% par frame donne un mouvement organique.
 *
 * Référence : adaptation React Bits Galaxy, sans modification de l'algo.
 *
 * NOTE : ce composant est importé dynamiquement (next/dynamic ssr:false) depuis
 * GalaxyHero — donc il ne s'exécute QUE côté client. window et WebGL sont safe.
 */

"use client";

import { useEffect, useRef } from "react";
import styles from "./Galaxy.module.css";
import { GalaxyRenderer, type GalaxyRendererOptions } from "./galaxy/galaxy-renderer";

interface GalaxyProps extends Partial<GalaxyRendererOptions> {
  /** Désactive l'incrément du temps — utilisé par IntersectionObserver. */
  disableAnimation?: boolean;
  /** Active/désactive les listeners souris. */
  mouseInteraction?: boolean;
}

export default function Galaxy({
  focal = [0.5, 0.5],
  rotation = [1.0, 0.0],
  starSpeed = 0.5,
  density = 1,
  hueShift = 140,
  disableAnimation = false,
  speed = 1.0,
  mouseInteraction = true,
  glowIntensity = 0.3,
  saturation = 0.0,
  mouseRepulsion = true,
  repulsionStrength = 2,
  twinkleIntensity = 0.3,
  rotationSpeed = 0.1,
  autoCenterRepulsion = 0,
  transparent = true,
}: GalaxyProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs pour le lerp souris — on stocke cible + valeur lissée séparément.
  // Pas de useState : on n'a pas besoin de re-render à chaque frame, c'est juste
  // une valeur lue par le RAF loop.
  const targetMouse = useRef({ x: 0.5, y: 0.5 });
  const smoothMouse = useRef({ x: 0.5, y: 0.5 });
  const targetActive = useRef(0);
  const smoothActive = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // 1. Création du renderer WebGL (encapsule toute la logique ogl).
    const renderer = new GalaxyRenderer(container, {
      focal,
      rotation,
      starSpeed,
      density,
      hueShift,
      speed,
      glowIntensity,
      saturation,
      mouseRepulsion,
      twinkleIntensity,
      rotationSpeed,
      repulsionStrength,
      autoCenterRepulsion,
      transparent,
    });

    // 2. Boucle d'animation — recursive via requestAnimationFrame.
    let rafId: number;
    const loop = (t: number) => {
      // Lerp souris : on rapproche progressivement la valeur lissée de la cible.
      // Facteur 0.05 = 5% du chemin par frame ≈ ~200ms pour converger.
      const k = 0.05;
      smoothMouse.current.x += (targetMouse.current.x - smoothMouse.current.x) * k;
      smoothMouse.current.y += (targetMouse.current.y - smoothMouse.current.y) * k;
      smoothActive.current += (targetActive.current - smoothActive.current) * k;

      renderer.setMouse(smoothMouse.current.x, smoothMouse.current.y, smoothActive.current);
      renderer.update(t, disableAnimation);

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    // 3. Listeners.
    const handleResize = () => renderer.resize();
    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      targetMouse.current = { x, y };
      targetActive.current = 1.0;
    };
    const handleMouseLeave = () => {
      targetActive.current = 0.0;
    };

    if (mouseInteraction) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", handleMouseLeave);
    }

    // 4. Nettoyage : très important pour éviter les fuites de contexte WebGL.
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      if (mouseInteraction) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
      renderer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    focal,
    rotation,
    starSpeed,
    density,
    hueShift,
    speed,
    mouseInteraction,
    glowIntensity,
    saturation,
    mouseRepulsion,
    twinkleIntensity,
    rotationSpeed,
    repulsionStrength,
    autoCenterRepulsion,
    transparent,
  ]);

  // disableAnimation change pendant l'animation (IntersectionObserver) — on
  // ne recrée pas le renderer, on lit juste la valeur dans la boucle ci-dessus.
  // Note : le useEffect ci-dessus capture la prop disableAnimation par closure,
  // donc un changement déclenche le re-attachement. Pour éviter ça, on pourrait
  // utiliser une ref, mais c'est plus complexe. À optimiser si nécessaire.

  return <div ref={containerRef} className={styles.container} aria-hidden="true" />;
}
