import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Velito — L'écosystème numérique amiénois",
  description:
    "Velito regroupe esport, agence numérique, jeux interactifs et tournois. Basé à Amiens.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
