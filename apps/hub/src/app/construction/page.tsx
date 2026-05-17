/**
 * Page /construction — affichée pour tous les modules pas encore prêts.
 *
 * Page accédée typiquement via /construction?slug=arena (ou autre module).
 * ConstructionView lit le slug côté client via useSearchParams et adapte
 * son affichage (nom du module, couleur accent, image) en conséquence.
 *
 * Ce fichier reste un Server Component minimaliste (meilleur SEO + cache).
 * Toute la logique interactive est dans ConstructionView (Client).
 */

import { Suspense } from "react";
import ConstructionView from "./ConstructionView";

export const metadata = {
  title: "En construction — Velito",
  description: "Cette section de l'écosystème Velito est en cours de développement.",
};

export default function ConstructionPage() {
  // Suspense est requis dès qu'on utilise useSearchParams côté client.
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#04040e" }} />}>
      <ConstructionView />
    </Suspense>
  );
}
