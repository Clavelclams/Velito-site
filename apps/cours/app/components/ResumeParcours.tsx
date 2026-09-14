/**
 * RÉSUMÉ D'UN PARCOURS — composant CLIENT.
 * Sous la description : la répartition des leçons par niveau (barre colorée)
 * et, une fois la progression lue, le temps restant. Répond à deux questions
 * avant de commencer : « c'est dur ? » et « il m'en reste combien ? ».
 */
"use client";

import { useEffect, useState } from "react";
import type { LeconMeta } from "@/lib/fiches/parcours";
import {
  BARRES_NIVEAUX,
  LIBELLES_NIVEAUX,
  NIVEAUX,
  niveauValide,
} from "@/lib/fiches/niveaux";
import { chargerProgression } from "@/lib/progression";

export default function ResumeParcours({ lecons }: { lecons: LeconMeta[] }) {
  const [faites, setFaites] = useState<string[] | null>(null);

  useEffect(() => {
    const rafraichir = () => setFaites(chargerProgression().leconsFaites);
    rafraichir();
    window.addEventListener("progression-maj", rafraichir);
    return () => window.removeEventListener("progression-maj", rafraichir);
  }, []);

  const total = lecons.length;
  const parNiveau = NIVEAUX.map((n) => ({
    niveau: n,
    nb: lecons.filter((l) => niveauValide(l.niveau) === n).length,
  })).filter((x) => x.nb > 0);

  const nbFaites = faites ? lecons.filter((l) => faites.includes(l.id)).length : 0;
  const minutesRestantes = faites
    ? lecons.filter((l) => !faites.includes(l.id)).reduce((t, l) => t + l.duree, 0)
    : lecons.reduce((t, l) => t + l.duree, 0);

  return (
    <div className="mt-4">
      {/* Barre de répartition par niveau */}
      <div className="flex h-2 overflow-hidden rounded-full" aria-hidden="true">
        {parNiveau.map((x) => (
          <span
            key={x.niveau}
            className={BARRES_NIVEAUX[x.niveau]}
            style={{ width: `${(x.nb / total) * 100}%` }}
          />
        ))}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-cours-text-muted">
        {parNiveau.map((x) => (
          <span key={x.niveau} className="inline-flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${BARRES_NIVEAUX[x.niveau]}`} />
            {x.nb} {LIBELLES_NIVEAUX[x.niveau].toLowerCase()}
          </span>
        ))}
      </p>

      {/* Temps restant — affiché seulement une fois la progression connue */}
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-cours-text-muted">
        {faites === null ? (
          <span className="opacity-0">·</span>
        ) : nbFaites === total ? (
          "Parcours terminé 🏆"
        ) : nbFaites === 0 ? (
          `${total} leçons · ~${Math.round(minutesRestantes / 60)} h · une par jour`
        ) : (
          `${nbFaites}/${total} faites · ~${Math.max(1, Math.round(minutesRestantes / 60))} h restantes`
        )}
      </p>
    </div>
  );
}
