/**
 * /lien — page "carte de liens" Velito (type linktree).
 *
 * C'est la page à mettre en bio sur les réseaux : elle pointe vers VEA,
 * VENA, le Hub et les comptes pro. Page autonome (Navbar/Footer VENA
 * masqués — cf. Navbar.tsx / Footer.tsx qui se cachent sur /lien).
 *
 * Server Component pour les metadata SEO ; le rendu interactif est dans
 * LienClient (FlowingMenu + carte badge).
 */
import type { Metadata } from "next";
import LienClient from "./LienClient";

export const metadata: Metadata = {
  title: "Liens",
  description:
    "Tous les liens Velito : VEA (esport associatif), VENA (agence numérique), le Hub et les réseaux.",
  alternates: { canonical: "https://velito.fr/lien" },
};

export default function LienPage() {
  return <LienClient />;
}
