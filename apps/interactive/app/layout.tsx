import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

// Sora = police "display" (titres, gros affichage TV). Inter = texte courant.
// Exposées en variables CSS pour Tailwind (font-display / font-sans).
const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Velito Interactive — Jeux interactifs pour bars & lieux d'animation",
  description:
    "Transformez votre écran en arcade : vos clients jouent depuis leur téléphone. Quiz, blind test, géo. Zéro installation.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${sora.variable} ${inter.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
