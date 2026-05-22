/**
 * Page d'accueil VEA — refonte 22/05/2026.
 *
 * Objectif : une home qui convertit, claire et institutionnelle (audience =
 * mairie, partenaires, prospects), tout en gardant l'energie esport. DA fond
 * clair, accent rouge, photos humaines.
 *
 * Sections :
 *   1. HERO — texte gauche + photo droite + ligne de confiance
 *   2. STATS — 5 chiffres cles
 *   3. NOS ACTIONS — 4 piliers en cards avec photos
 *   4. RECONNAISSANCE — presse + resultats nationaux + soutien public.
 *      Remplace l'ancienne section "Nos terrains" (doublon avec /partenaires).
 *   5. CTA — bandeau accent rouge soft
 *
 * Server Component par defaut. ScrollReveal et CountUp sont "use client".
 */
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import CountUp from "@/components/CountUp";

// 5 cards stats sur la home — toutes tiennent sur 1 ligne en desktop.
// Detail complet dans /association#impact via ImpactCards.
const HERO_PHOTOS = [
  "/images/events/pilier-tournoi-public.jpg",
  "/images/events/mq-ffjv-dos.jpg",
  "/images/events/new-sf6-warpzone-floute.jpg",
  "/images/events/mq-sim-course-dos.jpg",
  "/images/events/mq-floral-rollup.jpg",
  "/images/events/mq-ljsdlp-public.jpg",
  "/images/events/mq-gt7-sim.jpg",
  "/images/events/new-tiqe-corner-floute.jpg",
  "/images/events/mq-mariokart-salle.jpg",
  "/images/events/mq-fifa-canape.jpg",
  "/images/events/mq-floral-sim.jpg",
  "/images/events/pilier-prevention.jpg",
];

// 2e rangee du bandeau : AUTRES photos esport (differentes de la 1re rangee).
const HERO_PHOTOS_2 = [
  "/images/events/sf6-warpzone-2024.jpg",
  "/images/events/tiqe-final-corner-2024.jpg",
  "/images/events/tiqe-vainqueurs-ps5-2024.jpg",
  "/images/events/ljsdlp-2025-sim-mariokart-01.jpg",
  "/images/events/new-tiqe-elbeuf-floute.jpg",
  "/images/events/gallery-soiree-rollup-vea.jpg",
  "/images/events/new-rocket-laptop-floute.jpg",
  "/images/events/ljsdlp-2025-public-ea-fc.jpg",
  "/images/events/new-tiqe-sud-floute.jpg",
  "/images/events/gallery-soiree-trois-joueurs.jpg",
  "/images/events/happy-eid-2022-public-terrain-basket.jpg",
  "/images/events/new-gymnase-grdf-floute.jpg",
];

const STATS = [
  { value: 3686, suffix: " h", label: "Benevolat valorise", separator: true },
  { value: 300, suffix: "+", label: "Jeunes accompagnes" },
  { value: 20, suffix: "+", label: "Evenements organises" },
  { value: 3, suffix: "e", label: "Place nationale 2024" },
  { value: 2022, suffix: "", label: "Annee de fondation" },
];

const ACTIONS = [
  {
    title: "Tournois & compétitions",
    description:
      "Organiser des compétitions esport locales accessibles à tous les niveaux, du débutant au confirmé.",
    image: "/images/events/pilier-tournoi-public.jpg",
  },
  {
    title: "Insertion & formation",
    description:
      "Utiliser le jeu vidéo comme tremplin vers l'emploi et la formation professionnelle.",
    image: "/images/events/atelier-jeux-video.jpg",
  },
  {
    title: "Réduction de la fracture numérique",
    description:
      "Rendre le numérique accessible dans les quartiers prioritaires grâce au prêt de matériel et aux ateliers.",
    image: "/images/events/pilier-pc-rgb.jpg",
  },
  {
    title: "Prévention numérique",
    description:
      "Sensibiliser les jeunes et les familles aux risques liés aux écrans, aux jeux d'argent et à l'addiction.",
    image: "/images/events/pilier-prevention.jpg",
  },
];

const HELLOASSO_URL =
  "https://www.helloasso.com/associations/velito-esport-amiens/adhesions/adhesion-2026";

export default function HomePage() {
  return (
    <>
      {/* HERO — titre une ligne + bandeau "monde de photos" qui defile + liens.
          DA editoriale : pas de carte, pas de gros boutons (liens texte). */}
      <section className="hero-bg-full pt-28 lg:pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 mb-10">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight text-vea-text max-w-4xl">
            L&apos;<span className="text-vea-accent">e</span>sport, un{" "}
            <span className="text-vea-accent">monde</span> qui rassemble
          </h1>
          <p className="text-sm italic text-vea-text-muted mt-4">
            Association loi 1901 · Soutenue par le FDVA · 300+ jeunes
            accompagnés
          </p>
        </div>

        {/* Le "monde" de photos : 2 rangees qui defilent en sens opposes */}
        <div className="space-y-3 sm:space-y-4">
          <div className="marquee-row">
            <div className="marquee-track marquee-left">
              {[...HERO_PHOTOS, ...HERO_PHOTOS].map((src, i) => (
                <img
                  key={`a${i}`}
                  src={src}
                  alt=""
                  loading="lazy"
                  className="h-40 sm:h-48 w-56 sm:w-72 mr-3 sm:mr-4 rounded-xl object-cover grayscale hover:grayscale-0 transition-all duration-500 flex-shrink-0"
                />
              ))}
            </div>
          </div>
          <div className="marquee-row">
            <div className="marquee-track marquee-right">
              {[...HERO_PHOTOS_2, ...HERO_PHOTOS_2].map((src, i) => (
                <img
                  key={`b${i}`}
                  src={src}
                  alt=""
                  loading="lazy"
                  className="h-40 sm:h-48 w-56 sm:w-72 mr-3 sm:mr-4 rounded-xl object-cover grayscale hover:grayscale-0 transition-all duration-500 flex-shrink-0"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Descriptif court + liens (pas de gros boutons) */}
        <div className="max-w-7xl mx-auto px-4 mt-10">
          <p className="text-base sm:text-lg text-vea-text-muted max-w-2xl leading-relaxed">
            Velito Esport Amiens transforme le gaming en levier concret
            d&apos;inclusion : lien social, insertion et talents qui émergent
            dans les quartiers prioritaires d&apos;Amiens, depuis 2022.
          </p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-5">
            <Link
              href="/inscription"
              className="group inline-flex items-center gap-1.5 text-sm font-bold text-vea-accent"
            >
              Nous rejoindre
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
            <Link
              href="/association"
              className="group inline-flex items-center gap-1.5 text-sm font-bold text-vea-text hover:text-vea-accent transition-colors"
            >
              Decouvrir nos actions
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* STATS — barre editoriale a plat : filets haut/bas, pas de cards (DA VEA) */}
      <section className="py-16 px-4 bg-vea-bg">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-10 border-y border-vea-border py-12">
            {STATS.map((stat, i) => (
              <ScrollReveal
                key={stat.label}
                delay={i * 0.08}
                className="text-center px-2"
              >
                <p className="stat-number">
                  <CountUp
                    end={stat.value}
                    suffix={stat.suffix}
                    separator={"separator" in stat ? stat.separator : false}
                    duration={2}
                  />
                </p>
                <p className="text-xs sm:text-sm text-vea-text-dim uppercase tracking-wider font-medium mt-2">
                  {stat.label}
                </p>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.4}>
            <div className="text-center mt-10">
              <Link
                href="/association?expand=benevolat#impact"
                className="btn-outline text-sm"
              >
                Voir le detail des chiffres &rarr;
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* RECONNAISSANCE — bande editoriale (pas de cards : anti-generique).
          Barre presse en strip + 2 faits forts en grande typo separes par un
          trait vertical. Plus institutionnel qu'une grille de cartes blanches. */}
      <section className="py-20 lg:py-28 px-4 hero-bg">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="max-w-2xl mb-14">
              <span className="badge-red mb-4">Reconnaissance</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-vea-text leading-tight">
                Une asso prise au{" "}
                <span className="text-vea-accent">sérieux</span>
              </h2>
            </div>
          </ScrollReveal>

          {/* Barre presse : noms medias en strip, sans card */}
          <ScrollReveal delay={0.1}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-10 py-6 border-y border-vea-border mb-14">
              <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-vea-text-dim shrink-0">
                Ils parlent de nous
              </span>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                {[
                  {
                    name: "Gazette Sports",
                    url: "https://gazettesports.fr/?s=velito+esport",
                  },
                  {
                    name: "Courrier Picard",
                    url: "https://www.courrier-picard.fr/archives/recherche?word=velito+esport&sort=date+desc&datefilter=lastyear",
                  },
                  {
                    name: "France Bleu Picardie",
                    url: "https://www.ici.fr/emissions/place-aux-jeunes/l-esport-ce-n-est-pas-que-pour-les-jeunes-7732041",
                  },
                ].map((media) => (
                  <a
                    key={media.name}
                    href={media.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg sm:text-xl font-bold text-vea-text/60 hover:text-vea-accent transition-colors"
                  >
                    {media.name}
                  </a>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* 2 faits forts, typographie large, separes par un trait — pas de cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-0">
            <ScrollReveal delay={0.15}>
              <div className="md:pr-14">
                <p className="text-xs uppercase tracking-[0.2em] text-vea-accent font-bold mb-4">
                  Sur les scènes nationales
                </p>
                <p className="text-2xl sm:text-3xl font-black text-vea-text leading-tight">
                  3<sup>e</sup> de France en Street Fighter 6
                </p>
                <p className="text-lg font-bold text-vea-text-muted mt-1 mb-4">
                  TOP 8 — INTERCUP 2026, Courbevoie
                </p>
                <p className="text-sm text-vea-text-muted leading-relaxed">
                  La plus grande délégation amiénoise, dont 4 joueuses, sur une
                  compétition nationale.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="md:pl-14 md:border-l border-vea-border">
                <p className="text-xs uppercase tracking-[0.2em] text-vea-accent font-bold mb-4">
                  Soutien public
                </p>
                <p className="text-2xl sm:text-3xl font-black text-vea-text leading-tight">
                  Financée par le FDVA depuis 2024
                </p>
                <p className="text-lg font-bold text-vea-text-muted mt-1 mb-4">
                  Référencée grille Mairie d&apos;Amiens
                </p>
                <p className="text-sm text-vea-text-muted leading-relaxed">
                  Reconnaissance d&apos;utilité sociale et ancrage territorial
                  validés.
                </p>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={0.25}>
            <div className="mt-14">
              <Link
                href="/esport"
                className="text-sm font-bold text-vea-accent hover:underline inline-flex items-center gap-1"
              >
                Voir nos resultats et la presse &rarr;
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* NOS ACTIONS */}
      <section className="hero-bg py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="badge-red mb-4">Nos 4 piliers</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-vea-text mb-3">
                Ce que VEA fait au quotidien
              </h2>
              <p className="text-vea-text-muted text-sm max-w-xl mx-auto">
                Quatre missions concretes, ancrees dans les quartiers et aupres
                des jeunes d&apos;Amiens.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {ACTIONS.map((action, i) => (
              <ScrollReveal key={action.title} delay={i * 0.08} className="group">
                <div className="relative h-44 w-full overflow-hidden rounded-xl bg-vea-bg mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={action.image}
                    alt={action.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                {/* Numero editorial sobre (plus de pastille rouge sur la photo) :
                    chiffre gris + filet, coherent avec le reste du site. */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="editorial-figure text-base text-vea-text-dim tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span aria-hidden="true" className="h-px flex-1 bg-vea-border group-hover:bg-vea-accent/40 transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-vea-text mb-1.5 group-hover:text-vea-accent transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-vea-text-muted leading-relaxed">
                  {action.description}
                </p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final — bande rosé doux harmonisee avec le site (plus de gros
          aplat rouge qui jure). Le rouge reste sur le mot-cle et le bouton. */}
      <section className="bg-vea-accent-soft py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[0.95] tracking-tight mb-5 text-vea-text">
              Rejoins l&apos;aventure <span className="text-vea-accent">VEA</span>
            </h2>
            <p className="text-vea-text-muted text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-9">
              Joueur, bénévole, partenaire ou simple curieux — il y a une place
              pour chacun. Le terrain commence ici.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link href="/inscription" className="btn-primary">
                S&apos;inscrire à un événement
              </Link>
              <a
                href={HELLOASSO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline"
              >
                Devenir membre
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
