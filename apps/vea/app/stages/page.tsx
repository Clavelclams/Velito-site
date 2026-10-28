/**
 * /stages — Page publique : ce que VEA propose en stage, ce qu'elle ne
 * propose pas, les périodes déjà prises et le formulaire de candidature.
 *
 * Architecture :
 *   - page.tsx (Server Component) : textes, metadata SEO, liste des périodes
 *   - CandidatureForm.tsx (Client) : formulaire + avertissement de dates
 *   - actions.ts : Server Action (validation serveur + INSERT type 'stage')
 *   - lib/stages.config.ts : les périodes prises, à modifier à la main
 *
 * [16/10/2026] Créé. revalidate = 1 jour : la page est régénérée chaque jour,
 * ce qui fait disparaître les périodes terminées sans redéployer.
 */
import type { Metadata } from "next";
import Link from "next/link";
import CandidatureForm from "./CandidatureForm";
import { periodesAVenir, dateEnFrancais, aujourdhuiParis } from "@/lib/stages.config";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Stages - Velito Esport Amiens",
  description:
    "Stages Bac Pro CIEL, filières numériques et stages d'observation de 3e chez Velito Esport Amiens. Un stagiaire par période, candidature en ligne.",
  openGraph: {
    title: "Stages - Velito Esport Amiens",
    description: "Découvrir l'animation numérique, l'esport éducatif et le travail associatif dans les quartiers d'Amiens.",
    images: [{ url: "/images/vea-logo-rouge-fond-blanc.png", width: 800, height: 800, alt: "Logo Velito Esport Amiens" }],
  },
};

export default function StagesPage() {
  const aujourdhui = aujourdhuiParis();
  const periodes = periodesAVenir(aujourdhui);

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* 1. Introduction */}
        <section className="text-center">
          <span className="badge-red mb-4 inline-block">Stages</span>
          <h1 className="text-3xl sm:text-5xl font-black text-vea-text mb-4 leading-tight">
            Faire ton stage chez <span className="text-vea-accent">VEA</span>
          </h1>
          <p className="text-base sm:text-lg text-vea-text-muted leading-relaxed">
            VEA accueille des stagiaires pour découvrir l&apos;animation numérique, l&apos;esport
            éducatif et le travail associatif dans les quartiers d&apos;Amiens.
          </p>
          <Link href="#candidature" className="btn-primary text-sm inline-block mt-6">
            Envoyer ma candidature
          </Link>
        </section>

        {/* 2. Ce qu'on propose */}
        <section aria-labelledby="titre-propose">
          <h2 id="titre-propose" className="text-xl sm:text-2xl font-black text-vea-text mb-4">Ce qu&apos;on propose</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card-clean p-5">
              <h3 className="font-bold text-vea-text mb-2">Bac Pro CIEL et filières numériques</h3>
              <ul className="text-sm text-vea-text-muted space-y-1.5 list-disc pl-5">
                <li>Matériel informatique</li>
                <li>Configuration de mini-PC</li>
                <li>Réseau</li>
                <li>Préparation d&apos;événements</li>
                <li>Diffusion en direct</li>
              </ul>
            </div>
            <div className="card-clean p-5">
              <h3 className="font-bold text-vea-text mb-2">Stage d&apos;observation de 3e</h3>
              <p className="text-sm text-vea-text-muted">
                Une semaine pour découvrir nos activités : préparation, animations, coulisses d&apos;un
                événement.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Ce qu'on ne propose pas + 4. La règle */}
        <section aria-labelledby="titre-pas" className="grid gap-4 sm:grid-cols-2">
          <div className="card-clean p-5">
            <h2 id="titre-pas" className="font-bold text-vea-text mb-2">Ce qu&apos;on ne propose pas</h2>
            <ul className="text-sm text-vea-text-muted space-y-1.5 list-disc pl-5">
              <li>Pas d&apos;alternance : VEA n&apos;a ni salarié ni capacité de financement.</li>
              <li>Pas de stage en télétravail.</li>
            </ul>
          </div>
          <div className="card-clean p-5 border-vea-accent/40">
            <h2 className="font-bold text-vea-text mb-2">Notre règle</h2>
            <p className="text-sm text-vea-text-muted">
              <strong className="text-vea-accent">Un seul stagiaire par période</strong>, pour bien
              t&apos;encadrer.
            </p>
          </div>
        </section>

        {/* 5. Périodes déjà prises (lib/stages.config.ts) */}
        <section aria-labelledby="titre-periodes">
          <h2 id="titre-periodes" className="text-xl sm:text-2xl font-black text-vea-text mb-4">Périodes déjà prises</h2>
          {periodes.length === 0 ? (
            <p className="card-clean p-5 text-sm text-vea-text-muted">Aucune période prise pour le moment.</p>
          ) : (
            <ul className="space-y-2">
              {periodes.map((p) => (
                <li key={p.debut} className="card-clean px-5 py-3 text-sm text-vea-text flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-vea-accent shrink-0" aria-hidden="true" />
                  Du {dateEnFrancais(p.debut)} au {dateEnFrancais(p.fin)}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-vea-text-dim">
            Tu peux candidater sur ces dates, mais on ne pourra probablement pas t&apos;accueillir.
          </p>
        </section>

        {/* 6. Formulaire */}
        <section id="candidature" aria-labelledby="titre-candidature" className="scroll-mt-24">
          <h2 id="titre-candidature" className="text-xl sm:text-2xl font-black text-vea-text mb-4">Candidater</h2>
          <CandidatureForm aujourdhui={aujourdhui} />
        </section>
      </div>
    </div>
  );
}
