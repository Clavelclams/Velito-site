/**
 * Page Association VEA — refonte DA claire (17/05/2026).
 *
 * Sections :
 *   - Hero
 *   - 3 cards (histoire / valeurs / vision)
 *   - Impact chiffres (cartes blanches)
 *   - Bureau executif + CA (via BureauSection)
 *   - Equipe operationnelle
 *   - Membres partenaires
 *   - Nos activites
 */
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import BureauSection from "@/components/BureauSection";

const VALUES = [
  { icon: "🏆", label: "Excellence & Performance" },
  { icon: "🤝", label: "Inclusion & Solidarite" },
  { icon: "📚", label: "Education & Prevention" },
  { icon: "💡", label: "Innovation Sociale" },
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
  {
    name: "Maya GOMBERT",
    role: "Responsable Administrative Junior",
    description:
      "Gestion administrative et tracabilite des activites de l'association (membre jeune engagee).",
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

const ACTIVITIES = [
  { title: "Tournois locaux", description: "Competitions ouvertes a tous sur EA FC, Clash Royale, SF6, Rocket League." },
  { title: "Pret de materiel", description: "Consoles, PC, ecrans mis a disposition lors des evenements et en centres sociaux." },
  { title: "Sensibilisation numerique", description: "Ateliers de prevention sur les usages du numerique et du jeu video." },
  { title: "Insertion professionnelle", description: "Accompagnement vers l'emploi via les metiers de l'esport et du digital." },
];

const IMPACT_STATS = [
  { value: "100+", label: "Jeunes accompagnes" },
  { value: "30+", label: "Evenements organises" },
  { value: "3e", label: "Place nationale SF6" },
  { value: "TOP 8", label: "INTERCUP 2026" },
  { value: "12+", label: "Partenaires actifs" },
  { value: "2022", label: "Depuis" },
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
              Plus qu&apos;un club de jeux video, un acteur social ancre a Amiens.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* 3 CARDS */}
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

      {/* IMPACT */}
      <section className="py-16 px-4 section-bg">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-10">
              <span className="badge-red mb-4">Notre Impact</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mt-4 mb-2">
                Les chiffres cles
              </h2>
              <p className="text-sm text-vea-text-muted">Depuis la creation, en 2022.</p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {IMPACT_STATS.map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 0.05}>
                <div className="card-clean p-5 text-center">
                  <span className="block text-2xl sm:text-3xl font-black text-vea-accent leading-none mb-2 whitespace-nowrap">
                    {stat.value}
                  </span>
                  <span className="text-[11px] text-vea-text-dim uppercase tracking-wider font-medium">
                    {stat.label}
                  </span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* BUREAU + CA via composant existant */}
      <BureauSection />

      {/* EQUIPE OPERATIONNELLE */}
      <section className="py-12 px-4 bg-vea-bg">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-vea-text mb-2">
                Equipe <span className="text-vea-accent">Operationnelle</span>
              </h2>
              <p className="text-sm text-vea-text-muted">
                Ceux qui font vivre VEA sur le terrain.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
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
                    {member.description && (
                      <p className="text-[11px] text-vea-text-muted mt-2 leading-relaxed">
                        {member.description}
                      </p>
                    )}
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* MEMBRES PARTENAIRES */}
      <section className="py-12 px-4">
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

      {/* NOS ACTIVITES */}
      <section className="py-16 px-4 section-bg">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-vea-text">
                Nos <span className="text-vea-accent">Activites</span>
              </h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {ACTIVITIES.map((act, i) => (
              <ScrollReveal key={act.title} delay={i * 0.1}>
                <div className="card-clean p-6 h-full">
                  <h3 className="text-base font-bold text-vea-text mb-2">{act.title}</h3>
                  <p className="text-sm text-vea-text-muted leading-relaxed">{act.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-vea-bg">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <div className="card-clean p-10 bg-vea-accent-soft border-vea-accent/15">
              <h2 className="text-2xl font-bold text-vea-text mb-4">
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
