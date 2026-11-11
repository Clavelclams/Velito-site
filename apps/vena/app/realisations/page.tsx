/**
 * /realisations : portfolio VENA.
 *
 * [11/11/2026] Même direction que l'accueil : layout magazine, aplats de
 * couleur, numéros typographiques, pas d'emoji. Les données viennent de
 * lib/realisations.ts (projets puis personnes avec qui on a travaillé).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { COLLABORATEURS, PROJETS } from "@/lib/realisations";

export const metadata: Metadata = {
  title: "Réalisations",
  description:
    "Les projets construits par VENA (Venaball, Velito Interactive, sites de l'écosystème Velito) et les personnes avec qui on les a faits.",
};

export default function RealisationsPage() {
  return (
    <>
      {/* En-tête */}
      <section className="bg-vena-cream border-b border-vena-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-vena-text-dim mb-6">
            Réalisations
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-black text-vena-kaki leading-[0.95] tracking-tight mb-6 max-w-4xl">
            Ce qu&apos;on a construit, et qui était là.
          </h1>
          <p className="text-lg text-vena-text leading-relaxed max-w-2xl">
            Des projets en production, utilisés par de vraies personnes. Chacun
            a été conçu, codé et mis en ligne chez VENA.
          </p>
        </div>
      </section>

      {/* Projets */}
      <section className="border-b border-vena-border">
        {PROJETS.map((p, i) => (
          <article
            key={p.slug}
            id={p.slug}
            className={`${p.fond} text-vena-text border-t border-vena-border`}
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-3">
                <p className="font-display text-7xl sm:text-8xl font-black text-vena-kaki/30 leading-none">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-4 text-xs font-black uppercase tracking-widest text-vena-kaki">
                  {p.statut}
                </p>
              </div>
              <div className="md:col-span-9 max-w-2xl">
                <h2 className="font-display text-2xl sm:text-4xl font-black text-vena-kaki mb-3">
                  {p.nom}
                </h2>
                <p className="text-lg sm:text-xl font-display font-bold text-vena-kaki mb-5">
                  {p.accroche}
                </p>
                <p className="text-base leading-relaxed mb-5">{p.description}</p>
                <p className="text-sm mb-5">
                  <strong className="font-black text-vena-kaki">Notre rôle : </strong>
                  {p.role}
                </p>
                <ul className="flex flex-wrap gap-2 mb-6" aria-label="Technologies">
                  {p.stack.map((t) => (
                    <li
                      key={t}
                      className="text-xs font-semibold px-2 py-1 rounded border border-vena-kaki/30 bg-white/60"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {p.liens.map((l) => (
                    <a
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-vena-kaki underline decoration-2 underline-offset-4 hover:text-vena-kaki-dark"
                    >
                      {l.label} →
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Personnes */}
      <section className="bg-vena-kaki text-vena-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <p className="text-[10px] uppercase tracking-[0.3em] opacity-70 mb-3">
            Avec qui on a travaillé
          </p>
          <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight max-w-3xl mb-12">
            Rien de tout ça ne s&apos;est fait seul.
          </h2>
          <ul className="space-y-10">
            {COLLABORATEURS.map((c) => (
              <li
                key={c.nom}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-t border-vena-cream/20 pt-8"
              >
                <p className="md:col-span-4 font-display text-xl sm:text-2xl font-black leading-snug">
                  {c.nom}
                </p>
                <div className="md:col-span-8 max-w-2xl">
                  <p className="text-base leading-relaxed">{c.contribution}</p>
                  {c.parcours && (
                    <p className="text-base opacity-85 leading-relaxed mt-2">
                      {c.parcours}
                    </p>
                  )}
                  {c.lien && (
                    <a
                      href={c.lien.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-sm font-semibold underline decoration-2 underline-offset-4"
                    >
                      {c.lien.label} →
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-vena-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-24 text-center">
          <h2 className="font-display text-4xl sm:text-5xl font-black text-vena-kaki leading-tight mb-8">
            Le prochain, c&apos;est le tien ?
          </h2>
          <Link href="/contact" className="btn-vena-primary text-base px-10 py-4">
            Parle-nous de ton projet
          </Link>
        </div>
      </section>
    </>
  );
}
