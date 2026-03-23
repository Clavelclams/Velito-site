/**
 * Layout Hub Velito
 *
 * 👉 Layout minimal pour la page vitrine velito.com.
 * Pas de Navbar complexe ici — c'est juste un hub vers les autres apps.
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Velito — L'écosystème numérique amiénois",
  description:
    "Velito regroupe esport, agence numérique, jeux interactifs et tournois sous un même toit. Basé à Amiens.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
