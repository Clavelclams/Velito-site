/**
 * Composant React InfiniteMenu — sphère 3D rotative des modules Velito.
 *
 * Toute la logique WebGL est dans infinite-menu/grid-engine.ts.
 * Ce composant gère uniquement :
 *   - Le cycle de vie de l'engine (création / destruction)
 *   - L'état React (activeItem, isMoving, showHint)
 *   - La synchronisation isVisible → engine.setPaused()
 *   - Le rendu du titre/description/bouton de l'item actif (DOM, pas WebGL)
 *   - Le hint "Glisse pour explorer" qui disparaît au premier touch
 *
 * NOTE : importé via next/dynamic ssr:false depuis GalaxyHero — donc ce code
 * ne s'exécute QUE côté client. window, canvas et WebGL2 sont safe à utiliser.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./InfiniteMenu.module.css";
import { InfiniteGridMenu, type MenuItem } from "./infinite-menu/grid-engine";

export interface InfiniteMenuProps {
  items: MenuItem[];
  /** Zoom de la caméra. 1.0 = défaut, < 1 = plus proche, > 1 = plus loin. */
  scale?: number;
  /** Si false, l'engine est mis en pause (économie batterie hors viewport). */
  isVisible?: boolean;
}

export default function InfiniteMenu({
  items,
  scale = 1.0,
  isVisible = true,
}: InfiniteMenuProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<InfiniteGridMenu | null>(null);

  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // ============================================================
  // EFFET 1 : création/destruction de l'engine au montage.
  // ============================================================
  useEffect(() => {
    if (!canvasRef.current || items.length === 0) return;
    const canvas = canvasRef.current;

    const handleActiveItem = (index: number) => {
      const item = items[index % items.length];
      if (item) setActiveItem(item);
    };

    // Premier toucher : on cache le hint via callback (l'engine appelle ça
    // depuis ArcballControl quand il détecte le premier pointerdown).
    const handleFirstInteraction = () => setShowHint(false);

    const engine = new InfiniteGridMenu(
      canvas,
      items,
      handleActiveItem,
      setIsMoving,
      (sk) => sk.run(),
      scale,
      handleFirstInteraction
    );
    engineRef.current = engine;

    const handleResize = () => engine.resize();
    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      engine.dispose();
      engineRef.current = null;
    };
  }, [items, scale]);

  // ============================================================
  // EFFET 2 : synchronise isVisible avec l'engine (pause/reprise).
  // ============================================================
  useEffect(() => {
    engineRef.current?.setPaused(!isVisible);
  }, [isVisible]);

  // ============================================================
  // Handler du bouton d'action (ouvre le lien du module actif).
  // ============================================================
  const handleButtonClick = () => {
    if (!activeItem?.link) return;
    if (activeItem.link.startsWith("http")) {
      window.open(activeItem.link, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className={styles.container}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-hidden="true"
      />
      {activeItem && (
        <>
          <h2
            className={`${styles.faceTitle} ${
              isMoving ? styles.faceTitleInactive : styles.faceTitleActive
            }`}
          >
            {activeItem.title}
          </h2>
          <p
            className={`${styles.faceDescription} ${
              isMoving
                ? styles.faceDescriptionInactive
                : styles.faceDescriptionActive
            }`}
          >
            {activeItem.description}
          </p>
          <button
            type="button"
            onClick={handleButtonClick}
            aria-label={`Ouvrir ${activeItem.title}`}
            className={`${styles.actionButton} ${
              isMoving ? styles.actionButtonInactive : styles.actionButtonActive
            }`}
          >
            <span aria-hidden="true" className={styles.actionButtonIcon}>
              {/* Flèche diagonale Unicode U+2197 */}
              {"↗"}
            </span>
          </button>
        </>
      )}
      {/* Hint visible jusqu'au premier touch — animation pulse via Tailwind. */}
      <div
        className={`${styles.hint} ${showHint ? styles.hintVisible : styles.hintHidden} animate-pulse`}
        aria-hidden="true"
      >
        Glisse pour explorer
      </div>
    </div>
  );
}
