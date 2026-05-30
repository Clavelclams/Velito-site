import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import HashRecoveryRedirect from "../components/HashRecoveryRedirect";
import ChatBot from "../components/ChatBot";

// Note : on n'utilise plus next/script (depuis Next.js 16, <Script strategy="beforeInteractive">
// ne peut plus etre place dans <body>. Pour le JSON-LD on bascule sur un <script> standard
// rendu par le Server Component, ce qui est leger et n'embarque pas de JS executable.

// Corps de texte : Inter (lisible, neutre), exposé en variable CSS.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Titres : Space Grotesk — police d'affichage à caractère (anti "template IA"),
// moderne et crédible pour un public institutionnel sans perdre l'énergie esport.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL = "https://vea.velito.fr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "VEA — Velito Esport Amiens · Association esport & inclusion sociale",
    template: "%s · VEA Velito Esport Amiens",
  },
  description:
    "Velito Esport Amiens (VEA) — association loi 1901 d'inclusion par le gaming a Amiens. Tournois esport, animations dans les quartiers prioritaires, prevention numerique, budget participatif. Depuis 2022.",
  applicationName: "VEA — Velito Esport Amiens",
  authors: [{ name: "Velito Esport Amiens" }],
  generator: "Next.js",
  keywords: [
    "esport amiens",
    "velito esport",
    "VEA",
    "association esport amiens",
    "inclusion numerique amiens",
    "gaming quartier amiens",
    "tournoi esport amiens",
    "TIQE",
    "INTERCUP",
    "budget participatif amiens",
    "fontaine salamandre",
    "happy eid amiens",
    "jeunesse en or",
    "MABB",
    "quartier prioritaire amiens",
    "QPV",
    "etouvie",
    "saint-just",
    "amiens nord",
    "FFJV",
    "France Esports",
    "prevention numerique",
    "atelier reconditionnement PC",
  ],
  creator: "Clavel NDEMA MOUSSA",
  publisher: "Velito Esport Amiens",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "VEA — Velito Esport Amiens",
    title:
      "VEA — Velito Esport Amiens · Association esport & inclusion sociale",
    description:
      "Association loi 1901 d'inclusion par le gaming a Amiens. Tournois esport, animations QPV, prevention numerique, projets citoyens.",
    images: [
      {
        url: "/images/vea-logo-rouge-fond-blanc.png",
        width: 800,
        height: 800,
        alt: "Logo VEA — Velito Esport Amiens",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "VEA — Velito Esport Amiens · Association esport & inclusion sociale",
    description:
      "Association loi 1901 d'inclusion par le gaming a Amiens depuis 2022.",
    images: ["/images/vea-logo-rouge-fond-blanc.png"],
    creator: "@velitoesport",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

// JSON-LD : decrit officiellement VEA a Google. Permet d'apparaitre dans
// les Knowledge Graph + rich snippets.
const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": ["Organization", "NGO", "LocalBusiness"],
  "@id": `${SITE_URL}/#organization`,
  name: "Velito Esport Amiens",
  alternateName: ["VEA", "Velito Esport"],
  description:
    "Association loi 1901 d'inclusion par le gaming a Amiens. Tournois esport, animations dans les quartiers prioritaires (QPV), prevention numerique, projets citoyens.",
  url: SITE_URL,
  logo: `${SITE_URL}/images/vea-logo-rouge-fond-blanc.png`,
  email: "contact@velito.fr",
  telephone: "+33670364414",
  foundingDate: "2022",
  identifier: {
    "@type": "PropertyValue",
    propertyID: "RNA",
    value: "W802018363",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Amiens",
    addressRegion: "Hauts-de-France",
    postalCode: "80",
    addressCountry: "FR",
    streetAddress: "Etouvie (secteur Ouest)",
  },
  areaServed: {
    "@type": "City",
    name: "Amiens",
  },
  founder: {
    "@type": "Person",
    name: "Clavel NDEMA MOUSSA",
    jobTitle: "President",
  },
  sameAs: [
    "https://instagram.com/velitoesport",
    "https://facebook.com/velitoesport",
    "https://x.com/velitoesport",
    "https://tiktok.com/@velitoesport",
    "https://www.linkedin.com/in/velito-esport-amiens/",
  ],
  knowsAbout: [
    "Esport",
    "Gaming",
    "Inclusion numerique",
    "Prevention numerique",
    "Budget participatif",
    "Quartiers prioritaires",
    "Animation jeunesse",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      {/* 20/05/2026 : suppressHydrationWarning sur <body> pour silence le
          Recoverable Error de Next.js 16.2 + Turbopack sur le <MetadataWrapper>
          interne (hidden={true} client vs hidden={null} server). C'est un bug
          connu Next.js (badge "stale" dans devtools), non-bloquant. Cette flag
          ignore les mismatchs DIRECTS sur body et ses descendants immediats —
          elle ne masque PAS les vrais mismatchs dans le contenu de la page. */}
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans min-h-screen flex flex-col`}
      >
        {/* JSON-LD Organization pour SEO Google (Knowledge Graph).
            Recommandation officielle Next.js 16 : script JSON-LD inline dans le
            body d'un Server Component (https://nextjs.org/docs/app/guides/json-ld).
            type="application/ld+json" = pas executable, juste lu par les crawlers. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ORGANIZATION_LD),
          }}
        />
        <HashRecoveryRedirect />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        {/* ChatBot FAQ flottant en bas à droite, présent sur toutes les pages.
            Voir components/ChatBot.tsx pour les 9 questions/réponses. */}
        <ChatBot />
      </body>
    </html>
  );
}
