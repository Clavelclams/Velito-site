/**
 * Footer — Pied de page VEA (refonte 16/05/2026 — fond clair).
 *
 * Avant : fond #080410 presque noir + titres rouges.
 * Apres : fond surface-soft (#F4F4F1), 3 colonnes + zone "partenaires"
 * en marquee infini facon mabb.fr — preuve sociale dynamique.
 *
 * Pas d'adresse postale du siege (consigne du 16/05) — juste "Etouvie,
 * Amiens (secteur ouest)" en localisation visible + RNA pour les pros.
 */
import Link from "next/link";
import PartnersMarquee from "./PartnersMarquee";

const FOOTER_LINKS = [
  { label: "Accueil", href: "/" },
  { label: "Association", href: "/association" },
  { label: "Esport", href: "/esport" },
  { label: "Agenda", href: "/agenda" },
  { label: "Medias", href: "/medias" },
  { label: "Partenaires", href: "/partenaires" },
  { label: "Contact", href: "/contact" },
  { label: "Inscription", href: "/inscription" },
];

const SOCIALS = [
  { name: "Instagram", href: "https://instagram.com/velitoesport" },
  { name: "Facebook", href: "https://facebook.com/velitoesport" },
  { name: "X / Twitter", href: "https://x.com/velitoesport" },
  { name: "TikTok", href: "https://tiktok.com/@velitoesport" },
  { name: "LinkedIn", href: "https://linkedin.com/company/velitoesport" },
];

export default function Footer() {
  return (
    <footer className="w-full bg-vea-surface-soft mt-auto border-t border-vea-border">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-14">

        {/* ===== MARQUEE PARTENAIRES (façon mabb.fr) ===== */}
        <div className="mb-12 pb-12 border-b border-vea-border">
          <h3 className="text-vea-accent uppercase tracking-widest text-xs font-bold mb-8 text-center">
            Avec le soutien de
          </h3>
          <PartnersMarquee />
        </div>

        {/* ===== 3 COLONNES PRINCIPALES ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <h3 className="text-vea-accent uppercase tracking-widest text-xs font-bold mb-3">
              VEA
            </h3>
            <p className="text-sm text-vea-text-muted leading-relaxed mb-5">
              Velito Esport Amiens — Association d&apos;inclusion par
              l&apos;esport. Le jeu video comme moteur de lien social,
              d&apos;insertion et de talents locaux.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {SOCIALS.map(({ name, href }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-md bg-white border border-vea-border text-xs text-vea-text-muted hover:text-vea-accent hover:border-vea-accent/40 transition-colors"
                >
                  {name}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-vea-accent uppercase tracking-widest text-xs font-bold mb-4">
              Navigation
            </h3>
            <ul className="grid grid-cols-2 gap-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-vea-text-muted hover:text-vea-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-vea-accent uppercase tracking-widest text-xs font-bold mb-4">
              Contact
            </h3>
            <ul className="space-y-2 text-sm text-vea-text-muted">
              <li>
                <a href="tel:+33670364414" className="hover:text-vea-accent transition-colors">
                  06 70 36 44 14
                </a>
              </li>
              <li>
                <a href="mailto:Vea@velitoesport.com" className="hover:text-vea-accent transition-colors">
                  Vea@velitoesport.com
                </a>
              </li>
              <li className="text-vea-text-dim">
                Etouvie, Amiens (secteur ouest)
              </li>
              <li className="text-vea-text-dim text-xs pt-2 border-t border-vea-border mt-3">
                Association loi 1901 — RNA <span className="font-mono">W802018363</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-vea-border text-center">
          <p className="text-xs text-vea-text-dim">
            &copy; 2026 Velito Esport Amiens — Association loi 1901 — Propulse par{" "}
            <a
              href="https://vena.velito.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-vea-accent transition-colors"
            >
              VENA
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
