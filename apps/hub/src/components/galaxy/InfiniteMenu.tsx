/**
 * Composant React InfiniteMenu — sphère 3D rotative des modules Velito.
 *
 * Affiche autour de la sphère :
 *  - Gauche : bloc unique (titre + résumé "Explorez X..." empilés en flex column)
 *  - Droite : description courte du module actif
 *  - En bas : bouton "Ouvrir ↗" + hint d'aide contextuel
 *
 * Hint contextuel :
 *  - Avant interaction (hasInteracted=false) → "Clic & glisse pour explorer l'écosystème"
 *  - Après interaction (hasInteracted=true)  → "Glisse pour découvrir un autre module"
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || items.length === 0) return;
    const canvas = canvasRef.current;

    const handleActiveItem = (index: number) => {
      const item = items[index % items.length];
      if (item) setActiveItem(item);
    };

    const handleFirstInteraction = () => setHasInteracted(true);

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

  useEffect(() => {
    engineRef.current?.setPaused(!isVisible);
  }, [isVisible]);

  const handleButtonClick = () => {
    if (!activeItem?.link) return;
    if (activeItem.link.startsWith("http")) {
      window.open(activeItem.link, "_blank", "noopener,noreferrer");
    } else {
      router.push(activeItem.link);
    }
  };

  // Texte du hint contextuel : pré- vs post-interaction.
  const hintText = hasInteracted
    ? "Glisse pour découvrir un autre module"
    : "Clic & glisse pour explorer l'écosystème";

  return (
    <div className={styles.container}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-hidden="true"
      />
      {activeItem && (
        <>
          {/* BLOC GAUCHE — titre + résumé "Explorez X..." empilés (alignés sur même left) */}
          <div
            className={`${styles.faceLeftBlock} ${
              isMoving ? styles.faceLeftBlockInactive : styles.faceLeftBlockActive
            }`}
          >
            <h2 className={styles.faceTitle}>{activeItem.title}</h2>
            <p className={styles.faceSummary}>{activeItem.summary}</p>
          </div>
          {/* DESCRIPTION COURTE — droite, hauteur médiane */}
          <p
            className={`${styles.faceDescription} ${
              isMoving
                ? styles.faceDescriptionInactive
                : styles.faceDescriptionActive
            }`}
          >
            {activeItem.description}
          </p>
          {/* BOUTON OUVRIR — bas centré */}
          <button
            type="button"
            onClick={handleButtonClick}
            aria-label={`Ouvrir ${activeItem.title}`}
            className={`${styles.actionButton} ${
              isMoving ? styles.actionButtonInactive : styles.actionButtonActive
            }`}
          >
            <span className={styles.actionButtonLabel}>Ouvrir</span>
            <span aria-hidden="true" className={styles.actionButtonIcon}>
              {"↗"}
            </span>
          </button>
        </>
      )}
      {/* HINT — toujours visible, texte contextuel selon interaction */}
      <div
        className={`${styles.hint} ${styles.hintVisible}`}
        aria-hidden="true"
      >
        {hintText}
      </div>
    </div>
  );
}
