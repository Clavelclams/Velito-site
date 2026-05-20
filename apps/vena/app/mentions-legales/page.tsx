/**
 * /mentions-legales — Mentions légales VENA.
 *
 * Obligation légale (LCEN art. 6 + RGPD). Contenu basé sur les statuts
 * officiels VENA : SASU, capital, RNA, domiciliation, hébergement.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales et politique de confidentialité de Velito Expertise Numérique Amiens (VENA).",
};

export default function MentionsLegalesPage() {
  return (
    <article className="bg-vena-cream py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <span className="badge-vena-kaki mb-4">Légal</span>
        <h1 className="font-display text-3xl sm:text-5xl font-black text-vena-kaki mb-8 leading-tight">
          Mentions légales
        </h1>

        <div className="card-vena p-6 sm:p-8 space-y-8 text-vena-text leading-relaxed">
          {/* Éditeur */}
          <section>
            <h2 className="font-display text-xl font-black text-vena-kaki mb-3">
              Éditeur du site
            </h2>
            <p className="text-sm">
              <strong>Velito Expertise Numérique Amiens</strong> (VENA)
              <br />
              SASU au capital social de 500€
              <br />
              Siège social : Amiens, Hauts-de-France, France
              <br />
              <span className="text-vena-text-muted">
                SIRET et numéro RCS : disponibles sur demande
              </span>
            </p>
            <p className="text-sm mt-3">
              <strong>Représentant légal :</strong> Clavel NDEMA MOUSSA, Président
              <br />
              <strong>Email :</strong>{" "}
              <a href="mailto:contact@velito.fr" className="text-vena-kaki underline">
                contact@velito.fr
              </a>
              <br />
              <strong>Téléphone :</strong>{" "}
              <a href="tel:+33744624406" className="text-vena-kaki underline">
                07 44 62 44 06
              </a>
            </p>
          </section>

          {/* Hébergement */}
          <section>
            <h2 className="font-display text-xl font-black text-vena-kaki mb-3">
              Hébergement
            </h2>
            <p className="text-sm">
              Site hébergé par <strong>Vercel Inc.</strong>
              <br />
              340 S Lemon Ave #4133, Walnut, CA 91789, USA
              <br />
              <a
                href="https://vercel.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-vena-kaki underline"
              >
                vercel.com
              </a>
            </p>
            <p className="text-sm mt-2">
              Base de données : <strong>Supabase</strong> (région Europe).
            </p>
          </section>

          {/* Propriété intellectuelle */}
          <section>
            <h2 className="font-display text-xl font-black text-vena-kaki mb-3">
              Propriété intellectuelle
            </h2>
            <p className="text-sm">
              L&apos;ensemble du contenu de ce site (textes, images, logo VENA,
              graphismes, code source) est la propriété exclusive de Velito
              Expertise Numérique Amiens, sauf mention contraire. Toute
              reproduction, même partielle, est interdite sans accord écrit
              préalable.
            </p>
          </section>

          {/* RGPD */}
          <section>
            <h2 className="font-display text-xl font-black text-vena-kaki mb-3">
              Données personnelles (RGPD)
            </h2>
            <p className="text-sm">
              VENA collecte des données personnelles uniquement via le
              formulaire de contact (prénom, nom, email, téléphone, structure,
              fonction, message). Ces données sont utilisées exclusivement pour
              traiter ta demande commerciale et te répondre.
            </p>
            <p className="text-sm mt-3">
              <strong>Durée de conservation :</strong> 3 ans à compter du
              dernier contact.
              <br />
              <strong>Destinataires :</strong> Clavel NDEMA MOUSSA et toute
              personne mandatée par VENA pour traiter ta demande.
              <br />
              <strong>Pas de transfert hors UE.</strong> Pas de revente.
            </p>
            <p className="text-sm mt-3">
              Conformément au Règlement Général sur la Protection des Données
              (RGPD), tu disposes d&apos;un droit d&apos;accès, de rectification,
              d&apos;opposition, d&apos;effacement, de portabilité et de
              limitation. Pour exercer ces droits : écris à{" "}
              <a href="mailto:contact@velito.fr" className="text-vena-kaki underline">
                contact@velito.fr
              </a>
              .
            </p>
            <p className="text-sm mt-3">
              En cas de litige non résolu, tu peux saisir la{" "}
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-vena-kaki underline"
              >
                CNIL
              </a>
              .
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="font-display text-xl font-black text-vena-kaki mb-3">
              Cookies
            </h2>
            <p className="text-sm">
              Ce site n&apos;utilise pas de cookies de traçage publicitaire ou
              de mesure d&apos;audience par défaut. Seuls les cookies techniques
              nécessaires au bon fonctionnement (session) peuvent être déposés.
            </p>
          </section>

          {/* Crédits */}
          <section>
            <h2 className="font-display text-xl font-black text-vena-kaki mb-3">
              Crédits
            </h2>
            <p className="text-sm">
              Conception, design et développement : VENA.
              <br />
              Stack technique : Next.js 16, React 19, Tailwind CSS, Supabase, Vercel.
            </p>
          </section>
        </div>

        <p className="text-[10px] text-vena-text-dim italic mt-6 text-center">
          Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
    </article>
  );
}
