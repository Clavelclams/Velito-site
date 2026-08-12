"use client";

/**
 * Error boundary global — filet de sécurité pour les erreurs NON métier
 * (les erreurs métier sont gérées par redirection ?erreur=, voir actions.ts).
 * Doit être un Client Component : c'est une contrainte de Next.js, car il
 * s'accroche au rendu React côté navigateur pour offrir le bouton "réessayer".
 */
export default function ErreurGlobale({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-4xl">😵</p>
      <h1 className="mt-4 text-xl font-bold">Quelque chose a cassé</h1>
      <p className="mt-2 text-sm text-arena-muted">
        Réessaie. Si ça persiste pendant un tournoi, préviens le staff ARENA et
        continuez sur papier : les scores seront ressaisis après.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-arena-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-arena-violet-fonce"
      >
        Réessayer
      </button>
    </div>
  );
}
