/**
 * Page Partenaires VEA — refonte DA claire (16/05/2026).
 *
 * Structure :
 *   1. Hero court
 *   2. Partenaires institutionnels (France Esports, FFJV) — affiliations officielles
 *   3. Mes terrains d'intervention — centres sociaux + structures jeunesse
 *      ou j'interviens en tant que prestataire (sources : base Notion + debrief 12/05)
 *   4. Partenaires associatifs
 *   5. Partenaires locaux / commerciaux
 *   6. Medias partenaires
 *   7. CTA "Devenir partenaire"
 */
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

interface Partner {
  name: string;
  category: string;
}

const INSTITUTIONNELS: Partner[] = [
  { name: "France Esports", category: "Reseau national esport (affiliation officielle)" },
  { name: "FFJV", category: "Federation Francaise de Jeu Video (affiliation officielle)" },
];

/** Terrains d'intervention — lieux physiques ou je suis prestataire. */
interface Terrain {
  name: string;
  type: string;
}

const TERRAINS: Terrain[] = [
  // Centres sociaux d'Amiens — intervention recurrente
  { name: "Centre social Tour du Marais", type: "Etouvie" },
  { name: "Centre social Elbeuf", type: "Saint-Just" },
  { name: "Centre social Moxy", type: "Saint-Acheul" },
  { name: "Centre social L'Albatros", type: "Amiens" },
  { name: "Centre social Marcel Paul", type: "Amiens Nord" },
  { name: "Centre social Salamandre", type: "Amiens Nord" },
  { name: "Centre social Pierre Rollin", type: "Amiens Nord" },
  { name: "La Pleiade", type: "Pigeonnier" },
  // Structures jeunesse / culture
  { name: "Etoile du Sud", type: "Centre culturel" },
  { name: "Cite Educative d'Amiens", type: "Nord + Etouvie" },
  // Institutions partenaires recurrentes
  { name: "Service Jeunesse d'Amiens", type: "Collectivite territoriale" },
  { name: "APSL 80", type: "Profession Sport & Loisirs (Rec en action)" },
  { name: "UFOLEP Somme", type: "Federation sportive multisport" },
];

const ASSOCIATIFS: Partner[] = [
  { name: "MABB", category: "Metropole Amienoise Basket-Ball (membre fondateur)" },
  { name: "Jeunesse en Or", category: "Association QPV (convention colocation)" },
  { name: "Comite Basket Somme", category: "Comite departemental basket-ball" },
  { name: "OMNE Esport", category: "Organisateur INTERCUP 2026" },
  { name: "Pedagojeux", category: "Asso pedagogie jeu video" },
];

const LOCAUX: Partner[] = [
  { name: "EVA Amiens", category: "Partenaire gaming" },
  { name: "GameCash", category: "Lots & recompenses tournois" },
  { name: "WarpZone", category: "Bar gaming Amiens" },
  { name: "Battle Kart", category: "Partenaire evenementiel" },
  { name: "Moxy Amiens", category: "Partenaire evenementiel" },
];

const MEDIAS: Partner[] = [
  { name: "Courrier Picard", category: "Presse regionale" },
  { name: "Gazette Sports", category: "Media sportif local" },
  { name: "France Bleu Picardie", category: "Radio regionale" },
  { name: "NRJ Amiens", category: "Radio locale" },
];

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <div className="card-clean p-5 text-center">
      <div className="w-12 h-12 bg-vea-accent-soft border border-vea-accent/15 rounded-lg mx-auto mb-3 flex items-center justify-center">
        <span className="text-vea-accent text-lg font-bold">
          {partner.name[0]}
        </span>
      </div>
      <h3 className="text-sm font-bold text-vea-text mb-1">
        {partner.name}
      </h3>
      <p className="text-xs text-vea-text-muted leading-snug">{partner.category}</p>
    </div>
  );
}

function TerrainCard({ terrain }: { terrain: Terrain }) {
  return (
    <div className="card-accent-left p-4 h-full">
      <h3 className="text-sm font-bold text-vea-text leading-tight">
        {terrain.name}
      </h3>
      <p className="text-xs text-vea-text-dim mt-1">{terrain.type}</p>
    </div>
  );
}

function PartnerSection({
  title,
  partners,
  delay = 0,
}: {
  title: string;
  partners: Partner[];
  delay?: number;
}) {
  return (
    <ScrollReveal delay={delay}>
      <div className="mb-14">
        <h3 className="text-lg font-bold text-vea-text mb-6 border-left-red">
          {title}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {partners.map((p) => (
            <PartnerCard key={p.name} partner={p} />
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}

export default function PartenairesPage() {
  return (
    <>
      {/* HERO */}
      <section className="hero-bg pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <span className="badge-red mb-4">Ecosysteme</span>
            <h1 className="text-4xl sm:text-5xl font-black text-vea-text mb-4 mt-4">
              Nos <span className="text-vea-accent">Partenaires</span>
            </h1>
            <p className="text-base text-vea-text-muted max-w-2xl mx-auto">
              Ils soutiennent le developpement de l&apos;esport et de
              l&apos;inclusion numerique a Amiens. Merci a eux.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* GRILLES PAR CATEGORIE */}
      <section className="py-16 px-4 bg-vea-bg">
        <div className="max-w-6xl mx-auto">
          <PartnerSection title="Partenaires institutionnels" partners={INSTITUTIONNELS} delay={0} />

          {/* TERRAINS D'INTERVENTION */}
          <ScrollReveal delay={0.05}>
            <div className="mb-14">
              <h3 className="text-lg font-bold text-vea-text mb-2 border-left-red">
                Nos terrains d&apos;intervention
              </h3>
              <p className="text-sm text-vea-text-muted mb-6 pl-5">
                Structures aupres desquelles VEA intervient en tant que prestataire —
                centres sociaux, structures jeunesse et institutions partenaires.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TERRAINS.map((t) => (
                  <TerrainCard key={t.name} terrain={t} />
                ))}
              </div>
            </div>
          </ScrollReveal>

          <PartnerSection title="Partenaires associatifs" partners={ASSOCIATIFS} delay={0.1} />
          <PartnerSection title="Partenaires locaux" partners={LOCAUX} delay={0.2} />
          <PartnerSection title="Medias partenaires" partners={MEDIAS} delay={0.3} />

          {/* Card "Votre logo ici" */}
          <ScrollReveal delay={0.4}>
            <div className="mt-8">
              <div className="card-clean border-2 border-dashed border-vea-border-strong p-8 text-center max-w-xs mx-auto hover:border-vea-accent transition-colors">
                <div className="w-14 h-14 bg-vea-accent-soft rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <span className="text-vea-accent text-2xl font-bold">+</span>
                </div>
                <h3 className="text-sm font-bold text-vea-text mb-1">
                  Votre logo ici
                </h3>
                <p className="text-xs text-vea-text-muted">Devenez partenaire</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 section-bg">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <div className="card-clean p-10 sm:p-14 bg-vea-accent-soft border-vea-accent/15">
              <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mb-4">
                Devenir <span className="text-vea-accent">Partenaire</span>
              </h2>
              <p className="text-vea-text-muted mb-8 max-w-xl mx-auto leading-relaxed">
                Associez votre image aux valeurs positives de l&apos;esport et
                touchez une audience jeune et engagee.
              </p>
              <Link href="/contact" className="btn-primary">
                Nous contacter
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
