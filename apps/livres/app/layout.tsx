/**
 * Layout racine — Boîtes à livres d'Amiens (livres.velito.fr, 13/11/2026).
 *
 * Choix (cahier des charges du 30/05/2026) : pas de police externe (aucune
 * requête vers un service tiers, chargement immédiat), pas de cookie de
 * mesure d'audience, pas de traceur. Le site doit rester sobre et rapide sur
 * un vieux téléphone en 4G.
 */
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

const SITE_URL = "https://livres.velito.fr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Boîtes à livres d'Amiens", template: "%s · Boîtes à livres d'Amiens" },
  description:
    "Trouve la boîte à livres la plus proche à Amiens, vois si elle est pleine, dépose ou prends un livre, signale une boîte vide ou abîmée. Gratuit, sans compte, sans publicité.",
  openGraph: { siteName: "Boîtes à livres d'Amiens", locale: "fr_FR", type: "website" },
};

export const viewport: Viewport = { themeColor: "#1F6B4A" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-[100dvh] flex flex-col">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-livre-carte focus:px-3 focus:py-2">
          Aller au contenu
        </a>
        <header className="border-b border-livre-trait bg-livre-carte">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3" aria-label="Navigation principale">
            <Link href="/" className="font-bold text-livre-vert">
              Boîtes à livres <span className="text-livre-doux font-normal">d&apos;Amiens</span>
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/" className="hover:underline">Carte</Link>
              <Link href="/a-propos" className="hover:underline">À propos</Link>
            </div>
          </nav>
        </header>
        <main id="contenu" className="flex-1">{children}</main>
        <footer className="border-t border-livre-trait bg-livre-carte text-sm text-livre-doux">
          <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-2 px-4 py-4">
            <p>
              Site conçu en bénévolat par{" "}
              <a href="https://velito.fr" className="underline">VENA</a>, avec{" "}
              <a href="https://vea.velito.fr" className="underline">Velito Esport Amiens</a>. Code ouvert.
            </p>
            <p className="flex gap-3">
              <Link href="/mentions-legales" className="underline">Mentions légales</Link>
              <Link href="/admin" className="underline">Bénévoles</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
