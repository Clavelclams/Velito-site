/**
 * VENA — Page d'accueil.
 *
 * Direction éditoriale (refonte 20/05/2026 — sortie du moule "agence générique") :
 *   - Pas d'emojis dans les sections (aplats colorés + numéros typographiques)
 *   - Ton direct, à la première personne. VENA = Clavel + équipe progressive.
 *   - Layout asymétrique : alternance fond crème / pastel / kaki, pas de
 *     grille uniforme de cards.
 *   - Texte cru, sans buzz word agence ("solutions sur mesure",
 *     "expertise complète", "interlocuteur unique" → bannis).
 *   - Numérotation 01/02/03/04 au lieu d'emojis pour les services.
 *
 * Structure :
 *   1. Hero brut : qui on est en 3 lignes, sans slogan
 *   2. Services en layout magazine (4 sections full-width alternées)
 *   3. Manifeste VENA (3 convictions, pas 3 "avantages")
 *   4. Mot de Clavel (humanisation, ancrage local concret)
 *   5. Écosystème (lien VEA en narratif)
 *   6. CTA final direct
 */
import Link from "next/link";

const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL ?? "https://velito.fr";
const VEA_URL = process.env.NEXT_PUBLIC_VEA_URL ?? "https://vea.velito.fr";

interface Service {
  num: string;
  title: string;
  intro: string;
  body: string;
  examples: string;
  background: string;
  textColor: string;
}

const SERVICES: Service[] = [
  {
    num: "01",
    title: "Développement web",
    intro: "Des sites qui font le boulot.",
    body:
      "Pas de site vitrine qui dort. Pas de WordPress bourré de plugins qui rame. Du code propre, performant, qui charge vite et qui ramène des contacts. Stack Next.js, React, TypeScript, Supabase.",
    examples:
      "Sites associatifs, sites e-commerce, applications métier, dashboards admin sur mesure.",
    background: "bg-white",
    textColor: "text-vena-text",
  },
  {
    num: "02",
    title: "Production vidéo & photo",
    intro: "Capter ce qui se passe vraiment.",
    body:
      "Couvrir un événement, un tournoi, une inauguration. Faire une vidéo de présentation qui ressemble à ton truc et pas à une pub corporate générique. Format court pour les réseaux, format long pour la documentation.",
    examples:
      "Reportage événementiel, portrait, motion design simple, drone, montage rapide.",
    background: "bg-vena-tilleul",
    textColor: "text-vena-text",
  },
  {
    num: "03",
    title: "Location de matériel",
    intro: "Du matos pro sans le prix d'agence.",
    body:
      "Si t'organises un événement ou une captation et que t'as besoin de caméras, son, lumière, streaming, on loue le matos. À la journée ou au week-end, sur Amiens et autour.",
    examples:
      "Caméras hybrides, micros, éclairage scénique, setup streaming Twitch/YouTube complet.",
    background: "bg-vena-peche",
    textColor: "text-vena-text",
  },
  {
    num: "04",
    title: "Formation & accompagnement",
    intro: "T'apprendre, pas faire à ta place.",
    body:
      "Si tu veux gérer ton site / tes réseaux / tes vidéos toi-même, on prend le temps de t'expliquer. Une session, un parcours, un accompagnement régulier — selon où tu es.",
    examples:
      "Atelier WordPress, formation OBS / streaming, prise en main d'outils numériques, coaching projet digital.",
    background: "bg-vena-lavande",
    textColor: "text-vena-text",
  },
];

const CONVICTIONS = [
  {
    label: "Travailler local n'est pas un argument marketing.",
    body:
      "C'est notre cadre. On vit à Amiens, on connaît les structures et les gens, et on bosse mieux quand on peut se voir en vrai.",
  },
  {
    label: "Un bon outil sert celui qui l'utilise — pas celui qui l'a fait.",
    body:
      "On code pas pour montrer qu'on sait coder. On code pour que ton équipe arrive à publier une actu, encaisser un paiement, suivre un client, sans appeler le dev tous les 3 jours.",
  },
  {
    label: "Le numérique reste un moyen, pas la finalité.",
    body:
      "VENA existe parce que VEA, l'asso esport, avait besoin d'outils numériques. L'inverse est aussi vrai : ce qu'on construit pour les clients sert aussi le terrain associatif.",
  },
];

export default function VenaHome() {
  return (
    <>
      {/* ============================================
          HERO — brut, direct
      ============================================ */}
      <section className="bg-vena-cream border-b border-vena-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-vena-text-dim mb-8">
            Velito Expertise Numérique Amiens · SASU · depuis 2025
          </p>
          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-black text-vena-kaki leading-[0.95] tracking-tight mb-8">
            On fait du
            <br />
            <span className="bg-vena-tilleul px-2 inline-block -my-1">
              numérique
            </span>{" "}
            qui
            <br />
            <span className="bg-vena-peche px-2 inline-block -my-1">
              tient
            </span>{" "}
            la route.
          </h1>
          <p className="text-lg sm:text-xl text-vena-text leading-relaxed max-w-2xl mb-8">
            VENA, c&apos;est une boîte de dev / vidéo / matos basée à Amiens.
            On bosse avec des associations, des collectivités, des entreprises
            locales — et avec Velito Esport Amiens, l&apos;asso qu&apos;on a
            créée d&apos;abord.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-3 items-center">
            <Link href="/contact" className="btn-vena-primary">
              Parle-nous de ton projet
            </Link>
            <a
              href="#services"
              className="text-sm font-semibold text-vena-text underline decoration-vena-kaki underline-offset-4 hover:text-vena-kaki"
            >
              Voir ce qu&apos;on fait ↓
            </a>
          </div>
        </div>
      </section>

      {/* ============================================
          SERVICES — layout magazine, full-width alterné
      ============================================ */}
      <section id="services" className="border-b border-vena-border">
        <div className="bg-vena-cream py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-vena-text-dim mb-3">
              Ce qu&apos;on fait
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-black text-vena-kaki leading-tight max-w-3xl">
              Quatre métiers, une boîte, des projets qui se finissent.
            </h2>
          </div>
        </div>

        {SERVICES.map((s) => (
          <article
            key={s.num}
            className={`${s.background} ${s.textColor} border-t border-vena-border`}
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-3">
                <p className="font-display text-7xl sm:text-8xl font-black text-vena-kaki/30 leading-none">
                  {s.num}
                </p>
              </div>
              <div className="md:col-span-9 max-w-2xl">
                <h3 className="font-display text-2xl sm:text-4xl font-black text-vena-kaki mb-3">
                  {s.title}
                </h3>
                <p className="text-lg sm:text-xl font-display font-bold text-vena-kaki mb-5">
                  {s.intro}
                </p>
                <p className="text-base text-vena-text leading-relaxed mb-5">
                  {s.body}
                </p>
                <p className="text-sm text-vena-text-muted italic">
                  Exemples concrets : {s.examples}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* ============================================
          MANIFESTE — convictions, pas avantages
      ============================================ */}
      <section className="bg-vena-kaki text-vena-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <p className="text-[10px] uppercase tracking-[0.3em] opacity-70 mb-3">
            Manifeste
          </p>
          <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight max-w-3xl mb-12">
            Trois choses qu&apos;on ne va pas changer en route.
          </h2>

          <ol className="space-y-10">
            {CONVICTIONS.map((c, i) => (
              <li
                key={i}
                className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start border-t border-vena-cream/20 pt-8"
              >
                <div className="md:col-span-1">
                  <p className="font-display font-black text-3xl opacity-70">
                    —{String(i + 1).padStart(2, "0")}
                  </p>
                </div>
                <div className="md:col-span-11 max-w-3xl">
                  <p className="font-display text-xl sm:text-2xl font-black mb-3 leading-snug">
                    {c.label}
                  </p>
                  <p className="text-base opacity-85 leading-relaxed">
                    {c.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============================================
          MOT DE CLAVEL — humanisation
      ============================================ */}
      <section className="bg-vena-vert-eau border-b border-vena-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
          <p className="text-[10px] uppercase tracking-[0.3em] text-vena-text-dim mb-6">
            Qui est derrière VENA
          </p>
          <blockquote className="font-display text-2xl sm:text-4xl font-black text-vena-kaki leading-tight mb-6">
            « Avant VENA, j&apos;ai monté Velito Esport Amiens en 2022 pour
            organiser des tournois dans les quartiers. J&apos;ai codé le site,
            tourné les vidéos, monté le matos. À un moment, des structures m&apos;ont
            demandé si je pouvais bosser pour elles. VENA est née de ça. »
          </blockquote>
          <footer className="text-sm text-vena-text">
            <strong className="font-display font-black text-vena-kaki text-base">
              Clavel NDEMA MOUSSA
            </strong>
            <br />
            Président de VENA · Fondateur de Velito Esport Amiens · Amiens
          </footer>
        </div>
      </section>

      {/* ============================================
          ÉCOSYSTÈME VELITO — narratif
      ============================================ */}
      <section className="bg-white border-b border-vena-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
          <p className="text-[10px] uppercase tracking-[0.3em] text-vena-text-dim mb-3">
            L&apos;écosystème
          </p>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-vena-kaki leading-tight mb-6 max-w-3xl">
            VENA est une moitié. <br />
            L&apos;autre s&apos;appelle{" "}
            <span className="bg-vena-mauve px-2 inline-block">VEA</span>.
          </h2>
          <p className="text-base sm:text-lg text-vena-text leading-relaxed mb-6 max-w-2xl">
            Velito Esport Amiens, c&apos;est l&apos;asso loi 1901 qui a tout
            démarré. Tournois esport, animations dans les centres sociaux,
            prévention numérique, accompagnement de jeunes. On travaille en
            parallèle, on mutualise quand ça aide — terrain pour VEA, technique
            pour VENA.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <a
              href={VEA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-vena-kaki underline decoration-2 underline-offset-4 hover:text-vena-kaki-dark"
            >
              Voir VEA →
            </a>
            <a
              href={HUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-vena-text-muted underline decoration-2 underline-offset-4 hover:text-vena-kaki"
            >
              Voir l&apos;univers Velito complet →
            </a>
          </div>
        </div>
      </section>

      {/* ============================================
          CTA FINAL — direct, pas de blabla
      ============================================ */}
      <section className="bg-vena-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-24 text-center">
          <h2 className="font-display text-4xl sm:text-6xl font-black text-vena-kaki leading-tight mb-8">
            Tu as un projet.
            <br />
            On en parle ?
          </h2>
          <p className="text-base sm:text-lg text-vena-text mb-10 max-w-xl mx-auto">
            Site, vidéo, formation, location matos — ou un truc qui rentre dans
            aucune case. Tu décris, on répond sous 72h.
          </p>
          <Link
            href="/contact"
            className="btn-vena-primary text-base px-10 py-4"
          >
            Démarrer
          </Link>
        </div>
      </section>
    </>
  );
}
