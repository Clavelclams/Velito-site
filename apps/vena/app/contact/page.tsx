/**
 * /contact — Page de contact / demande de devis VENA.
 *
 * Serveur Component pour SEO + metadata, rend ContactForm en Client Component.
 */
import type { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact / Devis",
  description:
    "Décris ton projet à VENA. Site web, vidéo, formation, location matériel : reçois une proposition adaptée sous 72h.",
};

export default function ContactPage() {
  return (
    <div className="bg-vena-cream py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-vena-text-dim mb-6">
            Contact
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-black text-vena-kaki mb-4 leading-[0.95]">
            Dis-nous{" "}
            <span className="bg-vena-tilleul px-2 inline-block -my-1">
              ce que tu veux
            </span>{" "}
            faire.
          </h1>
          <p className="text-base sm:text-lg text-vena-text leading-relaxed max-w-xl">
            Pas besoin d&apos;un cahier des charges parfait. Trois lignes sur
            ton projet suffisent pour qu&apos;on parte sur de bonnes bases. On
            répond sous 72h, en vrai, pas avec un mail automatique.
          </p>
        </div>

        <ContactForm />

        {/* Bloc coordonnées directes */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="card-vena p-5">
            <p className="text-[10px] uppercase tracking-widest text-vena-text-dim mb-1">
              Email
            </p>
            <a
              href="mailto:contact@velito.fr"
              className="text-sm font-bold text-vena-kaki hover:underline break-all"
            >
              contact@velito.fr
            </a>
          </div>
          <div className="card-vena p-5">
            <p className="text-[10px] uppercase tracking-widest text-vena-text-dim mb-1">
              Téléphone
            </p>
            <a
              href="tel:+33744624406"
              className="text-sm font-bold text-vena-kaki hover:underline"
            >
              07 44 62 44 06
            </a>
          </div>
          <div className="card-vena p-5">
            <p className="text-[10px] uppercase tracking-widest text-vena-text-dim mb-1">
              Localisation
            </p>
            <p className="text-sm font-bold text-vena-kaki">
              Amiens · Hauts-de-France
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
