/**
 * LISTE DES LEÇONS D'UN PARCOURS — composant CLIENT.
 * Affiche les leçons dans l'ordre, coche celles qui sont faites, et met en
 * avant la PROCHAINE à faire (« Continuer ici → ») — le fil d'Ariane façon
 * app de langue. Pas de verrouillage dur : un adulte peut sauter une leçon
 * qu'il maîtrise déjà, le but est de guider, pas d'enfermer.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LeconMeta } from "@/lib/fiches/parcours";
import { chargerProgression } from "@/lib/progression";

const LIBELLES_NIVEAUX: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  solide: "Solide",
  expert: "Expert",
};

export default function ListeLecons({ lecons }: { lecons: LeconMeta[] }) {
  const [faites, setFaites] = useState<string[] | null>(null);

  useEffect(() => {
    const rafraichir = () => setFaites(chargerProgression().leconsFaites);
    rafraichir();
    window.addEventListener("progression-maj", rafraichir);
    return () => window.removeEventListener("progression-maj", rafraichir);
  }, []);

  // La prochaine leçon = la première non faite dans l'ordre.
  const prochaine =
    faites === null ? null : lecons.find((l) => !faites.includes(l.id))?.id;

  return (
    <ol className="space-y-2">
      {lecons.map((lecon, i) => {
        const faite = faites?.includes(lecon.id) ?? false;
        const estProchaine = lecon.id === prochaine;
        return (
          <li key={lecon.id} className="anim-arrivee" style={{ animationDelay: `${i * 50}ms` }}>
            <Link
              href={`/parcours/${lecon.parcours}/${lecon.fichier}`}
              className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                estProchaine
                  ? "border-cours-accent bg-cours-accent/5"
                  : "border-cours-border bg-cours-surface hover:border-cours-accent"
              }`}
            >
              {/* Pastille d'état : numéro, ou ✓ si faite */}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  faite
                    ? "bg-emerald-100 text-emerald-700"
                    : estProchaine
                      ? "bg-cours-accent text-white"
                      : "bg-cours-border/60 text-cours-text-muted"
                }`}
              >
                {faite ? "✓" : lecon.ordre}
              </span>
              <span className="flex-1">
                <span className={`font-medium ${faite ? "text-cours-text-muted" : ""}`}>
                  {lecon.titre}
                </span>
                <span className="mt-0.5 block text-xs text-cours-text-muted">
                  {LIBELLES_NIVEAUX[lecon.niveau] ?? lecon.niveau} · ~{lecon.duree} min
                </span>
              </span>
              {estProchaine && (
                <span className="rounded-full bg-cours-accent px-3 py-1 text-xs font-bold text-white">
                  Continuer ici →
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
