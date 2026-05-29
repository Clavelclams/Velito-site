/**
 * <ContinueWithVena />
 *
 * Bouton réutilisable par les modules Velito (Interactive, Arena, etc.) pour
 * envoyer l'utilisateur sur le login central du hub. Au retour, l'utilisateur
 * est ramené automatiquement à l'URL d'origine (?return=...).
 *
 * Façade UX : on dit "Continuer avec VENA" parce que VENA est la marque que
 * l'écosystème met en avant. Techniquement c'est le compte unique Velito
 * hébergé sur le hub.
 *
 * Usage :
 *   import { ContinueWithVena } from "@repo/ui/continue-with-vena";
 *   <ContinueWithVena hubUrl={process.env.NEXT_PUBLIC_HUB_URL} returnTo={window.location.href} />
 */
"use client";

import { useEffect, useState } from "react";

interface ContinueWithVenaProps {
  /** URL racine du hub (ex : "https://hub.velito.fr"). Lis NEXT_PUBLIC_HUB_URL. */
  hubUrl?: string;
  /** URL où l'utilisateur revient après login. Par défaut : window.location.href. */
  returnTo?: string;
  /** Classes additionnelles pour layout. */
  className?: string;
  /** Texte du bouton. Défaut : "Continuer avec VENA". */
  label?: string;
}

export function ContinueWithVena({
  hubUrl,
  returnTo,
  className = "",
  label = "Continuer avec VENA",
}: ContinueWithVenaProps) {
  const [href, setHref] = useState<string>("#");

  useEffect(() => {
    const base = hubUrl ?? "https://hub.velito.fr";
    const back = returnTo ?? (typeof window !== "undefined" ? window.location.href : "/");
    const u = new URL(base);
    u.pathname = "/login";
    u.searchParams.set("return", back);
    setHref(u.toString());
  }, [hubUrl, returnTo]);

  return (
    <a
      href={href}
      className={
        "inline-flex items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10 " +
        className
      }
    >
      <VenaSymbol className="h-5 w-5 shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
}

/** Symbole VENA inline (pas de dépendance asset). */
function VenaSymbol({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1000 1000" width="20" height="20" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M500.1,370.3c0,35.9-29.1,65-65,65s-65-29.1-65-65s-29.1-65-65-65s-65-29.1-65-65s-29.1-65-65-65s-65-29.1-65-65s29.1-65,65-65s65,29.1,65,65s29.1,65,65,65s65,29.1,65,65s29.1,65,65,65S500.1,334.4,500.1,370.3z M890,110.4c0,35.9-29.1,65-65,65s-65,29.1-65,65s-29.1,65-65,65s-65,29.1-65,65s-29.1,65-65,65c-35.9,0-65-29.1-65-65s29.1-65,65-65c35.9,0,65-29.1,65-65s29.1-65,65-65s65-29.1,65-65s29.1-65,65-65S890,74.5,890,110.4z M500.1,630.1c0,35.9-29.1,65-65,65s-65,29.1-65,65s-29.1,65-65,65s-65,29.1-65,65s-29.1,65-65,65s-65-29.1-65-65s29.1-65,65-65s65-29.1,65-65s29.1-65,65-65s65-29.1,65-65c0-35.9,29.1-65,65-65S500.1,594.3,500.1,630.1z M890,890c0,35.9-29.1,65-65,65s-65-29.1-65-65s-29.1-65-65-65s-65-29.1-65-65s-29.1-65-65-65c-35.9,0-65-29.1-65-65c0-35.9,29.1-65,65-65c35.9,0,65,29.1,65,65c0,35.9,29.1,65,65,65s65,29.1,65,65s29.1,65,65,65S890,854.1,890,890z"
      />
      <circle cx="175.3" cy="500.2" r="65" fill="currentColor" />
      <circle cx="305.2" cy="500.2" r="65" fill="currentColor" />
      <circle cx="435.2" cy="500.2" r="65" fill="currentColor" />
      <circle cx="565.1" cy="500.2" r="65" fill="currentColor" />
      <circle cx="695.1" cy="500.2" r="65" fill="currentColor" />
      <circle cx="825" cy="500.2" r="65" fill="currentColor" />
    </svg>
  );
}
