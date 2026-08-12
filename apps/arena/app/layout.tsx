import type { Metadata } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

/**
 * Typographie ARENA.
 *
 * `next/font` télécharge les fichiers AU BUILD et les sert depuis notre propre
 * domaine : aucun appel à Google au chargement de la page (rien à déclarer côté
 * RGPD), et surtout un `size-adjust` calculé automatiquement, qui supprime le
 * saut de mise en page au moment où la police arrive.
 *
 * Space Grotesk pour les titres : ses chiffres et ses formes un peu techniques
 * collent à un tableau de scores, et elle ne ressemble pas aux polices par
 * défaut qu'on retrouve sur la moitié du web.
 * Plus Jakarta Sans pour le texte : très lisible en petite taille, formes
 * ouvertes, ce qui compte pour une audience qui lit surtout sur téléphone.
 */
const policeTitre = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--police-titre",
  display: "swap",
});

const policeCorps = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--police-corps",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ARENA · Tournois Velito",
  description:
    "Hub de tournois esport amateur. Brackets, scores validés, résultats qui ne se perdent plus. Par Velito, Amiens.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${policeTitre.variable} ${policeCorps.variable}`}
    >
      {/* 100dvh et non 100vh : sur mobile, 100vh compte la barre
          d'URL du navigateur et provoque un débordement de quelques pixels. */}
      <body className="min-h-[100dvh]">{children}</body>
    </html>
  );
}
