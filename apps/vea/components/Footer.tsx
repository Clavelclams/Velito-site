/**
 * Footer — Pied de page VEA
 *
 * 👉 Ce que fait ce composant :
 * Affiche le footer en bas de chaque page avec 3 colonnes :
 * - Infos VEA + description
 * - Liens rapides vers les pages principales
 * - Infos de contact
 * Sur mobile : les colonnes s'empilent verticalement.
 */
import Link from "next/link";

// 👉 Liens rapides du footer — même structure que la Navbar
const FOOTER_LINKS = [
  { label: "Accueil", href: "/" },
  { label: "Association", href: "/association" },
  { label: "Esport", href: "/esport" },
  { label: "Partenaires", href: "/partenaires" },
  { label: "Contact", href: "/contact" },
];

export default function Footer() {
  return (
    <footer className="w-full bg-vea-gray border-t border-vea-gray-light/30 mt-auto">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
        {/* 👉 Grid responsive : 1 col mobile, 3 cols desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* ======= COLONNE 1 : À PROPOS ======= */}
          <div>
            <h3 className="text-vea-red font-bold text-lg mb-3">VEA</h3>
            <p className="text-sm text-vea-white/50 leading-relaxed">
              Velito Esport Amiens — Association d&apos;inclusion
              par l&apos;esport. Le jeu vidéo comme moteur de lien social.
            </p>
          </div>

          {/* ======= COLONNE 2 : LIENS RAPIDES ======= */}
          <div>
            <h3 className="text-vea-white font-semibold text-sm uppercase tracking-wider mb-3">
              Navigation
            </h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-vea-white/50 hover:text-vea-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ======= COLONNE 3 : CONTACT ======= */}
          <div>
            <h3 className="text-vea-white font-semibold text-sm uppercase tracking-wider mb-3">
              Contact
            </h3>
            <ul className="space-y-2 text-sm text-vea-white/50">
              <li>
                <a href="mailto:Vea@velitoesport.com" className="hover:text-vea-white transition-colors">
                  Vea@velitoesport.com
                </a>
              </li>
              <li>
                <a href="tel:+33670364414" className="hover:text-vea-white transition-colors">
                  06 70 36 44 14
                </a>
              </li>
              <li>
                <a
                  href="https://www.velitoesport.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-vea-white transition-colors"
                >
                  www.velitoesport.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* ======= BARRE DE COPYRIGHT ======= */}
        <div className="mt-10 pt-6 border-t border-vea-gray-light/20 text-center">
          <p className="text-xs text-vea-white/30">
            &copy; {new Date().getFullYear()} VEA — Velito Esport Amiens. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
