import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Esport & inclusion — Tournois, Budget Participatif Amiens, prevention",
  description:
    "VEA, club esport amateur d'Amiens. 12 jeunes a l'INTERCUP 2026, Pinh 3e France SF6 FFJV 2024, TIQE inter-quartier, projet Fontaine Salamandre Budget Participatif 9 900 €. Competition + social.",
  keywords: [
    "tournoi esport amiens",
    "INTERCUP 2026 amiens",
    "TIQE Etouvie",
    "Pinh SF6 France",
    "FFJV club amateur",
    "budget participatif amiens fontaine salamandre",
    "esport quartier prioritaire",
    "competition esport hauts-de-france",
  ],
  openGraph: {
    title: "Esport & inclusion — VEA Amiens",
    description:
      "Competition (INTERCUP, FFJV, TIQE) + Social (Budget Participatif, prevention, QPV). 12 jeunes amienois au TOP 8 France.",
  },
  alternates: { canonical: "https://vea.velito.com/esport" },
};

export default function EsportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
