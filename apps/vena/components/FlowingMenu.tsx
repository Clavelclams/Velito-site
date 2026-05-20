/**
 * FlowingMenu — menu vertical dont chaque entrée révèle un bandeau marquee
 * animé au survol (effet "qui coule" venant du bord le plus proche du curseur).
 *
 * Adapté de React Bits (https://reactbits.dev) pour la charte VENA :
 * - bandeau kaki #414C35, texte crème
 * - gsap pour l'animation d'entrée/sortie (timeline expo)
 *
 * Usage : <FlowingMenu items={[{ link, text, image }]} />
 *  - link  : URL (interne ou externe). external => ouvre dans un onglet.
 *  - text  : libellé affiché
 *  - image : URL d'image affichée dans le marquee (optionnel)
 *
 * IMPORTANT (CDA / explication du code) :
 *  - "use client" car on manipule le DOM (refs) + events souris.
 *  - On calcule le bord le plus proche (haut/bas) pour faire entrer le
 *    bandeau depuis ce côté, ce qui donne la sensation de fluidité.
 */
"use client";

import { useRef } from "react";
import { gsap } from "gsap";

export interface FlowingMenuItem {
  link: string;
  text: string;
  image?: string;
  /** true => lien externe (target _blank). Sinon navigation interne. */
  external?: boolean;
}

interface FlowingMenuProps {
  items: FlowingMenuItem[];
}

export default function FlowingMenu({ items }: FlowingMenuProps) {
  return (
    <div className="flowing-menu">
      <nav className="flowing-menu__nav" aria-label="Liens Velito">
        {items.map((item, i) => (
          <MenuItem key={`${item.link}-${i}`} {...item} />
        ))}
      </nav>
    </div>
  );
}

function MenuItem({ link, text, image, external }: FlowingMenuItem) {
  const itemRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const marqueeInnerRef = useRef<HTMLDivElement>(null);

  const animDefaults = { duration: 0.6, ease: "expo" as const };

  // distance² (pas besoin de la racine pour comparer)
  const dist = (x: number, y: number, x2: number, y2: number) => {
    const dx = x - x2;
    const dy = y - y2;
    return dx * dx + dy * dy;
  };

  const closestEdge = (mx: number, my: number, w: number, h: number) => {
    const top = dist(mx, my, w / 2, 0);
    const bottom = dist(mx, my, w / 2, h);
    return top < bottom ? "top" : "bottom";
  };

  const handleEnter = (e: React.MouseEvent) => {
    if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current)
      return;
    const rect = itemRef.current.getBoundingClientRect();
    const edge = closestEdge(
      e.clientX - rect.left,
      e.clientY - rect.top,
      rect.width,
      rect.height,
    );
    gsap
      .timeline({ defaults: animDefaults })
      .set(marqueeRef.current, { y: edge === "top" ? "-101%" : "101%" })
      .set(marqueeInnerRef.current, { y: edge === "top" ? "101%" : "-101%" })
      .to([marqueeRef.current, marqueeInnerRef.current], { y: "0%" });
  };

  const handleLeave = (e: React.MouseEvent) => {
    if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current)
      return;
    const rect = itemRef.current.getBoundingClientRect();
    const edge = closestEdge(
      e.clientX - rect.left,
      e.clientY - rect.top,
      rect.width,
      rect.height,
    );
    gsap
      .timeline({ defaults: animDefaults })
      .to(marqueeRef.current, { y: edge === "top" ? "-101%" : "101%" })
      .to(marqueeInnerRef.current, { y: edge === "top" ? "101%" : "-101%" }, 0);
  };

  // On répète le contenu pour que le marquee défile sans trou.
  const repeated = Array.from({ length: 4 }).map((_, i) => (
    <span key={i} className="inline-flex items-center">
      <span>{text}</span>
      {image ? (
        <span
          className="flowing-menu__marquee-img"
          style={{ backgroundImage: `url(${image})` }}
          aria-hidden="true"
        />
      ) : (
        <span className="flowing-menu__marquee-img" aria-hidden="true" />
      )}
    </span>
  ));

  return (
    <div className="flowing-menu__item" ref={itemRef}>
      <a
        className="flowing-menu__link"
        href={link}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {text}
      </a>
      <div className="flowing-menu__marquee" ref={marqueeRef} aria-hidden="true">
        <div className="flowing-menu__marquee-inner" ref={marqueeInnerRef}>
          <div className="flowing-menu__marquee-track">{repeated}</div>
          <div className="flowing-menu__marquee-track">{repeated}</div>
        </div>
      </div>
    </div>
  );
}
