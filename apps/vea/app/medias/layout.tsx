import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Medias — Galerie photos & presse VEA Amiens",
  description:
    "Galerie photos des evenements VEA + revue de presse (Courrier Picard, Gazette Sports, France Bleu Picardie). E-Night World Cup, TIQE, Parc Saint-Pierre, Happy Eid, INTERCUP.",
  keywords: [
    "photos esport amiens",
    "VEA medias",
    "courrier picard velito esport",
    "gazette sports amiens",
    "france bleu picardie esport",
  ],
  openGraph: {
    title: "Medias VEA — Photos & presse",
    description:
      "Galerie + articles presse. Couverture mediatique de l'asso depuis 2022.",
  },
  alternates: { canonical: "https://vea.velito.com/medias" },
};

export default function MediasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
