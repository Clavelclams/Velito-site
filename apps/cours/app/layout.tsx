import type { Metadata } from "next";
import "./globals.css";
import EnTete from "@/app/components/EnTete";

/** Espace personnel : pas d'indexation (la vraie protection = middleware). */
export const metadata: Metadata = {
  title: "Velito Cours — Révision CDA",
  description: "Espace de révision personnel — jury avril 2027",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-cours-bg text-cours-text antialiased">
        {/* Header commun (masqué sur /login — voir EnTete.tsx). */}
        <EnTete />
        {children}
      </body>
    </html>
  );
}
