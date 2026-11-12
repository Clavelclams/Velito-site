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
    default: "VENA · Velito Expertise Numérique Amiens · Agence digitale",
    template: "%s · VENA",
  },
  description:
    "Agence numérique basée à Amiens. Développement web, production vidéo, location de matériel, formation. Une expertise locale pour les structures et entreprises des Hauts-de-France.",
  applicationName: "VENA · Velito Expertise Numérique Amiens",
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
    title: "VENA · Velito Expertise Numérique Amiens",
    description:
      "Agence numérique amiénoise. Sites web, vidéo, location matériel, formation.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VENA · Velito Expertise Numérique Amiens",
    description: "Agence numérique amiénoise.",
  },
  // [11/11/2026] Canonical retiré du layout : hérité par toutes les pages, il
  // disait à Google que /contact ou /realisations étaient des copies de
  // l'accueil, et ces pages n'étaient donc pas indexées. Chaque page déclare
  // maintenant le sien.
};

// [11/11/2026] Données structurées schema.org : c'est ce que Google (fiche,
// aperçus IA) et les assistants lisent pour comprendre qui est VENA, où elle
// est, et ce qu'elle a construit. Uniquement des infos déjà publiques sur le
// site.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#vena`,
      name: "VENA · Velito Expertise Numérique Amiens",
      alternateName: ["VENA", "Velito"],
      url: SITE_URL,
      logo: `${SITE_URL}/images/vena-logo-kaki.svg`,
      description:
        "Agence numérique à Amiens : développement web et mobile, production vidéo, location de matériel, formation. Éditrice de Venaball, l'application de basket pour les clubs et les joueuses.",
      areaServed: ["Amiens", "Hauts-de-France", "France"],
      founder: { "@type": "Person", name: "Clavel NDEMA MOUSSA" },
      sameAs: [
        "https://www.instagram.com/vena.amiensnumerique/",
        "https://www.linkedin.com/in/ndema-moussa/",
        "https://vea.velito.fr",
        "https://venaball.fr",
      ],
    },
    {
      "@type": "SoftwareApplication",
      name: "Venaball",
      url: "https://venaball.fr",
      applicationCategory: "SportsApplication",
      operatingSystem: "iOS, Android",
      description:
        "Application de basket : app joueuse (entraînement, progression, défis) et app staff pour les clubs (effectif, convocations, matchs, stats en direct).",
      publisher: { "@id": `${SITE_URL}/#vena` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen flex flex-col">
        <script
          type="application/ld+json"
          // Contenu fixe écrit dans ce fichier, aucune donnée utilisateur.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <ChatBot />
      </body>
    </html>
  );
}
