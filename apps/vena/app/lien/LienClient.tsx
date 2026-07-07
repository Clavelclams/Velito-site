/**
 * LienClient — assemblage de la page /lien (la "carte de liens" partagée
 * sur les réseaux). Deux rendus :
 *
 *  DESKTOP (md+) : carte badge (LanyardCard) à gauche, FlowingMenu plein
 *                  hauteur à droite (effet marquee au survol).
 *
 *  MOBILE (<md)  : carte badge en haut, puis nav verticale simple — des
 *                  <li> empilés SANS effet (comme demandé, pour ne pas
 *                  surcharger). Le FlowingMenu (lourd à animer) n'est pas
 *                  monté sur mobile.
 *
 * Le choix desktop/mobile se fait en CSS (hidden / md:flex) : les deux
 * existent dans le DOM mais une seule est visible. Simple et fiable.
 */
"use client";

import FlowingMenu from "@/components/FlowingMenu";
import LanyardCard from "@/components/LanyardCard";
import { LIEN_ITEMS } from "./links";

export default function LienClient() {
  return (
    <div className="min-h-screen bg-vena-cream flex flex-col">
      {/* En-tête sobre */}
      <header className="px-5 pt-10 pb-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.35em] text-vena-text-dim mb-3">
          Velito
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-vena-kaki leading-tight">
          Tous mes liens
        </h1>
        <p className="text-sm text-vena-text-muted mt-2 max-w-md mx-auto">
          L&apos;esport associatif, l&apos;agence numérique et le reste de
          l&apos;écosystème, au même endroit.
        </p>
      </header>

      {/* ---------- DESKTOP ---------- */}
      <div className="hidden md:grid grid-cols-2 flex-1 min-h-[70vh]">
        {/* Carte badge */}
        <div className="flex items-center justify-center p-8">
          <LanyardCard />
        </div>
        {/* Menu marquee plein hauteur */}
        <div className="border-l border-vena-border">
          <FlowingMenu items={LIEN_ITEMS} />
        </div>
      </div>

      {/* ---------- MOBILE ---------- */}
      <div className="md:hidden flex flex-col items-center px-5 pb-12 gap-8 flex-1">
        <LanyardCard />

        <nav className="w-full max-w-sm" aria-label="Liens Velito">
          <ul className="flex flex-col gap-3">
            {LIEN_ITEMS.map((item) => (
              <li key={item.link + item.text}>
                <a
                  href={item.link}
                  {...(item.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="block w-full text-center font-display font-black uppercase tracking-wide text-vena-kaki text-lg bg-white border border-vena-border rounded-xl py-4 shadow-card-clean active:scale-[0.98] transition-transform"
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <footer className="py-6 text-center">
        <p className="text-[10px] text-vena-text-dim">
          © {new Date().getFullYear()} Velito · Amiens
        </p>
      </footer>
    </div>
  );
}
