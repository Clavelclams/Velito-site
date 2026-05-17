/**
 * Page d'accueil VEA — REFONTE FOND CLAIR (16/05/2026).
 *
 * Inspiration : mabb.fr (sobre, photo humaine au hero, stats lisibles,
 * piliers en cards, partenaires en bas) + france-esports.org.
 *
 * Sections :
 *   1. HERO — texte gauche + photo placeholder droite
 *   2. STATS — 4 cards blanches simples avec chiffre rouge VEA
 *   3. NOS ACTIONS — 4 piliers en cards claires
 *   4. NOS TERRAINS — structures ou je suis prestataire (centres sociaux,
 *      structures jeunesse, partenaires QPV). Source : rapport reseaux
 *      sociaux + debrief 12/05 + base Notion VEA Bilan Activites.
 *   5. CTA — bandeau accent rouge soft pour finir
 *
 * Server Component par defaut. ScrollReveal et CountUp sont "use client".
 */
import Link from "next/link";
import Image from "next/image";
import ScrollReveal from "@/components/ScrollReveal";
import CountUp from "@/components/CountUp";

const STATS = [
  { value: 100, suffix: "+", label: "Jeunes accompagnes" },
  { value: 20, suffix: "+", label: "Evenements organises" },
  { value: 3, suffix: "e", label: "Place nationale 2024" },
  { value: 2022, suffix: "", label: "Annee de fondation" },
];

const ACTIONS = [
  {
    title: "Tournois & Competitions",
    description:
      "Organiser des competitions esport locales accessibles a tous les niveaux, du debutant au confirme.",
    icon: "🏆",
  },
  {
    title: "Insertion & Formation",
    description:
      "Utiliser le jeu video comme tremplin vers l'emploi et la formation professionnelle.",
    icon: "🎯",
  },
  {
    title: "Reduction fracture numerique",
    description:
      "Rendre le numerique accessible dans les quartiers prioritaires grace au pret de materiel et aux ateliers.",
    icon: "💻",
  },
  {
    title: "Prevention numerique",
    description:
      "Sensibiliser les jeunes et les familles aux risques lies aux ecrans, aux jeux d'argent et a l'addiction.",
    icon: "🛡️",
  },
];

/**
 * Mes terrains d'intervention — structures aupres desquelles VEA intervient
 * en tant que prestataire ou partenaire recurrent. Documentes via la base
 * Notion "VEA Bilan Activites" + rapport reseaux sociaux 2023-2026 + debrief
 * strategique 12/05/2026.
 *
 * Choix editorial : je ne nomme pas les dispositifs ("Rec en action", "TIQE")
 * mais directement les LIEUX physiques ou les jeunes m'attendent. C'est plus
 * concret pour un visiteur qui ne connait pas les dispositifs administratifs.
 */
const TERRAINS = [
  // Centres sociaux d'Amiens (intervention recurrente)
  { name: "Centre social Tour du Marais", secteur: "Etouvie" },
  { name: "Centre social Elbeuf", secteur: "Saint-Just" },
  { name: "Centre social Moxy", secteur: "Saint-Acheul" },
  { name: "Centre social L'Albatros", secteur: "Amiens" },
  { name: "Centre social Marcel Paul", secteur: "Amiens Nord" },
  { name: "Centre social Salamandre", secteur: "Amiens Nord" },
  { name: "Centre social Pierre Rollin", secteur: "Amiens Nord" },
  { name: "La Pleiade", secteur: "Pigeonnier" },
  // Structures jeunesse / culture
  { name: "Etoile du Sud", secteur: "Centre culturel" },
  { name: "Cite Educative d'Amiens", secteur: "Nord + Etouvie" },
  // Partenaires institutionnels recurrents
  { name: "APSL 80", secteur: "Profession Sport & Loisirs (Rec en action)" },
  { name: "Jeunesse en Or", secteur: "Convention colocation" },
];

const HELLOASSO_URL =
  "https://www.helloasso.com/associations/velito-esport-amiens/adhesions/adhesion-2026";

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="hero-bg-full pt-24 pb-16 lg:pt-32 lg:pb-24 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <ScrollReveal delay={0.05}>
              <span className="badge-red mb-6">
                Association Esport &amp; Inclusion
              </span>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6 text-vea-text">
                Le jeu video
                <br />
                <span className="text-vea-accent">comme moteur</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <p className="text-base sm:text-lg text-vea-text-muted max-w-xl mb-10 leading-relaxed">
                Velito Esport Amiens utilise le gaming pour creer du lien
                social, favoriser l&apos;insertion et faire briller les
                talents locaux. Une association d&apos;inclusion ancree
                dans les quartiers d&apos;Amiens depuis 2022.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Link href="/inscription" className="btn-primary">
                  Nous rejoindre
                </Link>
                <Link href="/association" className="btn-outline">
                  Decouvrir nos actions
                </Link>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={0.2}>
            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-vea-border shadow-card-soft">
              <Image
                src="/images/events/hero-event-animation.jpg"
                alt="Animation VEA — soiree evenement avec micro et PS5, ambiance gaming convivial pour les jeunes d'Amiens"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 px-4 bg-vea-bg">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 0.08}>
                <div className="card-clean p-6 text-center">
                  <p className="stat-number">
                    <CountUp end={stat.value} suffix={stat.suffix} duration={2} />
                  </p>
                  <p className="text-xs sm:text-sm text-vea-text-dim uppercase tracking-wider font-medium mt-3">
                    {stat.label}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* NOS ACTIONS */}
      <section className="section-bg py-20 px-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ACTIONS.map((action, i) => (
              <ScrollReveal key={action.title} delay={i * 0.08}>
                <div className="card-clean p-6 h-full group">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-vea-accent-soft border border-vea-accent/15">
                    <span className="text-xl">{action.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-vea-text mb-2 group-hover:text-vea-accent transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-vea-text-muted leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* NOS TERRAINS D'INTERVENTION */}
      <section className="py-20 px-4 bg-vea-bg">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="badge-red mb-4">Sur le terrain</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-vea-text mb-3">
                Nos terrains d&apos;intervention
              </h2>
              <p className="text-vea-text-muted text-sm max-w-xl mx-auto">
                Structures aupres desquelles VEA intervient en tant que
                prestataire ou partenaire recurrent, dans les quartiers
                prioritaires d&apos;Amiens et au-dela.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TERRAINS.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 0.04}>
                <div className="card-accent-left p-4 h-full">
                  <h3 className="text-sm font-bold text-vea-text leading-tight">
                    {t.name}
                  </h3>
                  <p className="text-xs text-vea-text-dim mt-1">
                    {t.secteur}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <p className="text-xs text-vea-text-dim text-center mt-8">
              Liste non exhaustive — voir{" "}
              <Link href="/agenda" className="text-vea-accent hover:underline">
                l&apos;agenda complet
              </Link>{" "}
              pour l&apos;historique detaille de toutes nos actions.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 section-bg">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="card-clean p-10 sm:p-14 text-center bg-vea-accent-soft border-vea-accent/15">
              <h2 className="text-3xl sm:text-4xl font-bold text-vea-text mb-4">
                Rejoins <span className="text-vea-accent">VEA</span>
              </h2>
              <p className="text-vea-text-muted mb-8 max-w-lg mx-auto leading-relaxed">
                Participe aux evenements, integre une equipe, ou soutiens le
                projet. Chaque profil compte — joueur, benevole, partenaire,
                curieux.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/inscription" className="btn-primary">
                  S&apos;inscrire a un evenement
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
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
