/**
 * GRILLE DES PARCOURS — composant CLIENT.
 * Cartes des parcours avec la barre de progression de chacun, calculée en
 * croisant les identifiants de leçons (venus du serveur en props) avec les
 * leçons faites (localStorage). Lecture après montage, comme partout.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ParcoursMeta } from "@/lib/fiches/parcours";
import { chargerProgression } from "@/lib/progression";

export default function GrilleParcours({
  parcours,
}: {
  parcours: ParcoursMeta[];
}) {
  const [faites, setFaites] = useState<string[] | null>(null);

  useEffect(() => {
    const rafraichir = () => setFaites(chargerProgression().leconsFaites);
    rafraichir();
    window.addEventListener("progression-maj", rafraichir);
    return () => window.removeEventListener("progression-maj", rafraichir);
  }, []);

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {parcours.map((p, i) => {
        const nbFaites =
          faites === null
            ? 0
            : p.idsLecons.filter((id) => faites.includes(id)).length;
        const pourcent = p.nbLecons > 0 ? (nbFaites / p.nbLecons) * 100 : 0;
        const terminee = nbFaites === p.nbLecons && p.nbLecons > 0;
        return (
          <li key={p.slug} className="anim-arrivee" style={{ animationDelay: `${i * 80}ms` }}>
            <Link
              href={`/parcours/${p.slug}`}
              className="block rounded-2xl border border-cours-border bg-cours-surface p-5 transition-all hover:-translate-y-0.5 hover:border-cours-accent hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cours-accent/10 text-2xl">
                  {p.icone}
                </span>
                {terminee && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    Terminé 🏆
                  </span>
                )}
              </div>
              <p className="mt-3 text-lg font-bold">{p.titre}</p>
              <p className="mt-1 text-sm leading-relaxed text-cours-text-muted">
                {p.description}
              </p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-cours-border">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cours-accent to-cours-bloc2 transition-all duration-700"
                  style={{ width: `${pourcent}%` }}
                />
              </div>
              <p className="mt-1.5 text-right text-xs tabular-nums text-cours-text-muted">
                {nbFaites}/{p.nbLecons} leçons
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
