/**
 * Footer — Pied de page VEA — REFONTE VIOLET + ROUGE
 * Fond très sombre. 3 colonnes : à propos + navigation + contact.
 * Titres en rouge VEA. Liens réseaux en badges.
 */
import Link from "next/link";

const FOOTER_LINKS = [
  { label: "Accueil", href: "/" },
  { label: "Association", href: "/association" },
  { label: "Esport", href: "/esport" },
  { label: "Agenda", href: "/agenda" },
  { label: "Médias", href: "/medias" },
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
    <footer className="w-full bg-[#080410] mt-auto">
      <div className="section-separator" />
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* ===== COLONNE 1 : À PROPOS + RÉSEAUX ===== */}
          <div>
            <h3 className="text-vea-red uppercase tracking-widest text-xs font-bold mb-3">VEA</h3>
            <p className="text-sm text-vea-text-muted leading-relaxed mb-5">
              Velito Esport Amiens — Association d&apos;inclusion par
              l&apos;esport. Le jeu vidéo comme moteur de lien social,
              d&apos;insertion et de talents locaux.
            </p>
            {/* Liens réseaux sociaux (texte) */}
            <div className="flex flex-wrap items-center gap-3">
              {SOCIALS.map(({ name, href }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-vea-card border border-vea-border/30 text-xs text-vea-text-muted hover:text-vea-red hover:border-vea-red/40 transition-colors"
                >
                  {name}
                </a>
              ))}
            </div>
          </div>

          {/* ===== COLONNE 2 : NAVIGATION ===== */}
          <div>
            <h3 className="text-vea-red uppercase tracking-widest text-xs font-bold mb-4">
              Navigation
            </h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-vea-text-muted hover:text-vea-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ===== COLONNE 3 : CONTACT ===== */}
          <div>
            <h3 className="text-vea-red uppercase tracking-widest text-xs font-bold mb-4">
              Contact
            </h3>
            <ul className="space-y-3 text-sm text-vea-text-muted">
              <li>
                <a href="tel:+33670364414" className="hover:text-vea-white transition-colors">
                  06 70 36 44 14
                </a>
              </li>
              <li>
                <a href="mailto:Vea@velitoesport.com" className="hover:text-vea-white transition-colors">
                  Vea@velitoesport.com
                </a>
              </li>
              <li>
                <a
                  href="https://velito.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-vea-white transition-colors"
                >
                  velito.com
                </a>
              </li>
              <li>
                <a
                  href="https://vea.velito.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-vea-white transition-colors text-xs"
                >
                  vea.velito.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* ===== COPYRIGHT ===== */}
        <div className="mt-12 pt-6 border-t border-vea-border/15 text-center">
          <p className="text-xs text-vea-text-dim">
            &copy; 2026 Velito Esport Amiens — Association loi 1901 — Propulsé par VENA
          </p>
        </div>
      </div>
    </footer>
  );
}
