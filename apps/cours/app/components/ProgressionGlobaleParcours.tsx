/**
 * LIGNE DE PROGRESSION GLOBALE — composant CLIENT.
 * En tête de /parcours : combien de leçons faites sur le total, et combien
 * d'heures il reste. Lecture localStorage après montage (voir progression.ts).
 * Le squelette a la même hauteur que le contenu : pas de saut à l'hydratation.
 */
"use client";

import { useEffect, useState } from "react";
import { chargerProgression } from "@/lib/progression";

export default function ProgressionGlobaleParcours({
  idsLecons,
  dureeParId,
}: {
  idsLecons: string[];
  /** Durée (min) de chaque leçon, indexée par id — pour le temps restant. */
  dureeParId: Record<string, number>;
}) {
  const [faites, setFaites] = useState<string[] | null>(null);

  useEffect(() => {
    const rafraichir = () => setFaites(chargerProgression().leconsFaites);
    rafraichir();
    window.addEventListener("progression-maj", rafraichir);
    return () => window.removeEventListener("progression-maj", rafraichir);
  }, []);

  const total = idsLecons.length;
  if (faites === null) {
    return <div className="mb-8 h-[76px] rounded-2xl border border-cours-border bg-cours-surface" />;
  }

  const nbFaites = idsLecons.filter((id) => faites.includes(id)).length;
  const pourcent = total > 0 ? Math.round((nbFaites / total) * 100) : 0;
  const minutesRestantes = idsLecons
    .filter((id) => !faites.includes(id))
    .reduce((t, id) => t + (dureeParId[id] ?? 20), 0);
  const heuresRestantes = Math.round(minutesRestantes / 60);

  return (
    <div className="anim-arrivee mb-8 rounded-2xl border border-cours-border bg-cours-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm">
          <span className="text-2xl font-bold tabular-nums">{nbFaites}</span>
          <span className="text-cours-text-muted"> / {total} leçons faites</span>
        </p>
        <p className="text-xs text-cours-text-muted">
          {nbFaites === total
            ? "Tout est fait 🏆"
            : `≈ ${heuresRestantes} h restantes · une leçon par jour = ${Math.ceil((total - nbFaites) / 30)} mois`}
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-cours-border">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cours-accent to-cours-bloc2 transition-all duration-700"
          style={{ width: `${pourcent}%` }}
        />
      </div>
    </div>
  );
}
