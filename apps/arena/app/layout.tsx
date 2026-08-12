import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARENA · Tournois Velito",
  description:
    "Hub de tournois esport amateur. Brackets, scores validés, résultats qui ne se perdent plus. Par Velito, Amiens.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
