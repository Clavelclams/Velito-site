/**
 * Layout principal VEA
 *
 * 👉 Ce que fait ce fichier :
 * C'est le "squelette" de toutes les pages VEA.
 * Next.js App Router wrappe automatiquement chaque page avec ce layout.
 * Structure : TopBar → Navbar → Contenu de la page → Footer
 *
 * 👉 Pourquoi "min-h-screen flex flex-col" sur body ?
 * Ça force le body à prendre au minimum toute la hauteur de l'écran.
 * flex-col + mt-auto sur le Footer = le footer colle toujours en bas,
 * même si le contenu de la page est court.
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopBar from "../components/TopBar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// 👉 Fonts Geist : Next.js les télécharge et les optimise automatiquement
// variable: crée une CSS variable qu'on peut utiliser dans Tailwind
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 👉 Metadata : ce que Google et les réseaux sociaux voient
// title = onglet du navigateur, description = snippet Google
export const metadata: Metadata = {
  title: "VEA — Velito Esport Amiens",
  description:
    "Association d'inclusion par l'esport à Amiens. Le jeu vidéo comme moteur de lien social, d'insertion et de talents locaux.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      {/* 👉 min-h-screen = hauteur minimum = tout l'écran */}
      {/* 👉 flex flex-col = les enfants s'empilent verticalement */}
      {/* 👉 antialiased = lissage du texte pour un rendu plus propre */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col antialiased`}
      >
        <TopBar />
        <Navbar />
        {/* 👉 flex-1 = le contenu principal prend tout l'espace restant */}
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
