import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Association — Histoire, valeurs, bureau, impact 3 686h",
  description:
    "VEA association loi 1901 d'Amiens, RNA W802018363. Bureau, 4 piliers (tournois, insertion, prevention, fracture numerique), 300+ jeunes accompagnes, 4 QPV couverts (Etouvie, Amiens Nord, Saint-Just, Pierre Rollin).",
  keywords: [
    "association esport amiens loi 1901",
    "association inclusion numerique",
    "VEA bureau president",
    "asso QPV amiens",
    "RNA W802018363",
  ],
  openGraph: {
    title: "L'asso VEA — Velito Esport Amiens",
    description:
      "Asso d'inclusion par le gaming a Amiens. Histoire, valeurs, bureau, impact mesure.",
  },
  alternates: { canonical: "https://vea.velito.fr/association" },
};

export default function AssociationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
