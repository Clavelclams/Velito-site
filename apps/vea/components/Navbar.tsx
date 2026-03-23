/**
 * Navbar — Navigation principale du site VEA
 *
 * 👉 Ce que fait ce composant :
 * Affiche le logo VEA, les liens de navigation, et un bouton "Adhérer".
 * Sur mobile : menu hamburger qui ouvre/ferme un menu déroulant.
 * La navbar est sticky = elle reste collée en haut quand on scrolle.
 *
 * 👉 Point important :
 * C'est un Client Component ("use client") parce qu'on utilise useState
 * pour gérer l'ouverture/fermeture du menu mobile.
 * En Next.js App Router, tout composant qui utilise du state ou des events
 * doit avoir "use client" en haut du fichier.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

// 👉 Interface pour typer les liens de navigation
interface NavLink {
  label: string;
  href: string;
}

// 👉 Tous les liens en un seul endroit — facile à modifier
const NAV_LINKS: NavLink[] = [
  { label: "Accueil", href: "/" },
  { label: "Association", href: "/association" },
  { label: "Esport", href: "/esport" },
  { label: "Agenda", href: "/evenements" },
  { label: "Médias", href: "/medias" },
  { label: "Partenaires", href: "/partenaires" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  // 👉 State pour le menu mobile : false = fermé, true = ouvert
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  return (
    // 👉 sticky top-0 = reste collé en haut au scroll
    // z-50 = au-dessus de tout le contenu de la page
    <nav className="sticky top-0 z-50 w-full bg-vea-black/95 backdrop-blur-sm border-b border-vea-gray-light/20">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">

        {/* ======= LOGO + NOM ======= */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          {/* 👉 Image du logo VEA — blanc sur fond transparent pour bien ressortir sur le noir */}
          <Image
            src="/images/vea-logo-blanc-fond-transparent.png"
            alt="Logo VEA"
            width={40}
            height={40}
            className="w-10 h-10 object-contain"
          />
          {/* 👉 Nom visible seulement sur desktop (md: = 768px+) */}
          <span className="hidden md:block text-vea-white font-bold text-sm uppercase tracking-wider">
            Velito Esport Amiens
          </span>
        </Link>

        {/* ======= LIENS DESKTOP ======= */}
        {/* 👉 hidden lg:flex = caché sur mobile/tablette, visible en flex sur desktop */}
        <div className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-vea-white/70 hover:text-vea-white transition-colors font-medium"
            >
              {link.label}
            </Link>
          ))}

          {/* 👉 Bouton CTA "Adhérer" — toujours visible sur desktop */}
          <Link
            href="/contact"
            className="ml-2 bg-vea-red hover:bg-vea-red/90 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Adhérer
          </Link>
        </div>

        {/* ======= BOUTON HAMBURGER MOBILE ======= */}
        {/* 👉 lg:hidden = visible seulement sous 1024px */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden text-vea-white p-2"
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          type="button"
        >
          {/* 👉 3 barres animées : quand le menu est ouvert, elles forment un X */}
          <div className="w-6 h-5 flex flex-col justify-between">
            <span
              className={`block h-0.5 w-full bg-vea-white transition-transform duration-300 ${
                mobileOpen ? "rotate-45 translate-y-[9px]" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-full bg-vea-white transition-opacity duration-300 ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-full bg-vea-white transition-transform duration-300 ${
                mobileOpen ? "-rotate-45 -translate-y-[9px]" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {/* ======= MENU MOBILE DÉROULANT ======= */}
      {/* 👉 Affiché seulement quand mobileOpen est true ET on est sous lg */}
      {mobileOpen && (
        <div className="lg:hidden bg-vea-black border-t border-vea-gray-light/20 px-4 py-4 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)} // 👉 Ferme le menu quand on clique un lien
              className="block py-3 px-3 text-vea-white/70 hover:text-vea-white hover:bg-vea-gray-light/20 rounded-lg transition-colors text-sm font-medium"
            >
              {link.label}
            </Link>
          ))}
          {/* 👉 Bouton Adhérer en pleine largeur sur mobile */}
          <Link
            href="/contact"
            onClick={() => setMobileOpen(false)}
            className="block mt-3 text-center bg-vea-red hover:bg-vea-red/90 text-white text-sm font-semibold px-5 py-3 rounded-lg transition-colors"
          >
            Adhérer
          </Link>
        </div>
      )}
    </nav>
  );
}
