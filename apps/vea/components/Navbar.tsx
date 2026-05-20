/**
 * Navbar — Navigation principale VEA (mise a jour 18/05/2026).
 *
 * Logique des actions :
 *   - Deconnecte : Connexion + S'inscrire + Adherer (pas d'Arena)
 *   - Connecte   : Arena (cliquable) + Mon profil + Deconnexion + Adherer
 *
 * Arena n'apparait QUE pour les users connectes -- c'est un teaser interne,
 * pas pour les visiteurs anonymes. Lien actif vers /arena (page placeholder
 * "en construction" tant que arena.velito.com n'est pas deploye).
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import NotificationBell from "./NotificationBell";

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
  const router = useRouter();
  const supabase = createClient();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      setAuthLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setDrawerOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? "bg-white border-b border-vea-border shadow-card-soft"
          : "bg-white border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between relative">
        {/* LOGO (gauche) */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src="/images/vea-logo-rouge-fond-blanc.png"
            alt="Logo VEA"
            width={40}
            height={40}
            className="w-10 h-10 object-contain"
            priority
          />
          {/* Texte visible sur tablet+ a cote du logo (desktop sticky) */}
          <div className="hidden sm:block lg:block leading-tight">
            <span className="block text-vea-text font-bold text-sm tracking-wide">
              VELITO
            </span>
            <span className="block text-vea-accent text-[10px] uppercase tracking-widest font-semibold">
              Esport Amiens
            </span>
          </div>
        </Link>

        {/* TITRE MOBILE CENTRE — visible uniquement sur < sm (telephones) */}
        <div className="sm:hidden absolute left-1/2 -translate-x-1/2 leading-tight text-center pointer-events-none">
          <span className="block text-vea-text font-bold text-sm tracking-wide">
            VELITO
          </span>
          <span className="block text-vea-accent text-[9px] uppercase tracking-widest font-semibold">
            Esport Amiens
          </span>
        </div>

        {/* LIENS NAV (desktop) */}
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

        {/* ACTIONS AUTH (desktop) */}
        <div className="hidden lg:flex items-center gap-3">
          {!authLoaded ? (
            <div className="w-32 h-8" />
          ) : user ? (
            <>
              {/* Lien Joueurs — visible uniquement connecte. Remplace l'ancien
                  teaser "Arena Beta" qui partait sur une page placeholder.
                  /joueurs = annuaire reel des membres VEA opt-in is_public. */}
              <Link
                href="/joueurs"
                className="text-sm text-vea-text-muted hover:text-vea-accent transition-colors font-medium px-3 py-1.5"
              >
                Joueurs
              </Link>
              <Link
                href="/profil"
                className="text-sm text-vea-text-muted hover:text-vea-accent transition-colors font-medium px-3 py-1.5"
              >
                Mon profil
              </Link>
              <NotificationBell />
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm text-vea-text-muted hover:text-vea-accent transition-colors font-medium px-3 py-1.5"
              >
                Deconnexion
              </button>
              <a
                href={HELLOASSO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-vea-accent hover:bg-vea-accent-hover text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all shadow-btn-accent hover:-translate-y-0.5"
              >
                Adherer
              </a>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-vea-text-muted hover:text-vea-text font-medium px-3 py-1.5 transition-colors"
              >
                Connexion
              </Link>
              <Link
                href="/signup"
                className="text-sm text-vea-accent border border-vea-accent/40 hover:bg-vea-accent-soft hover:border-vea-accent font-semibold px-4 py-1.5 rounded-lg transition-all"
              >
                S&apos;inscrire
              </Link>
              <a
                href={HELLOASSO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-vea-accent hover:bg-vea-accent-hover text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all shadow-btn-accent hover:-translate-y-0.5"
              >
                Adherer
              </a>
            </>
          )}
        </div>

        {/* BURGER (mobile) */}
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

      {/* DRAWER OVERLAY — renforce pour mieux cacher le contenu derriere */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* DRAWER MOBILE */}
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
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
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

          {/* Joueurs visible mobile UNIQUEMENT si connecte (remplace Arena Beta).
              Annuaire des membres VEA opt-in is_public. */}
          {authLoaded && user && (
            <Link
              href="/joueurs"
              onClick={() => setDrawerOpen(false)}
              className="block py-3 px-3 text-vea-text-muted hover:text-vea-accent hover:bg-vea-surface-soft rounded-lg transition-colors text-sm font-medium"
            >
              Joueurs
            </Link>
          )}
        </div>

        <div className="p-4 space-y-3 border-t border-vea-border">
          {!authLoaded ? (
            <div className="h-10" />
          ) : user ? (
            <>
              <Link
                href="/profil"
                onClick={() => setDrawerOpen(false)}
                className="block w-full text-center border border-vea-border-strong text-vea-text text-sm font-medium py-2.5 rounded-lg hover:border-vea-accent hover:text-vea-accent transition-all"
              >
                Mon profil
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full text-center text-vea-text-muted text-sm font-medium py-2.5 hover:text-vea-accent transition-all"
              >
                Deconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setDrawerOpen(false)}
                className="block w-full text-center border border-vea-border-strong text-vea-text text-sm font-medium py-2.5 rounded-lg hover:border-vea-accent hover:text-vea-accent transition-all"
              >
                Connexion
              </Link>
              <Link
                href="/signup"
                onClick={() => setDrawerOpen(false)}
                className="block w-full text-center border border-vea-accent/40 text-vea-accent text-sm font-semibold py-2.5 rounded-lg hover:bg-vea-accent-soft hover:border-vea-accent transition-all"
              >
                S&apos;inscrire
              </Link>
            </>
          )}

          <a
            href={HELLOASSO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setDrawerOpen(false)}
            className="block text-center bg-vea-accent hover:bg-vea-accent-hover text-white text-sm font-semibold px-5 py-3 rounded-lg transition-colors shadow-btn-accent"
          >
            Adherer
          </a>
        </div>
      </div>
    </nav>
  );
}
