/**
 * État de chargement global (App Router : affiché pendant qu'un Server
 * Component attend la base). Sans ce fichier, la navigation entre deux pages
 * semble « gelée » le temps de la requête — sur un téléphone en 4G dans une
 * salle de tournoi, ça se compte en secondes et le joueur re-tape.
 *
 * Pas de squelette élaboré : trois blocs neutres et une phrase. Ce qui
 * compte est que quelque chose réponde tout de suite.
 */
export default function Chargement() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto max-w-2xl px-4 py-16"
    >
      <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-arena-faint">
        Chargement…
      </p>
      <div className="space-y-3" aria-hidden>
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-arena-surface" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-arena-surface" />
        <div className="mt-8 h-24 animate-pulse rounded-lg bg-arena-surface" />
        <div className="h-24 animate-pulse rounded-lg bg-arena-surface" />
      </div>
    </div>
  );
}
