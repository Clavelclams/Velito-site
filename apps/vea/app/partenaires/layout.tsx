import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partenaires — France Esports, FFJV, MABB, Jeunesse en Or",
  description:
    "Reseau partenaires VEA : France Esports & FFJV (federations), MABB (membre fondateur), Jeunesse en Or, Pedagojeux, Amiens Metropole, centres sociaux QPV, WarpZone, GameCash. 13+ partenaires actifs.",
  keywords: [
    "partenaires esport amiens",
    "MABB basket amiens partenaire",
    "Jeunesse en Or amiens",
    "FFJV club affilie",
    "France Esports club amiens",
    "Pedagojeux partenaire",
  ],
  openGraph: {
    title: "Partenaires VEA",
    description:
      "Federations, asso, collectivites, medias — tous les partenaires de Velito Esport Amiens.",
  },
  alternates: { canonical: "https://vea.velito.fr/partenaires" },
};

export default function PartenairesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
