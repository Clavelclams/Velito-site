/**
 * Navbar VENA — minimaliste, alignée sur la charte (kaki + crème).
 *
 * Lien retour vers velito.fr (le hub) à gauche, navigation interne à droite,
 * CTA contact en bouton kaki.
 */
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "Accueil", href: "/" },
  { label: "Contact", href: "/contact" },
];

// En prod, URL forcée en dur (insensible à une var Vercel restée en localhost).
// La var d'env n'est lue qu'en dev local.
const HUB_URL =
  process.env.NODE_ENV === "production"
    ? "https://hub.velito.fr"
    : process.env.NEXT_PUBLIC_HUB_URL ?? "https://hub.velito.fr";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Page /lien = linktree autonome : pas de chrome VENA.
  if (pathname?.startsWith("/lien")) return null;

  return (
    <header className="sticky top-0 z-40 bg-vena-cream/90 backdrop-blur border-b border-vena-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        {/* Logo + retour Hub */}
        <Link
          href="/"
          className="flex items-center gap-3 group"
          aria-label="Accueil VENA"
        >
          <Image
            src="/images/vena-symbole-kaki.svg"
            alt="VENA"
            width={40}
            height={40}
            className="w-10 h-10"
            priority
          />
          <div className="flex flex-col leading-tight">
            <span className="font-display font-black text-vena-kaki text-base">
              VENA
            </span>
            <span className="text-[9px] uppercase tracking-widest text-vena-text-dim">
              Velito Expertise Numérique
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-vena-text-muted hover:text-vena-kaki transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={HUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs uppercase tracking-widest font-bold text-vena-text-dim hover:text-vena-kaki transition-colors"
          >
            ← Hub Velito
          </a>
          <Link href="/contact" className="btn-vena-primary text-xs">
            Démarrer un projet
          </Link>
        </nav>

        {/* Mobile burger */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={mobileOpen}
          className="md:hidden w-10 h-10 rounded-full border border-vena-border flex items-center justify-center text-vena-kaki"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
            aria-hidden="true"
          >
            {mobileOpen ? (
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            ) : (
              <path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-vena-border bg-vena-cream">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm font-semibold text-vena-text-muted hover:text-vena-kaki"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={HUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs uppercase tracking-widest font-bold text-vena-text-dim"
            >
              ← Hub Velito
            </a>
            <Link
              href="/contact"
              onClick={() => setMobileOpen(false)}
              className="btn-vena-primary text-xs mt-2 w-full"
            >
              Démarrer un projet
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
