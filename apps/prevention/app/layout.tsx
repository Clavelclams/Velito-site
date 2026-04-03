import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Velito Prévention Numérique",
  description:
    "Infrastructure institutionnelle de prévention numérique pour la pratique compétitive encadrée.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
