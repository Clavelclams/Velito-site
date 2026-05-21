/**
 * NavBar — barre de navigation principale du hub Velito.
 *
 * Desktop (md+) : logo à gauche · recherche au centre · "Se connecter" +
 * "S'inscrire" à droite. Conteneur à 70% (15% vide de chaque côté).
 *
 * Mobile (< md) : logo CENTRÉ · hamburger à droite. Le hamburger déroule un
 * panneau contenant la recherche + les actions (Se connecter / S'inscrire).
 *
 * Le header est pointer-events-none (laisse passer les clics vers la Galaxy
 * en dessous) ; seuls les éléments interactifs ont pointer-events-auto.
 */

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function NavBar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const q = searchQuery.trim();
      setMobileOpen(false);
      router.push(
        `/construction?slug=search${q ? `&q=${encodeURIComponent(q)}` : ""}`
      );
    },
    [router, searchQuery]
  );

  const searchInput = (
    <div className="relative">
      <span
        aria-hidden="true"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </span>
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Rechercher dans Velito…"
        aria-label="Rechercher"
        className="w-full pl-10 pr-4 py-2 bg-white/5 backdrop-blur-md border border-white/15 rounded-full text-white placeholder-white/50 text-sm focus:outline-none focus:border-white/40 focus:bg-white/10 transition-colors"
      />
    </div>
  );

  return (
    <header
      role="banner"
      className="fixed top-0 left-0 right-0 z-40 pointer-events-none"
    >
      {/* ===== Barre principale ===== */}
      <div className="h-[70px] px-4 md:px-[15%] flex items-center md:justify-between gap-4 pointer-events-none">
        {/* --- DESKTOP : logo --- */}
        <Link
          href="/"
          aria-label="Retour à l'accueil Velito"
          className="hidden md:flex pointer-events-auto items-center h-full py-3 shrink-0"
        >
          <Image
            src="/vena-logo-blanc.svg"
            alt="VENA"
            width={120}
            height={44}
            priority
            style={{ height: "auto", width: "120px" }}
          />
        </Link>

        {/* --- DESKTOP : recherche --- */}
        <form
          onSubmit={handleSubmit}
          role="search"
          aria-label="Rechercher dans l'écosystème Velito"
          className="hidden md:block pointer-events-auto flex-1 max-w-xl mx-auto"
        >
          {searchInput}
        </form>

        {/* --- DESKTOP : actions --- */}
        <div className="hidden md:flex pointer-events-auto items-center gap-2 shrink-0">
          <Link
            href="/construction?slug=login"
            className="text-white/80 hover:text-white text-sm px-3 py-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            Se connecter
          </Link>
          <Link
            href="/construction?slug=signup"
            className="bg-white text-[#04040e] text-sm px-4 py-2 rounded-full font-medium hover:bg-white/90 transition-colors focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            S&apos;inscrire
          </Link>
        </div>

        {/* --- MOBILE : spacer + logo centré + hamburger --- */}
        <div className="flex md:hidden w-full items-center justify-between pointer-events-none">
          <span className="w-10 h-10 shrink-0" aria-hidden="true" />
          <Link
            href="/"
            aria-label="Retour à l'accueil Velito"
            onClick={() => setMobileOpen(false)}
            className="pointer-events-auto flex items-center"
          >
            <Image
              src="/vena-logo-blanc.svg"
              alt="VENA"
              width={110}
              height={40}
              priority
              style={{ height: "auto", width: "110px" }}
            />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileOpen}
            className="pointer-events-auto w-10 h-10 shrink-0 flex items-center justify-center rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-white"
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
      </div>

      {/* ===== Menu déroulant mobile ===== */}
      {mobileOpen && (
        <div className="md:hidden pointer-events-auto mx-4 mt-1 rounded-2xl border border-white/15 bg-[#04040e]/95 backdrop-blur-md p-4 space-y-3 shadow-xl">
          <form
            onSubmit={handleSubmit}
            role="search"
            aria-label="Rechercher dans l'écosystème Velito"
          >
            {searchInput}
          </form>
          <Link
            href="/construction?slug=login"
            onClick={() => setMobileOpen(false)}
            className="block w-full text-center text-white/90 border border-white/20 rounded-full px-4 py-2.5 text-sm hover:bg-white/10 transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/construction?slug=signup"
            onClick={() => setMobileOpen(false)}
            className="block w-full text-center bg-white text-[#04040e] rounded-full px-4 py-2.5 text-sm font-medium hover:bg-white/90 transition-colors"
          >
            S&apos;inscrire
          </Link>
        </div>
      )}
    </header>
  );
}
