/**
 * NavBar — barre de navigation principale du hub Velito.
 *
 * Layout (ma spec) :
 *   - Container centré à 70% de la largeur viewport
 *   - 15% vide à gauche, 15% vide à droite
 *   - Hauteur ~70px
 *   - Fixed top, fond transparent + backdrop-blur (glassmorphism) pour
 *     ne pas masquer la Galaxy en dessous mais rester lisible.
 *
 * Contenu :
 *   - Logo VENA (à gauche) → cliquable, ramène à la home
 *   - Barre de recherche (centre) avec icône loupe, transparente
 *   - Boutons "Se connecter" et "S'inscrire" (droite) → /construction
 *
 * Note recherche : la barre est purement UI pour l'instant. Pas de moteur
 * de recherche derrière. Onsubmit redirige vers /construction?slug=services
 * en attendant qu'on construise la vraie indexation.
 */

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function NavBar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Submit de la recherche → redirige vers construction (pas encore d'indexation).
  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      // Pour l'instant, redirige vers /construction avec query en paramètre.
      // Quand la vraie recherche sera prête, on cible /search?q=xxx.
      const q = searchQuery.trim();
      router.push(`/construction?slug=search${q ? `&q=${encodeURIComponent(q)}` : ""}`);
    },
    [router, searchQuery]
  );

  return (
    <header
      role="banner"
      className="fixed top-0 left-0 right-0 z-40 h-[70px] pointer-events-none"
    >
      {/* Le conteneur centré à 70% ; pointer-events-auto seulement sur les
          enfants pour ne pas bloquer les clics sur le canvas en dessous des
          zones vides 15% / 15%. */}
      <div className="mx-auto h-full px-[15%] flex items-center justify-between gap-4 pointer-events-none">
        {/* Logo VENA — cliquable retour home. */}
        <Link
          href="/"
          aria-label="Retour à l'accueil Velito"
          className="pointer-events-auto flex items-center h-full py-3 shrink-0"
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

        {/* Search bar centre — flex-1 prend tout l'espace disponible. */}
        <form
          onSubmit={handleSubmit}
          role="search"
          aria-label="Rechercher dans l'écosystème Velito"
          className="pointer-events-auto flex-1 max-w-xl mx-auto"
        >
          <div className="relative">
            {/* Icône loupe SVG inline pour pas dépendre d'une lib. */}
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
        </form>

        {/* Actions droite. */}
        <div className="pointer-events-auto flex items-center gap-2 shrink-0">
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
            S'inscrire
          </Link>
        </div>
      </div>
    </header>
  );
}
