/**
 * Navbar — Navigation principale VEA
 *
 * 👉 REFONTE VIOLET + ROUGE :
 *   - Fond transparent → opaque au scroll (effet glassmorphism)
 *   - Couleurs : violet (#7c3aed) + rouge (#E63946) au lieu de bleu
 *   - Bouton "Adhérer" rouge avec glow au hover
 *   - Logo text en text-gradient-vea (blanc→rouge)
 *
 * 👉 SCROLL EFFECT :
 *   - useState + useEffect pour détecter le scroll > 50px
 *   - Au scroll : fond opaque + border visible + shadow
 *   - Sans scroll : fond transparent (le hero se voit en dessous)
 *
 * "use client" car on utilise useState + useEffect
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
  { label: "Médias", href: "/medias" },
  { label: "Partenaires", href: "/partenaires" },
  { label: "Contact", href: "/contact" },
  { label: "Inscription", href: "/inscription" },
];

const HELLOASSO_URL =
  "https://www.helloasso.com/associations/velito-esport-amiens/adhesions/adhesion-2026";

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // 👉 On écoute le scroll pour changer le style de la navbar
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-vea-dark/95 backdrop-blur-md border-b border-vea-border/30 shadow-lg shadow-black/20"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">

        {/* ===== LOGO ===== */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src="/images/vea-logo-blanc-fond-transparent.png"
            alt="Logo VEA"
            width={38}
            height={38}
            className="w-[38px] h-[38px] object-contain"
          />
          <div className="hidden sm:block leading-tight">
            <span className="block text-gradient-vea font-bold text-sm tracking-wide">
              VELITO
            </span>
            <span className="block text-vea-red-light text-[10px] uppercase tracking-widest font-medium">
              Esport Amiens
            </span>
          </div>
        </Link>

        {/* ===== LIENS DESKTOP ===== */}
        <div className="hidden lg:flex items-center gap-5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] text-vea-text-muted hover:text-vea-white transition-colors font-medium"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* ===== ACTIONS DESKTOP ===== */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/login"
            className="text-[13px] text-vea-text-dim hover:text-vea-text-muted transition-colors font-medium"
          >
            Connexion
          </Link>
          <a
            href={HELLOASSO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-vea-red hover:bg-vea-accent-hover text-white text-[13px] font-semibold px-5 py-2 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(230,57,70,0.4)]"
          >
            Adhérer
          </a>
        </div>

        {/* ===== HAMBURGER MOBILE ===== */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden text-vea-white p-2"
          aria-label="Ouvrir le menu"
          type="button"
        >
          <div className="w-6 h-4 flex flex-col justify-between">
            <span className="block h-0.5 w-full bg-vea-white" />
            <span className="block h-0.5 w-4 bg-vea-white" />
            <span className="block h-0.5 w-full bg-vea-white" />
          </div>
        </button>
      </div>

      {/* ===== DRAWER MOBILE (depuis la droite) ===== */}
      {/* Overlay sombre */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Panneau latéral */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-vea-dark border-l border-vea-border/30 transform transition-transform duration-300 lg:hidden ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Bouton fermer */}
        <div className="flex items-center justify-between p-4 border-b border-vea-border/20">
          <span className="text-vea-white font-bold text-sm">Menu</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-vea-text-muted hover:text-vea-white p-1"
            aria-label="Fermer le menu"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Liens */}
        <div className="p-4 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setDrawerOpen(false)}
              className="block py-3 px-3 text-vea-text-muted hover:text-vea-white hover:bg-vea-card/50 rounded-lg transition-colors text-sm font-medium"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions mobile */}
        <div className="p-4 space-y-3 border-t border-vea-border/20">
          <a
            href={HELLOASSO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setDrawerOpen(false)}
            className="block text-center bg-vea-red hover:bg-vea-accent-hover text-white text-sm font-semibold px-5 py-3 rounded-lg transition-colors"
          >
            Adhérer
          </a>
          <Link
            href="/login"
            onClick={() => setDrawerOpen(false)}
            className="block w-full text-center text-vea-text-dim hover:text-vea-text-muted text-sm font-medium py-2"
          >
            Connexion
          </Link>
        </div>
      </div>
    </nav>
  );
}
