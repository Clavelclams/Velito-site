import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import EnTete from "@/app/components/EnTete";

/**
 * Police des TITRES uniquement (Space Grotesk : géométrique, du caractère).
 * Les fichiers .woff2 sont DANS le repo (app/polices/) et servis via
 * next/font/local : aucun téléchargement au build ni au runtime — le build
 * passe même sans réseau, et zéro requête vers Google (RGPD ok).
 * Le corps de texte garde la police système.
 */
const policeTitres = localFont({
  src: [
    { path: "./polices/space-grotesk-latin-400-normal.woff2", weight: "400" },
    { path: "./polices/space-grotesk-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-titres",
  display: "swap",
});

/** Espace personnel : pas d'indexation (la vraie protection = middleware). */
export const metadata: Metadata = {
  title: "Velito Cours — Révision CDA",
  description: "Espace de révision personnel — jury avril 2027",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={policeTitres.variable}>
      <body className="min-h-screen bg-cours-bg text-cours-text antialiased">
        {/* Header commun (masqué sur /login — voir EnTete.tsx). */}
        <EnTete />
        {children}
      </body>
    </html>
  );
}
