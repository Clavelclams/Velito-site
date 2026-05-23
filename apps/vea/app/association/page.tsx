/**
 * Page Association VEA — refonte DA editoriale (22/05/2026 v3).
 *
 * Alignee sur la DA de l'accueil : plus de cards blanches flottantes.
 * Blocs editoriaux (.panel-accent, filet chaud), sur-titres .kicker,
 * alternance de fonds (hero-bg rose / bg-vea-bg / section-bg / accent-soft),
 * gros titres font-black, le rouge reserve a la ponctuation.
 *
 * Sections : Hero / Histoire-Valeurs-Vision / Methode / Impact /
 * Bureau (BureauSection) / Equipe operationnelle / Membres partenaires / CTA.
 */
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import BureauSection from "@/components/BureauSection";
import ImpactCards from "@/components/ImpactCards";

const VALUES = [
  "Excellence & Performance",
  "Inclusion & Solidarite",
  "Education & Prevention",
  "Innovation Sociale",
];

const METHODE = [
  {
    title: "L'esport comme outil, pas comme fin",
    body:
      "Le jeu video est notre porte d'entree, jamais notre objectif final. Ce qui nous interesse, c'est le lien social qu'il cree, l'inclusion qu'il rend possible, et les talents qu'il revele. Une manette ouvre une discussion, un tournoi rassemble un quartier, une victoire individuelle devient une fierte collective.",
  },
  {
    title: "Le terrain, chaque semaine, pas en one-shot",
    body:
      "Nous intervenons dans les quartiers prioritaires d'Amiens de maniere reguliere, pas occasionnelle. Mercredis a Elbeuf et Moxy, vacances dans les centres sociaux Marcel Paul, Salamandre et Pierre Rollin, animations a la Pleiade et a Etouvie. La duree fait la difference : on construit une relation, on suit les jeunes dans le temps.",
  },
  {
    title: "Competition et education se completent",
    body:
      "VEA n'oppose pas la performance a la transmission. Nos tournois ouvrent la voie a la prevention numerique ; nos ateliers d'inclusion forment la prochaine generation de joueurs serieux. Pinh 3e France en SF6 et l'INTERCUP 2026 Top 8 sont nes du meme terrain QPV. La competition donne une raison de revenir ; l'education donne une raison de rester.",
  },
];

interface OperationalMember {
  name: string;
  role: string;
  pseudo?: string;
  agency?: { name: string; href: string };
}

const EQUIPE_OPERATIONNELLE: OperationalMember[] = [
  {
    name: "Berstelien MILAPIE",
    role: "Community Manager",
    pseudo: "Nesquiik (LNSK)",
    agency: { name: "EB2C Vision", href: "https://www.instagram.com/eb2cvision/" },
  },
  {
    name: "Tony TAGOE",
    role: "Responsable Partenariats & Subventions",
    pseudo: "Chewing Gum",
  },
];

const PARTNER_ORGS = [
  { name: "VENA", role: "Prestataire numerique" },
  { name: "MABB", role: "Pole animation et logistique" },
  { name: "Jeunesse en Or", role: "Pole educatif" },
];

const PILIERS = [
  {
    k: "Notre Histoire",
    body:
      "Fondee en novembre 2022 a Amiens (RNA W802018363), VEA structure la pratique du jeu video amateur. Tres vite, l'esport est devenu un outil d'inclusion, d'education et de mixite sociale dans les quartiers prioritaires.",
  },
  {
    k: "Notre Vision",
    body:
      "Faire d'Amiens une place forte de l'esport responsable. Un ecosysteme ou le joueur est accompagne, les parents rassures, et les talents peuvent eclore sereinement.",
  },
] as const;

export default function AssociationPage() {
  return (
    <>
      {/* HERO — pas de ScrollReveal au-dessus de la ligne de flottaison */}
      <section className="hero-bg pt-28 pb-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="kicker mb-4 block">Qui sommes-nous</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-vea-text leading-[1.05] tracking-tight mb-5">
            L&apos;<span className="text-vea-accent">association</span>
          </h1>
          <p className="text-base sm:text-lg text-vea-text-muted max-w-2xl mx-auto leading-relaxed">
            Velito Esport Amiens — association loi 1901 fondee en 2022, dediee a
            l&apos;inclusion par l&apos;esport dans les quartiers prioritaires d&apos;Amiens.
          </p>
        </div>
      </section>

      {/* HISTOIRE / VALEURS / VISION — blocs editoriaux, pas de cards blanches */}
      <section className="py-20 px-4 bg-vea-bg">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-12">
          <ScrollReveal delay={0}>
            <div className="panel-accent h-full">
              <h2 className="text-lg font-black text-vea-text mb-3">{PILIERS[0].k}</h2>
              <p className="text-sm text-vea-text-muted leading-relaxed">{PILIERS[0].body}</p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.08}>
            <div className="panel-accent h-full">
              <h2 className="text-lg font-black text-vea-text mb-3">Nos valeurs</h2>
              <ul className="space-y-2.5">
                {VALUES.map((v) => (
                  <li key={v} className="flex items-center gap-2.5 text-sm text-vea-text-muted">
                    <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-vea-accent flex-shrink-0" />
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.16}>
            <div className="panel-accent h-full">
              <h2 className="text-lg font-black text-vea-text mb-3">{PILIERS[1].k}</h2>
              <p className="text-sm text-vea-text-muted leading-relaxed">{PILIERS[1].body}</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* METHODE — blocs numerotes editoriaux */}
      <section className="py-20 px-4 section-bg">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="mb-12 max-w-2xl">
              <span className="kicker mb-3 block">Notre approche</span>
              <h2 className="text-3xl sm:text-4xl font-black text-vea-text leading-tight mb-3">
                Notre <span className="text-vea-accent">methode</span>
              </h2>
              <p className="text-sm sm:text-base text-vea-text-muted leading-relaxed">
                Ce qui distingue VEA des autres structures esport : une approche
                construite sur la duree, pas sur l&apos;evenementiel.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-10 gap-y-12">
            {METHODE.map((m, i) => (
              <ScrollReveal key={m.title} delay={i * 0.08}>
                <div className="panel-accent h-full">
                  <span className="editorial-figure text-3xl text-vea-text-dim block mb-3">
                    0{i + 1}
                  </span>
                  <h3 className="text-base font-black text-vea-text mb-3 leading-tight">{m.title}</h3>
                  <p className="text-sm text-vea-text-muted leading-relaxed">{m.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* IMPACT — chiffres reels (ancre #impact) */}
      <section id="impact" className="py-20 px-4 bg-vea-bg scroll-mt-24">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="mb-10 max-w-2xl">
              <span className="kicker mb-3 block">Notre impact</span>
              <h2 className="text-3xl sm:text-4xl font-black text-vea-text leading-tight mb-3">
                Les <span className="text-vea-accent">chiffres reels</span>
              </h2>
              <p className="text-sm text-vea-text-muted leading-relaxed">
                Donnees consolidees sur 3 saisons (2022-2025) + saison 2025/2026 en cours.
                Source : base d&apos;activites VEA, debrief strategique mai 2026.
              </p>
            </div>
          </ScrollReveal>
          <ImpactCards />
          <ScrollReveal>
            <p className="text-xs text-vea-text-dim mt-8 max-w-2xl leading-relaxed">
              Le benevolat valorise correspond a la classe 8 du Plan Comptable Associatif
              (PCA). Sur 3 saisons, le travail benevole represente plus que le budget total
              de l&apos;association — co-financement par engagement collectif quantifie.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* BUREAU + CA + Maya */}
      <BureauSection />

      {/* EQUIPE OPERATIONNELLE — lignes editoriales */}
      <section className="py-16 px-4 hero-bg">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="mb-8 text-center">
              <span className="kicker mb-3 block">Sur le terrain</span>
              <h2 className="text-2xl sm:text-3xl font-black text-vea-text">
                Equipe <span className="text-vea-accent">operationnelle</span>
              </h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8 max-w-2xl mx-auto">
            {EQUIPE_OPERATIONNELLE.map((member, i) => {
              const initials = member.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
              return (
                <ScrollReveal key={member.name} delay={i * 0.1}>
                  <div className="panel-accent h-full">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-vea-accent text-sm font-black tracking-wide">{initials}</span>
                      <h3 className="text-sm font-black text-vea-text">{member.name}</h3>
                    </div>
                    <p className="text-xs text-vea-accent font-semibold">{member.role}</p>
                    {member.pseudo && (
                      <p className="text-[11px] text-vea-text-dim mt-1">Pseudo : {member.pseudo}</p>
                    )}
                    {member.agency && (
                      <a
                        href={member.agency.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-[11px] text-vea-text-muted hover:text-vea-accent transition-colors"
                      >
                        {member.agency.name} ↗
                      </a>
                    )}
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* MEMBRES PARTENAIRES — liste editoriale */}
      <section className="py-16 px-4 section-bg">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="mb-8 text-center">
              <span className="kicker mb-3 block">Ecosysteme</span>
              <h2 className="text-2xl sm:text-3xl font-black text-vea-text">
                Membres <span className="text-vea-accent">partenaires</span>
              </h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-8 max-w-3xl mx-auto">
            {PARTNER_ORGS.map((org, i) => (
              <ScrollReveal key={org.name} delay={i * 0.1}>
                <div className="panel-accent h-full">
                  <h3 className="text-base font-black text-vea-text">{org.name}</h3>
                  <p className="text-xs text-vea-text-muted mt-1">{org.role}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — bandeau plein, pas de card blanche */}
      <section className="bg-vea-accent-soft py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-4xl sm:text-5xl font-black text-vea-text leading-[0.95] tracking-tight mb-5">
              Envie de nous <span className="text-vea-accent">rejoindre</span> ?
            </h2>
            <p className="text-base text-vea-text-muted mb-8 max-w-lg mx-auto leading-relaxed">
              Joueur, benevole, partenaire, curieux — il y a une place pour chacun.
            </p>
            <Link href="/inscription" className="btn-primary">S&apos;inscrire</Link>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
