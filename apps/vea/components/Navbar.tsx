/**
 * Navbar — Navigation principale VEA (refonte 16/05/2026 — fond clair).
 *
 * Avant : fond violet sombre + glow rouge neon -> DA "gamer hardcore".
 * Apres : fond blanc (legere transparence au scroll), texte fonce, accent
 * rouge VEA pour le CTA "Adherer". Style proche de mabb.fr : sobre, pro.
 *
 * "use client" car j'utilise useState + useEffect.
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "Accueil", href: "/" },
  { label: "Association", href: "/association" },
  { label: "Esport", href: "/esport" },
  { label: "Agenda", href: "/agenda" },
  { label: "Medias", href: "/medias" },
  { label: "Partenaires", href: "/partenaires" },
  { label: "Contact", href: "/contact" },
];

const HELLOASSO_URL =
  "https://www.helloasso.com/associations/velito-esport-amiens/adhesions/adhesion-2026";

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md border-b border-vea-border shadow-card-soft"
          : "bg-white border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src="/images/vea-logo-rouge-fond-blanc.png"
            alt="Logo VEA"
            width={40}
            height={40}
            className="w-10 h-10 object-contain"
            priority
          />
          <div className="hidden sm:block leading-tight">
            <span className="block text-vea-text font-bold text-sm tracking-wide">
              VELITO
            </span>
            <span className="block text-vea-accent text-[10px] uppercase tracking-widest font-semibold">
              Esport Amiens
            </span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-vea-text-muted hover:text-vea-accent transition-colors font-medium"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          {/* TODO: reactiver en V1.5 quand auth Supabase est prete
          <Link
            href="/login"
            className="text-sm text-vea-text-muted hover:text-vea-text font-medium px-3 py-1.5 transition-colors"
          >
            Connexion
          </Link>
          */}
          <a
            href={HELLOASSO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-vea-accent hover:bg-vea-accent-hover text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all shadow-btn-accent hover:-translate-y-0.5"
          >
            Adherer
          </a>
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden text-vea-text p-2"
          aria-label="Ouvrir le menu"
          type="button"
        >
          <div className="w-6 h-4 flex flex-col justify-between">
            <span className="block h-0.5 w-full bg-vea-text" />
            <span className="block h-0.5 w-4 bg-vea-text" />
            <span className="block h-0.5 w-full bg-vea-text" />
          </div>
        </button>
      </div>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-white border-l border-vea-border shadow-2xl transform transition-transform duration-200 lg:hidden ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-vea-border">
          <span className="text-vea-text font-bold text-sm">Menu</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-vea-text-muted hover:text-vea-accent p-1 transition-colors"
            aria-label="Fermer le menu"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setDrawerOpen(false)}
              className="block py-3 px-3 text-vea-text-muted hover:text-vea-accent hover:bg-vea-surface-soft rounded-lg transition-colors text-sm font-medium"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="p-4 space-y-3 border-t border-vea-border">
          <a
            href={HELLOASSO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setDrawerOpen(false)}
            className="block text-center bg-vea-accent hover:bg-vea-accent-hover text-white text-sm font-semibold px-5 py-3 rounded-lg transition-colors shadow-btn-accent"
          >
            Adherer
          </a>
          {/* TODO: reactiver en V1.5 quand auth Supabase est prete
          <Link
            href="/login"
            onClick={() => setDrawerOpen(false)}
            className="block w-full text-center border border-vea-border-strong text-vea-text text-sm font-medium py-2.5 rounded-lg hover:border-vea-accent hover:text-vea-accent transition-all"
          >
            Connexion
          </Link>
          */}
        </div>
      </div>
    </nav>
  );
}
