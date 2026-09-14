/**
 * NAVIGATION AU CLAVIER — composant CLIENT sans rendu.
 * ← va à la leçon précédente, → à la suivante. On ignore les touches quand
 * le focus est dans un champ (le quiz n'en a pas, mais une future recherche
 * en aura) et quand une touche de modification est enfoncée (Alt+← = retour
 * navigateur, on ne le vole pas).
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NavigationClavier({
  precedente,
  suivante,
}: {
  precedente: string | null;
  suivante: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const cible = e.target as HTMLElement | null;
      if (cible && ["INPUT", "TEXTAREA", "SELECT"].includes(cible.tagName)) return;
      if (cible?.isContentEditable) return;
      if (e.key === "ArrowLeft" && precedente) router.push(precedente);
      if (e.key === "ArrowRight" && suivante) router.push(suivante);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [precedente, suivante, router]);

  return null;
}
