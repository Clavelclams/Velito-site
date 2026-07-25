/**
 * BOUTON « LEÇON TERMINÉE » — composant CLIENT.
 * C'est l'élève qui coche, comme dans un cahier d'exercices : le clic affirme
 * « j'ai lu le cours ET fait la mise en pratique ». +30 XP, une seule fois.
 */
"use client";

import { useEffect, useState } from "react";
import { chargerProgression, marquerLeconFaite } from "@/lib/progression";

export default function BoutonLeconFaite({ idLecon }: { idLecon: string }) {
  const [faite, setFaite] = useState<boolean | null>(null);
  const [xpToast, setXpToast] = useState<number | null>(null);

  useEffect(() => {
    setFaite(chargerProgression().leconsFaites.includes(idLecon));
  }, [idLecon]);

  function valider() {
    const xp = marquerLeconFaite(idLecon);
    setFaite(true);
    if (xp > 0) {
      setXpToast(xp);
      setTimeout(() => setXpToast(null), 3500);
    }
  }

  if (faite === null) return <div className="h-12" />;

  return (
    <div className="text-center">
      {faite ? (
        <p className="anim-pop inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-5 py-3 text-sm font-bold text-emerald-700">
          ✓ Leçon terminée
        </p>
      ) : (
        <button
          type="button"
          onClick={valider}
          className="rounded-xl bg-cours-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-cours-accent-hover hover:shadow-lg"
        >
          J&apos;ai fait la mise en pratique ✓
        </button>
      )}
      {xpToast !== null && (
        <div className="anim-pop fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-cours-text px-5 py-2.5 text-sm font-semibold text-white shadow-lg">
          Leçon terminée 🎉 <span className="text-emerald-300">+{xpToast} XP</span>
        </div>
      )}
    </div>
  );
}
