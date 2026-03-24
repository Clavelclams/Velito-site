/**
 * Page Association VEA — REFONTE VIOLET + ROUGE + MOTION
 * Hero + 3 cards (histoire/valeurs/vision) + bureau + CA + partenaires + activités
 */
import ScrollReveal from "@/components/ScrollReveal";
import BureauSection from "@/components/BureauSection";

const VALUES = [
  { icon: "🏆", label: "Excellence & Performance" },
  { icon: "🤝", label: "Inclusion & Solidarité" },
  { icon: "📚", label: "Éducation & Prévention" },
  { icon: "💡", label: "Innovation Sociale" },
];

interface Member {
  name: string;
  role: string;
}

const BUREAU: Member[] = [
  { name: "Clavel NDEMA MOUSSA", role: "Président" },
  { name: "Anthony DUPONT", role: "Vice-Président" },
  { name: "Alban THIERRY", role: "Vice-Président Adjoint" },
  { name: "Christ-David KPADAN", role: "Trésorier" },
  { name: "Celyan AIT HAMOU", role: "Trésorier Adjoint" },
  { name: "GBAKRE Judith", role: "Secrétaire" },
  { name: "Cathia DETRE", role: "Secrétaire Adjointe" },
];

const CA: Member[] = [
  { name: "Arthur FOSSIER", role: "Administrateur CA" },
  { name: "Antoine DAVID", role: "Administrateur CA" },
  { name: "Noha PARMENTIER", role: "Administrateur CA" },
];

interface OperationalMember {
  name: string;
  role: string;
  pseudo?: string;
  description?: string;
  agency?: { name: string; href: string };
}

const EQUIPE_OPERATIONNELLE: OperationalMember[] = [
  { name: "Berstelien MILAPIE", role: "Community Manager", pseudo: "Nesquiik (LNSK)", agency: { name: "EB2C Vision", href: "https://www.instagram.com/eb2cvision/" } },
  { name: "Tony TAGOE", role: "Responsable Partenariats & Subventions", pseudo: "Chewing Gum" },
  { name: "Maya", role: "Responsable Administrative Junior", description: "Gestion administrative et traçabilité des activités de l'association." },
];

interface PartnerOrg {
  name: string;
  role: string;
}

const PARTNER_ORGS: PartnerOrg[] = [
  { name: "VENA", role: "Prestataire numérique" },
  { name: "MABB", role: "Pôle animation et logistique" },
  { name: "Jeunesse en Or", role: "Pôle éducatif" },
];

const ACTIVITIES = [
  {
    title: "Tournois locaux",
    description:
      "Compétitions ouvertes à tous sur EA FC, Clash Royale et plus.",
  },
  {
    title: "Prêt de matériel",
    description:
      "Consoles, PC, écrans mis à disposition lors des événements.",
  },
  {
    title: "Sensibilisation numérique",
    description:
      "Ateliers de prévention sur les usages du numérique et du jeu vidéo.",
  },
  {
    title: "Insertion professionnelle",
    description:
      "Accompagnement vers l'emploi via les métiers de l'esport et du digital.",
  },
];

function MemberCard({ member, size = "normal" }: { member: Member; size?: "normal" | "small" }) {
  const initials = member.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  if (size === "small") {
    return (
      <div className="card-glow p-4 text-center">
        <div className="w-10 h-10 bg-vea-bg rounded-full mx-auto mb-2 flex items-center justify-center">
          <span className="text-vea-red text-xs font-bold">{initials}</span>
        </div>
        <h3 className="text-xs font-bold text-vea-white">{member.name}</h3>
        <p className="text-[11px] text-vea-text-muted mt-0.5">{member.role}</p>
      </div>
    );
  }

  return (
    <div className="card-glow p-6 text-center">
      <div className="w-14 h-14 bg-vea-bg rounded-full mx-auto mb-3 flex items-center justify-center">
        <span className="text-vea-red text-sm font-bold">{initials}</span>
      </div>
      <h3 className="text-sm font-bold text-vea-white">{member.name}</h3>
      <p className="text-xs text-vea-red mt-1 font-medium">{member.role}</p>
    </div>
  );
}

export default function AssociationPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="pt-24 pb-12 px-4 hero-bg">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h1 className="text-4xl sm:text-5xl font-black text-gradient-vea mb-4">
              L&apos;Association
            </h1>
            <p className="text-lg text-vea-text-muted max-w-2xl mx-auto">
              Plus qu&apos;un club de jeux vidéo, un acteur social.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== 3 CARDS ===== */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <ScrollReveal delay={0}>
            <div className="card-glow p-7 h-full">
              <h2 className="text-lg font-bold text-vea-red mb-3">
                Notre Histoire
              </h2>
              <p className="text-sm text-vea-text-muted leading-relaxed">
                Fondée en novembre 2022 à Amiens (RNA : W802018363), VEA structure
                la pratique du jeu vidéo amateur. Rapidement, l&apos;esport est devenu
                un outil d&apos;inclusion, d&apos;éducation et de mixité sociale
                dans les quartiers prioritaires.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="card-glow p-7 h-full">
              <h2 className="text-lg font-bold text-vea-red mb-3">
                Nos Valeurs
              </h2>
              <ul className="space-y-2">
                {VALUES.map((v) => (
                  <li
                    key={v.label}
                    className="flex items-center gap-2 text-sm text-vea-text-muted"
                  >
                    <span>{v.icon}</span>
                    <span>{v.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="card-glow p-7 h-full">
              <h2 className="text-lg font-bold text-vea-red mb-3">
                Notre Vision
              </h2>
              <p className="text-sm text-vea-text-muted leading-relaxed">
                Faire d&apos;Amiens une place forte de l&apos;esport responsable.
                Un écosystème où le joueur est accompagné, les parents rassurés,
                et les talents peuvent éclore sereinement.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== BUREAU EXÉCUTIF + CA (condensé avec toggle) ===== */}
      <BureauSection />

      {/* ===== ÉQUIPE OPÉRATIONNELLE ===== */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2 className="text-xl font-bold text-gradient-vea mb-2 text-center">
              Équipe Opérationnelle
            </h2>
            <p className="text-sm text-vea-text-muted text-center mb-6">
              Ceux qui font vivre VEA sur le terrain.
            </p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {EQUIPE_OPERATIONNELLE.map((member, i) => {
              const initials = member.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("");
              return (
                <ScrollReveal key={member.name} delay={i * 0.1}>
                  <div className="card-glow p-6 text-center">
                    <div className="w-14 h-14 bg-vea-bg rounded-full mx-auto mb-3 flex items-center justify-center">
                      <span className="text-vea-red text-sm font-bold">
                        {initials}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-vea-white">
                      {member.name}
                    </h3>
                    <p className="text-xs text-vea-red mt-1 font-medium">
                      {member.role}
                    </p>
                    {member.pseudo && (
                      <p className="text-[11px] text-vea-text-muted mt-1">
                        Pseudo : {member.pseudo}
                      </p>
                    )}
                    {member.agency && (
                      <a
                        href={member.agency.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-[11px] text-vea-text-muted hover:text-vea-white transition-colors"
                      >
                        {member.agency.name} ↗
                      </a>
                    )}
                    {member.description && (
                      <p className="text-[11px] text-vea-text-muted mt-1.5 leading-relaxed">
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

      {/* ===== MEMBRES PARTENAIRES ===== */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2 className="text-xl font-bold text-gradient-vea mb-6 text-center">
              Membres Partenaires
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {PARTNER_ORGS.map((org, i) => (
              <ScrollReveal key={org.name} delay={i * 0.1}>
                <div className="card-glow p-5 text-center">
                  <div className="w-12 h-12 bg-vea-red/10 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-vea-red text-sm font-bold">
                      {org.name[0]}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-vea-white">{org.name}</h3>
                  <p className="text-xs text-vea-text-muted mt-1">{org.role}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NOS ACTIVITÉS ===== */}
      <section className="py-16 px-4 bg-vea-bg/50">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-gradient-vea mb-8 text-center">
              Nos Activités
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {ACTIVITIES.map((act, i) => (
              <ScrollReveal key={act.title} delay={i * 0.1}>
                <div className="card-glow p-6 h-full">
                  <h3 className="text-base font-bold text-vea-white mb-2">
                    {act.title}
                  </h3>
                  <p className="text-sm text-vea-text-muted leading-relaxed">
                    {act.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
