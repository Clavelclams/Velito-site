import type { Metadata } from "next";
import "./globals.css";

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
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-exo min-h-screen">
        {children}
      </body>
    </html>
  );
}
