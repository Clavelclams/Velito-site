import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import HashRecoveryRedirect from "../components/HashRecoveryRedirect";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = "https://vea.velito.com";

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
  email: "Vea@velitoesport.com",
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
    "https://linkedin.com/company/velitoesport",
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
    <html lang="fr">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        {/* JSON-LD Organization — injected dans <head> via Script strategy beforeInteractive */}
        <Script
          id="schema-organization"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ORGANIZATION_LD),
          }}
        />
        <HashRecoveryRedirect />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
