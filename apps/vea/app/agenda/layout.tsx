import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agenda — TIQE, INTERCUP, animations Amiens",
  description:
    "Tous les evenements VEA : tournois TIQE inter-quartiers, animations centres sociaux QPV, ateliers reconditionnement PC, Happy Eid (Jeunesse en Or), competitions FFJV. 30+ activites documentees depuis 2022.",
  keywords: [
    "agenda esport amiens",
    "tournoi gaming amiens",
    "TIQE Etouvie",
    "happy eid amiens",
    "animation centre social",
    "atelier jeux video amiens",
  ],
  openGraph: {
    title: "Agenda VEA — Tournois & animations a Amiens",
    description:
      "30+ activites depuis 2022. Tournois, ateliers, animations QPV.",
  },
  alternates: { canonical: "https://vea.velito.com/agenda" },
};

export default function AgendaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
