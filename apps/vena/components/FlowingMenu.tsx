/**
 * FlowingMenu — menu vertical dont chaque entrée révèle un bandeau marquee
 * animé au survol (effet "qui coule" venant du bord le plus proche du curseur).
 *
 * Adapté de React Bits (https://reactbits.dev) pour la charte VENA :
 * - bandeau kaki #414C35, texte crème
 * - gsap pour l'animation d'entrée/sortie (timeline expo)
 *
 * Chaque entrée a une "bulle" (le petit médaillon répété dans le marquee) :
 *  - kind "image" : un logo (VEA, VENA recoloré, MABB...) ; `bg` = fond du
 *    médaillon (ex: blanc pour faire ressortir un logo couleur).
 *  - kind "text"  : un texte stylé (ex: "@claveliito", "Clavel") avec
 *    couleur / fond / police personnalisés.
 *
 * "use client" car on manipule le DOM (refs) + events souris.
 */
"use client";

import { useRef } from "react";
import { gsap } from "gsap";

export type FlowingBubble =
  | { kind: "image"; src: string; bg?: string }
  | { kind: "text"; value: string; color?: string; bg?: string; font?: string };

export interface FlowingMenuItem {
  link: string;
  text: string;
  /** true => lien externe (target _blank). Sinon navigation interne. */
  external?: boolean;
  /** médaillon affiché dans le marquee au survol */
  bubble?: FlowingBubble;
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

/** Rend le médaillon (bulle) selon son type. */
function Bubble({ bubble }: { bubble?: FlowingBubble }) {
  if (!bubble) {
    return <span className="flowing-menu__marquee-img" aria-hidden="true" />;
  }
  if (bubble.kind === "image") {
    return (
      <span
        className="flowing-menu__marquee-img"
        style={{
          backgroundImage: `url(${bubble.src})`,
          backgroundColor: bubble.bg ?? "transparent",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className="flowing-menu__marquee-text"
      style={{
        color: bubble.color ?? "var(--vena-cream)",
        backgroundColor: bubble.bg ?? "transparent",
        fontFamily: bubble.font,
      }}
      aria-hidden="true"
    >
      {bubble.value}
    </span>
  );
}

function MenuItem({ link, text, external, bubble }: FlowingMenuItem) {
  const itemRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const marqueeInnerRef = useRef<HTMLDivElement>(null);

  const animDefaults = { duration: 0.6, ease: "expo" as const };

  const d = (x: number, y: number, x2: number, y2: number) => {
    const dx = x - x2;
    const dy = y - y2;
    return dx * dx + dy * dy;
  };

  const closestEdge = (mx: number, my: number, w: number, h: number) =>
    d(mx, my, w / 2, 0) < d(mx, my, w / 2, h) ? "top" : "bottom";

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

  // contenu répété pour un défilement sans trou
  const repeated = Array.from({ length: 4 }).map((_, i) => (
    <span key={i} className="inline-flex items-center">
      <span>{text}</span>
      <Bubble bubble={bubble} />
    </span>
  ));

  return (
    <div className="flowing-menu__item" ref={itemRef}>
      <a
        className="flowing-menu__link"
        href={link}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
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
