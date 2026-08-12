/**
 * Jeu d'icônes ARENA — SVG en ligne, épaisseur de trait unique (1.75), même
 * arrondi. Un seul jeu cohérent partout.
 *
 * Pourquoi pas d'émoji : un émoji change de dessin selon le système (Windows,
 * Android, iOS), ne suit pas la couleur du texte, et ne se redimensionne pas
 * proprement. Ces SVG héritent de `currentColor`, donc ils prennent
 * automatiquement la couleur du texte qui les entoure.
 *
 * Pourquoi pas une bibliothèque d'icônes : on en utilise cinq. Installer un
 * paquet pour cinq chemins SVG serait une dépendance de plus à maintenir et à
 * justifier.
 *
 * `aria-hidden` sur toutes : ces icônes accompagnent toujours un texte visible,
 * elles ne portent donc aucune information à elles seules. Un lecteur d'écran
 * qui les annoncerait ne ferait que répéter le texte d'à côté.
 */

interface PropsIcone {
  className?: string;
}

const base = "h-5 w-5 shrink-0";
const traits = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconeTrophee({ className = base }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...traits}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 5" />
      <path d="M17 6h2.5a2.5 2.5 0 0 1-2.5 5" />
      <path d="M12 14v3" />
      <path d="M8.5 20h7l-.7-3h-5.6l-.7 3Z" />
    </svg>
  );
}

export function IconeCalendrier({ className = base }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...traits}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3.5v3M16 3.5v3" />
    </svg>
  );
}

export function IconeJoueurs({ className = base }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...traits}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3 19.5c0-3 2.7-5 6-5s6 2 6 5" />
      <path d="M16 5.5a3.25 3.25 0 0 1 0 6.4M17.5 14.9c2.1.6 3.5 2.3 3.5 4.6" />
    </svg>
  );
}

export function IconeQr({ className = base }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...traits}>
      <rect x="3.5" y="3.5" width="6" height="6" rx="1.5" />
      <rect x="14.5" y="3.5" width="6" height="6" rx="1.5" />
      <rect x="3.5" y="14.5" width="6" height="6" rx="1.5" />
      <path d="M14.5 14.5h3v3h-3zM20.5 14.5v1.5M20.5 20.5h-3" />
    </svg>
  );
}

export function IconeValide({ className = base }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...traits}>
      <circle cx="12" cy="12" r="8.75" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
    </svg>
  );
}

export function IconeManette({ className = base }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...traits}>
      <path d="M8 7h8a5 5 0 0 1 4.9 4l.7 4.2A2.6 2.6 0 0 1 19 18.3l-1.9-2.3H6.9L5 18.3A2.6 2.6 0 0 1 2.4 15.2L3.1 11A5 5 0 0 1 8 7Z" />
      <path d="M7.5 10.5v2.2M6.4 11.6h2.2M15.8 11h.01M17.9 12.6h.01" />
    </svg>
  );
}

/** Petit rond animé « en direct ». Le halo respecte prefers-reduced-motion. */
export function PastilleDirect({ className = "" }: PropsIcone) {
  return (
    <span className={`relative flex h-2.5 w-2.5 ${className}`} aria-hidden>
      <span className="pulsation absolute inline-flex h-full w-full rounded-full bg-arena-red opacity-60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-arena-red" />
    </span>
  );
}
