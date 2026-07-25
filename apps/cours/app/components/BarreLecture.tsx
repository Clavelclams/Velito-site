/**
 * BARRE DE LECTURE — composant CLIENT.
 *
 * Fine barre sous le header qui se remplit au fil du scroll de la fiche.
 * Quand la lecture dépasse ~85 %, la fiche est marquée « lue » (une seule
 * fois, +20 XP) et un petit toast le signale. C'est le « fait » de
 * l'apprentissage actif : lire jusqu'au bout compte, littéralement.
 */
"use client";

import { useEffect, useState } from "react";
import { marquerFicheLue } from "@/lib/progression";

export default function BarreLecture({ slug }: { slug: string }) {
  const [pourcent, setPourcent] = useState(0);
  const [xpToast, setXpToast] = useState<number | null>(null);

  useEffect(() => {
    let dejaMarquee = false;

    function surScroll() {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      const p = total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 100;
      setPourcent(p);

      if (p > 85 && !dejaMarquee) {
        dejaMarquee = true; // évite de rappeler à chaque pixel de scroll
        const xp = marquerFicheLue(slug);
        if (xp > 0) {
          setXpToast(xp);
          setTimeout(() => setXpToast(null), 3500);
        }
      }
    }

    surScroll(); // position initiale (fiche courte = déjà en bas)
    window.addEventListener("scroll", surScroll, { passive: true });
    return () => window.removeEventListener("scroll", surScroll);
  }, [slug]);

  return (
    <>
      {/* Barre collée sous le header (le header fait ~49px de haut, sticky top-0 z-10) */}
      <div className="fixed left-0 top-[49px] z-20 h-0.5 w-full bg-transparent">
        <div
          className="h-full bg-cours-accent transition-[width] duration-150"
          style={{ width: `${pourcent}%` }}
        />
      </div>

      {/* Toast « fiche lue » */}
      {xpToast !== null && (
        <div className="anim-pop fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-cours-text px-5 py-2.5 text-sm font-semibold text-white shadow-lg">
          Fiche lue ✓ <span className="text-emerald-300">+{xpToast} XP</span>
        </div>
      )}
    </>
  );
}
