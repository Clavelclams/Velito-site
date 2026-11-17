/**
 * /t/{token}/ecran — l'écran du défi au score, à afficher en plein écran
 * sur un second écran, lisible à 4 mètres (17/11/2026).
 * Non listé, noindex. Aucune action possible sur cette page.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { chargerDefiParToken } from "@/lib/arena/defi-donnees";
import { construireEtatEcran } from "@/lib/arena/defi-ecran";
import Ecran from "./Ecran";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Écran",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PageEcran({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const complet = await chargerDefiParToken(token);
  if (!complet) notFound();
  return <Ecran token={token} initial={construireEtatEcran(complet, Date.now())} />;
}
