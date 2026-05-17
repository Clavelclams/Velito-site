/**
 * Layout racine du hub Velito.
 *
 * Reste un Server Component pour bénéficier du rendu statique des metadata.
 * NavBar et Chatbot sont des Client Components importés ici — Next.js gère
 * automatiquement la séparation Server/Client. Ils apparaissent sur TOUTES
 * les pages du hub (home, /construction, etc.).
 *
 * Polices :
 *  - Orbitron : titres principaux (galaxie, page d'accueil)
 *  - Exo 2 : corps de texte du hub
 *  - JetBrains Mono : éléments DA "terminal/cyber" sur /construction (titre, lignes monospace)
 */

import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/chrome/NavBar";
import Chatbot from "@/components/chrome/Chatbot";

export const metadata: Metadata = {
  title: "VELITO — Ton univers numérique",
  description:
    "Velito regroupe esport, agence numérique, jeux interactifs et tournois. Basé à Amiens.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;600&family=JetBrains+Mono:wght@400;600;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-exo min-h-screen">
        <NavBar />
        {children}
        <Chatbot />
      </body>
    </html>
  );
}
