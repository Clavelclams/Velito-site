import type { Metadata } from "next";
import "./globals.css";

/**
 * Layout racine — enveloppe TOUTES les pages de l'app.
 *
 * robots: noindex → outil de gestion interne, on ne veut PAS que
 * Google indexe compta.velito.fr. Première ligne de défense
 * (la vraie protection sera l'authentification, pas ce meta tag).
 */
export const metadata: Metadata = {
  title: "Velito Compta",
  description: "Pré-comptabilité VEA & VENA — outil interne",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-compta-bg text-compta-text antialiased">
        {children}
      </body>
    </html>
  );
}
