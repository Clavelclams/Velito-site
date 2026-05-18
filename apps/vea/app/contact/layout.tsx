import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Velito Esport Amiens",
  description:
    "Contactez Velito Esport Amiens (VEA). Telephone 06 70 36 44 14, email Vea@velitoesport.com, Etouvie (Amiens secteur Ouest). Association loi 1901, RNA W802018363.",
  keywords: ["contact velito esport amiens", "VEA email telephone"],
  openGraph: {
    title: "Contacter VEA",
    description:
      "Telephone, email, reseaux sociaux. On revient vers vous sous 48h.",
  },
  alternates: { canonical: "https://vea.velito.com/contact" },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
