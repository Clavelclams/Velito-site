/**
 * LanyardCard — carte d'identité "tour de cou" (badge) recto/verso.
 *
 * VERSION LAUNCH-SAFE (zéro dépendance 3D, aucun asset .glb requis) :
 *  - la carte pend d'une lanière kaki et se balance doucement (CSS),
 *  - on peut l'ATTRAPER à la souris/au doigt pour la faire balancer,
 *  - un CLIC (sans drag) la RETOURNE : recto = Clavel, verso = logo VENA.
 *
 * Pourquoi cette version plutôt que le Lanyard 3D physique (three/rapier) :
 *  le Lanyard React Bits a besoin d'un fichier `card.glb` qu'on n'a pas
 *  encore, et embarque 5 grosses libs WASM. Pour ne PAS bloquer la mise en
 *  ligne, on livre cette carte (qui marche tout de suite). Le composant 3D
 *  réel est prêt dans `Lanyard3D.tsx` pour activation post-lancement.
 *
 * Remplacer la photo : déposer une image dans /public/lien/clavel.jpg
 * puis passer la prop `photoUrl="/lien/clavel.jpg"`.
 */
"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";

interface LanyardCardProps {
  /** Photo de Clavel (optionnel). Sinon initiales. */
  photoUrl?: string;
}

export default function LanyardCard({ photoUrl }: LanyardCardProps) {
  const swingRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);

  // état du drag (refs pour ne pas re-render à chaque mouvement)
  const dragging = useRef(false);
  const moved = useRef(false);
  const startX = useRef(0);

  const applyRotation = useCallback((deg: number) => {
    if (swingRef.current) {
      // borne l'angle pour rester crédible
      const clamped = Math.max(-22, Math.min(22, deg));
      swingRef.current.style.transform = `rotate(${clamped}deg)`;
    }
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    moved.current = false;
    startX.current = e.clientX;
    if (swingRef.current) swingRef.current.dataset.dragging = "true";
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 4) moved.current = true;
    applyRotation(dx / 6);
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (swingRef.current) {
      // retour fluide à l'oscillation idle
      swingRef.current.style.transform = "";
      swingRef.current.dataset.dragging = "false";
      // micro-timeout : laisse le navigateur réappliquer l'animation idle
      window.setTimeout(() => {
        if (swingRef.current) delete swingRef.current.dataset.dragging;
      }, 50);
    }
  };

  const onClick = () => {
    // si on a draggé, ce n'est pas un clic de flip
    if (moved.current) return;
    setFlipped((f) => !f);
  };

  return (
    <div className="lanyard-stage flex flex-col items-center select-none">
      {/* point d'accroche en haut */}
      <span
        className="w-3 h-3 rounded-full bg-vena-kaki shadow"
        aria-hidden="true"
      />

      <div
        ref={swingRef}
        className="lanyard-swing flex flex-col items-center"
        data-dragging="false"
      >
        {/* lanière */}
        <div className="lanyard-strap h-28 sm:h-36" aria-hidden="true" />

        {/* clip métallique */}
        <span
          className="w-8 h-3 -mt-0.5 rounded-sm bg-gradient-to-b from-zinc-300 to-zinc-500 shadow"
          aria-hidden="true"
        />

        {/* carte flip */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Carte de visite Clavel / VENA — clique pour la retourner"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFlipped((f) => !f);
            }
          }}
          className="lanyard-card mt-1 w-60 h-80 sm:w-64 sm:h-[22rem] cursor-grab active:cursor-grabbing outline-none"
          data-flipped={flipped}
        >
          {/* ---------- RECTO : Clavel ---------- */}
          <div className="lanyard-face lanyard-face--front bg-white border border-vena-border shadow-card-clean flex flex-col">
            {/* bande haute kaki */}
            <div className="bg-vena-kaki text-vena-cream px-4 py-3 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.25em] font-bold">
                Velito
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] opacity-80">
                Fondateur
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-5 text-center gap-3">
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt="Clavel NDEMA MOUSSA"
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-full object-cover border-4 border-vena-kaki-soft"
                />
              ) : (
                <span className="w-24 h-24 rounded-full bg-vena-kaki text-vena-cream flex items-center justify-center font-display font-black text-3xl border-4 border-vena-kaki-soft">
                  CN
                </span>
              )}
              <div>
                <p className="font-display font-black text-vena-kaki text-lg leading-tight">
                  Clavel
                  <br />
                  NDEMA MOUSSA
                </p>
                <p className="text-[11px] uppercase tracking-widest text-vena-text-muted mt-1.5">
                  Développeur · Numérique
                </p>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-vena-border text-center">
              <p className="text-[10px] text-vena-text-dim">
                Amiens · Hauts-de-France
              </p>
            </div>
          </div>

          {/* ---------- VERSO : logo VENA ---------- */}
          <div className="lanyard-face lanyard-face--back bg-vena-kaki flex flex-col items-center justify-center gap-4 p-6">
            <Image
              src="/images/vena-symbole-blanc.svg"
              alt="VENA"
              width={96}
              height={96}
              className="w-24 h-24"
            />
            <p className="text-vena-cream font-display font-black text-2xl tracking-wide">
              VENA
            </p>
            <p className="text-vena-cream/70 text-[10px] uppercase tracking-[0.3em] text-center leading-relaxed">
              Velito Expertise
              <br />
              Numérique Amiens
            </p>
          </div>
        </div>
      </div>

      <p className="mt-5 text-[11px] text-vena-text-dim italic">
        Attrape la carte ou clique pour la retourner
      </p>
    </div>
  );
}
