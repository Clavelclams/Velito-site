/**
 * <EstimImage /> — affiche l'image d'un objet Estim'.
 *
 * Si le fichier image n'existe pas (404), on fallback sur l'emoji.
 * On utilise <img> classique (pas Next/Image) car les images sont locales
 * et statiques — pas besoin de l'optimisation server-side.
 */
"use client";

import { useState } from "react";

interface EstimImageProps {
  src?: string;
  emoji?: string;
  label: string;
  /** Classes Tailwind pour la taille (ex: "h-64 w-full"). */
  className?: string;
}

export default function EstimImage({
  src,
  emoji = "💰",
  label,
  className = "h-64 w-full",
}: EstimImageProps) {
  const [errored, setErrored] = useState(false);

  // Si pas de src ou erreur → fallback emoji
  if (!src || errored) {
    return (
      <div
        className={
          "grid place-items-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] " +
          className
        }
        aria-label={label}
      >
        <span aria-hidden="true" className="text-7xl sm:text-8xl">
          {emoji}
        </span>
      </div>
    );
  }

  return (
    <div className={"overflow-hidden rounded-2xl border border-white/10 bg-ink-700/40 " + className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
        onError={() => setErrored(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
