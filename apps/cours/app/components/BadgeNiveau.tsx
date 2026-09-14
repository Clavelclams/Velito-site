/**
 * PASTILLE DE NIVEAU — composant sans état, utilisable serveur ou client.
 * Une couleur par palier pour qu'on repère d'un coup d'œil, dans une liste
 * de dix leçons, où sont les faciles et où sont les dures.
 */
import { COULEURS_NIVEAUX, LIBELLES_NIVEAUX, niveauValide } from "@/lib/fiches/niveaux";

export default function BadgeNiveau({
  niveau,
  className = "",
}: {
  niveau: string;
  className?: string;
}) {
  const n = niveauValide(niveau);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${COULEURS_NIVEAUX[n]} ${className}`}
    >
      {LIBELLES_NIVEAUX[n]}
    </span>
  );
}
