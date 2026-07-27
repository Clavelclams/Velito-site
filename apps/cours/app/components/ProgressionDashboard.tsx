/**
 * WIDGET PROGRESSION — composant CLIENT.
 *
 * Affiche XP, série de jours, fiches lues et quiz réussis, plus le bouton
 * « Révision du jour ». Les données viennent du localStorage : on les lit
 * dans un useEffect (jamais au premier rendu) pour que le HTML serveur et le
 * premier rendu client soient identiques — sinon React signale une erreur
 * d'hydratation. D'où l'état `monte`.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  chargerProgression,
  serieCourante,
  type Progression,
} from "@/lib/progression";

export default function ProgressionDashboard({
  totalFiches,
  totalQuiz,
}: {
  totalFiches: number;
  totalQuiz: number;
}) {
  const [progression, setProgression] = useState<Progression | null>(null);

  useEffect(() => {
    const rafraichir = () => setProgression(chargerProgression());
    rafraichir();
    // Le quiz et la barre de lecture émettent cet événement à chaque gain d'XP.
    window.addEventListener("progression-maj", rafraichir);
    return () => window.removeEventListener("progression-maj", rafraichir);
  }, []);

  // Avant montage : squelette neutre de la même taille (pas de saut visuel).
  if (progression === null) {
    return (
      <section className="mb-10 h-[104px] rounded-2xl border border-cours-border bg-cours-surface" />
    );
  }

  const serie = serieCourante(progression);
  const quizFaits = Object.keys(progression.quiz).filter(
    (s) => s !== "revision-du-jour",
  ).length;
  const fichesLues = progression.fichesLues.length;

  const stats = [
    { valeur: progression.xp, label: "XP", icone: "⚡" },
    { valeur: serie, label: serie > 1 ? "jours de suite" : "jour de suite", icone: serie > 0 ? "🔥" : "🪵" },
    { valeur: `${fichesLues}/${totalFiches}`, label: "fiches lues", icone: "📖" },
    { valeur: `${quizFaits}/${totalQuiz}`, label: "quiz faits", icone: "🎯" },
  ];

  return (
    <section className="anim-arrivee mb-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cours-border bg-cours-surface p-5">
      <div className="flex flex-wrap gap-6">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cours-accent/10 text-xl">
              {s.icone}
            </span>
            <div>
              <p className="text-xl font-bold leading-none tabular-nums">{s.valeur}</p>
              <p className="mt-0.5 text-xs text-cours-text-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      {totalQuiz > 0 && (
        <Link
          href="/revision"
          className="rounded-xl bg-gradient-to-r from-cours-accent to-cours-bloc2 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cours-accent/20 transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          🎯 Révision du jour
        </Link>
      )}
    </section>
  );
}
