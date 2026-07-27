/**
 * REPRENDRE MA LEÇON — composant CLIENT.
 * La carte « où j'en étais » du dashboard : première leçon non faite, tous
 * parcours confondus (dans l'ordre des parcours puis des leçons — la liste
 * arrive déjà triée du serveur). Un clic = zéro friction pour la leçon du
 * jour, c'est le bouton le plus important du site.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { chargerProgression } from "@/lib/progression";

export interface LeconAReprendre {
  id: string;
  titre: string;
  parcours: string;
  parcoursTitre: string;
  icone: string;
  fichier: string;
  ordre: number;
}

export default function ContinuerParcours({
  lecons,
}: {
  lecons: LeconAReprendre[];
}) {
  const [prochaine, setProchaine] = useState<LeconAReprendre | null | undefined>();

  useEffect(() => {
    const rafraichir = () => {
      const faites = chargerProgression().leconsFaites;
      setProchaine(lecons.find((l) => !faites.includes(l.id)) ?? null);
    };
    rafraichir();
    window.addEventListener("progression-maj", rafraichir);
    return () => window.removeEventListener("progression-maj", rafraichir);
  }, [lecons]);

  // undefined = pas encore monté ; null = tout est fait.
  if (prochaine === undefined || lecons.length === 0) return null;

  if (prochaine === null) {
    return (
      <section className="anim-arrivee mb-10 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-center text-sm font-semibold text-emerald-700">
        🏆 Tous les parcours sont terminés — place à la révision des fiches.
      </section>
    );
  }

  return (
    <section className="anim-arrivee mb-10">
      {/* Mobile : empilé (texte puis bouton pleine largeur) ; desktop : en ligne. */}
      <Link
        href={`/parcours/${prochaine.parcours}/${prochaine.fichier}`}
        className="flex flex-col gap-4 rounded-2xl border border-cours-accent/40 bg-cours-accent/5 p-5 transition-all hover:-translate-y-0.5 hover:border-cours-accent hover:shadow-lg sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-4">
          <span className="text-3xl">{prochaine.icone}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cours-text-muted">
              La leçon du jour · {prochaine.parcoursTitre} · leçon{" "}
              {prochaine.ordre}
            </p>
            <p className="mt-0.5 font-bold">{prochaine.titre}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-xl bg-gradient-to-r from-cours-accent to-cours-bloc2 px-4 py-2 text-center text-sm font-bold text-white shadow-md shadow-cours-accent/20 sm:w-auto">
          Reprendre →
        </span>
      </Link>
    </section>
  );
}
