/**
 * Layout racine VENA (Velito Expertise Numérique Amiens).
 *
 * Charte : fond crème, identité kaki #414C35, palette pastel pour accents.
 * Toutes les pages héritent de Navbar (haut) + Footer (bas).
 */
import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";

const SITE_URL = "https://velito.fr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VENA — Velito Expertise Numérique Amiens · Agence digitale",
    template: "%s · VENA",
  },
  description:
    "Agence numérique basée à Amiens. Développement web, production vidéo, location de matériel, formation. Une expertise locale pour les structures et entreprises des Hauts-de-France.",
  applicationName: "VENA — Velito Expertise Numérique Amiens",
  authors: [{ name: "Velito Expertise Numérique Amiens" }],
  keywords: [
    "agence numérique amiens",
    "développement web amiens",
    "site web amiens",
    "production vidéo amiens",
    "location matériel audiovisuel amiens",
    "VENA",
    "Velito",
    "freelance web amiens",
    "communication digitale hauts-de-france",
  ],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "VENA",
    title: "VENA — Velito Expertise Numérique Amiens",
    description:
      "Agence numérique amiénoise. Sites web, vidéo, location matériel, formation.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VENA — Velito Expertise Numérique Amiens",
    description: "Agence numérique amiénoise.",
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <ChatBot />
      </body>
    </html>
  );
}
