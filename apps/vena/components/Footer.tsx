/**
 * Footer VENA — coordonnées, mention légale, liens vers Hub + VEA.
 *
 * Reste sobre, sans surcharge visuelle. Logo VENA + slogan + 3 colonnes.
 * "use client" uniquement pour pouvoir se masquer sur la page /lien
 * (linktree autonome).
 */
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// En prod, URLs forcées en dur (insensibles à une var Vercel restée en localhost).
// Les vars d'env ne sont lues qu'en dev local.
const HUB_URL =
  process.env.NODE_ENV === "production"
    ? "https://hub.velito.fr"
    : process.env.NEXT_PUBLIC_HUB_URL ?? "https://hub.velito.fr";
const VEA_URL =
  process.env.NODE_ENV === "production"
    ? "https://vea.velito.fr"
    : process.env.NEXT_PUBLIC_VEA_URL ?? "https://vea.velito.fr";

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/lien")) return null;

  return (
    <footer className="bg-vena-kaki text-vena-cream mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <Image
                src="/images/vena-symbole-blanc.svg"
                alt="VENA"
                width={40}
                height={40}
                className="w-10 h-10"
              />
              <div>
                <p className="font-display font-black text-lg leading-tight">
                  VENA
                </p>
                <p className="text-[10px] uppercase tracking-widest opacity-80">
                  Velito Expertise Numérique Amiens
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed opacity-90 max-w-md">
              Agence numérique amiénoise. Sites web, production vidéo, location
              de matériel, formation. Une expertise locale pour les structures
              et entreprises des Hauts-de-France.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3 opacity-90">
              Navigation
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="opacity-80 hover:opacity-100 hover:underline">
                  Accueil
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="opacity-80 hover:opacity-100 hover:underline"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/mentions-legales"
                  className="opacity-80 hover:opacity-100 hover:underline"
                >
                  Mentions légales
                </Link>
              </li>
            </ul>
          </div>

          {/* Écosystème Velito */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3 opacity-90">
              Écosystème Velito
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={HUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-80 hover:opacity-100 hover:underline"
                >
                  Hub Velito
                </a>
              </li>
              <li>
                <a
                  href={VEA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-80 hover:opacity-100 hover:underline"
                >
                  Velito Esport Amiens
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-vena-cream/15 mt-10 pt-6 text-xs opacity-70 flex flex-col sm:flex-row gap-2 sm:gap-4 justify-between">
          <p>
            © {new Date().getFullYear()} Velito Expertise Numérique Amiens —
            SASU au capital de 500€
          </p>
          <p>Amiens · Hauts-de-France · France</p>
        </div>
      </div>
    </footer>
  );
}
