/**
 * Page Association VEA — refonte DA claire (17/05/2026 v2).
 *
 * Chantier 1 — enrichissement contenu :
 *   - Vraies stats impact (3 686 h benevoles, 43 800 € classe 8, 30+ activites,
 *     5 quartiers QPV, FDVA depuis 2024) — source : debrief 12/05/2026 + Notion.
 *   - Section "Notre methode" en 3 paragraphes (esport outil pas fin,
 *     QPV chaque semaine pas one-shot, competition + education se completent).
 *   - Bureau 11 membres incluant Maya GOMBERT (membre jeune engagee).
 *
 * Sections :
 *   1. Hero "Qui sommes-nous ?"
 *   2. 3 cards (histoire / valeurs / vision)
 *   3. Notre methode (3 paragraphes)
 *   4. Notre impact (chiffres reels)
 *   5. Bureau executif + CA + Maya (via BureauSection)
 *   6. Equipe operationnelle
 *   7. Membres partenaires
 *   8. CTA rejoindre
 */
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import BureauSection from "@/components/BureauSection";
import ImpactCards from "@/components/ImpactCards";

const VALUES = [
  { icon: "🏆", label: "Excellence & Performance" },
  { icon: "🤝", label: "Inclusion & Solidarite" },
  { icon: "📚", label: "Education & Prevention" },
  { icon: "💡", label: "Innovation Sociale" },
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
  description?: string;
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

interface PartnerOrg {
  name: string;
  role: string;
}

const PARTNER_ORGS: PartnerOrg[] = [
  { name: "VENA", role: "Prestataire numerique" },
  { name: "MABB", role: "Pole animation et logistique" },
  { name: "Jeunesse en Or", role: "Pole educatif" },
];


export default function AssociationPage() {
  return (
    <>
      {/* HERO */}
      <section className="hero-bg pt-28 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <span className="badge-red mb-4">Qui sommes-nous</span>
            <h1 className="text-4xl sm:text-5xl font-black text-vea-text mb-4 mt-4">
              L&apos;<span className="text-vea-accent">Association</span>
            </h1>
            <p className="text-base text-vea-text-muted max-w-2xl mx-auto">
              Velito Esport Amiens — association loi 1901 fondee en 2022, dediee a
              l&apos;inclusion par l&apos;esport dans les quartiers prioritaires d&apos;Amiens.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* 3 CARDS — Histoire / Valeurs / Vision */}
      <section className="py-16 px-4 bg-vea-bg">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <ScrollReveal delay={0}>
            <div className="card-clean p-7 h-full">
              <h2 className="text-lg font-bold text-vea-accent mb-3">Notre Histoire</h2>
              <p className="text-sm text-vea-text-muted leading-relaxed">
                Fondee en novembre 2022 a Amiens (RNA : W802018363), VEA structure la
                pratique du jeu video amateur. Rapidement, l&apos;esport est devenu un
                outil d&apos;inclusion, d&apos;education et de mixite sociale dans les
                quartiers prioritaires.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="card-clean p-7 h-full">
              <h2 className="text-lg font-bold text-vea-accent mb-3">Nos Valeurs</h2>
              <ul className="space-y-2">
                {VALUES.map((v) => (
                  <li key={v.label} className="flex items-center gap-2 text-sm text-vea-text-muted">
                    <span>{v.icon}</span>
                    <span>{v.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="card-clean p-7 h-full">
              <h2 className="text-lg font-bold text-vea-accent mb-3">Notre Vision</h2>
              <p className="text-sm text-vea-text-muted leading-relaxed">
                Faire d&apos;Amiens une place forte de l&apos;esport responsable. Un
                ecosysteme ou le joueur est accompagne, les parents rassures, et les
                talents peuvent eclore sereinement.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* NOTRE METHODE */}
      <section className="py-16 px-4 section-bg">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-10">
              <span className="badge-red mb-4">Notre approche</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mt-4 mb-2">
                Notre <span className="text-vea-accent">methode</span>
              </h2>
              <p className="text-sm text-vea-text-muted max-w-2xl mx-auto">
                Ce qui distingue VEA des autres structures esport : une approche
                construite sur la duree, pas sur l&apos;evenementiel.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {METHODE.map((m, i) => (
              <ScrollReveal key={m.title} delay={i * 0.08}>
                <div className="card-clean p-6 h-full border-l-4 border-vea-accent">
                  <h3 className="text-base font-bold text-vea-text mb-3 leading-tight">
                    {m.title}
                  </h3>
                  <p className="text-sm text-vea-text-muted leading-relaxed">{m.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* NOTRE IMPACT — chiffres reels */}
      <section className="py-16 px-4 bg-vea-bg">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-10">
              <span className="badge-red mb-4">Notre Impact</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mt-4 mb-2">
                Les <span className="text-vea-accent">chiffres reels</span>
              </h2>
              <p className="text-sm text-vea-text-muted max-w-xl mx-auto">
                Donnees consolidees sur 3 saisons (2022-2025) + saison 2025/2026 en cours.
                Source : base d&apos;activites VEA, debrief strategique mai 2026.
              </p>
            </div>
          </ScrollReveal>
          <ImpactCards />
          <ScrollReveal>
            <p className="text-xs text-vea-text-dim text-center mt-8 max-w-2xl mx-auto leading-relaxed">
              Le benevolat valorise correspond a la classe 8 du Plan Comptable Associatif
              (PCA). Sur 3 saisons, le travail benevole represente plus que le budget
              total de l&apos;association — co-financement par engagement collectif quantifie.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* BUREAU + CA + Maya */}
      <BureauSection />

      {/* EQUIPE OPERATIONNELLE */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-vea-text mb-2">
                Equipe <span className="text-vea-accent">Operationnelle</span>
              </h2>
              <p className="text-sm text-vea-text-muted">
                Ceux qui font vivre VEA sur le terrain au quotidien.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            {EQUIPE_OPERATIONNELLE.map((member, i) => {
              const initials = member.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
              return (
                <ScrollReveal key={member.name} delay={i * 0.1}>
                  <div className="card-clean p-6 text-center">
                    <div className="w-14 h-14 bg-vea-accent-soft border border-vea-accent/15 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <span className="text-vea-accent text-sm font-bold">{initials}</span>
                    </div>
                    <h3 className="text-sm font-bold text-vea-text">{member.name}</h3>
                    <p className="text-xs text-vea-accent mt-1 font-medium">{member.role}</p>
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

      {/* MEMBRES PARTENAIRES */}
      <section className="py-12 px-4 bg-vea-bg">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2 className="text-xl sm:text-2xl font-bold text-vea-text mb-6 text-center">
              Membres <span className="text-vea-accent">Partenaires</span>
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {PARTNER_ORGS.map((org, i) => (
              <ScrollReveal key={org.name} delay={i * 0.1}>
                <div className="card-clean p-5 text-center">
                  <div className="w-12 h-12 bg-vea-accent-soft rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-vea-accent text-sm font-bold">{org.name[0]}</span>
                  </div>
                  <h3 className="text-sm font-bold text-vea-text">{org.name}</h3>
                  <p className="text-xs text-vea-text-muted mt-1">{org.role}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 section-bg">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <div className="card-clean p-10 bg-vea-accent-soft border-vea-accent/15">
              <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mb-4">
                Envie de nous <span className="text-vea-accent">rejoindre</span> ?
              </h2>
              <p className="text-sm text-vea-text-muted mb-6 max-w-lg mx-auto">
                Joueur, benevole, partenaire, curieux — il y a une place pour chacun.
              </p>
              <Link href="/inscription" className="btn-primary">S&apos;inscrire</Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
