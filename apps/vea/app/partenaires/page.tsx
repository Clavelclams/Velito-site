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
import Image from "next/image";
import ScrollReveal from "@/components/ScrollReveal";

interface Partner {
  name: string;
  category: string;
  /** Lien externe vers le site officiel du partenaire. Si present, le nom devient cliquable. */
  url?: string;
  /** Chemin du logo dans /public/images/partenaires-vea/. Si present, remplace la lettre initiale. */
  logo?: string;
}

const INSTITUTIONNELS: Partner[] = [
  { name: "France Esports", category: "Reseau national esport (affiliation officielle)", url: "https://www.france-esports.org/", logo: "/images/partenaires-vea/france-esport-logo.png" },
  { name: "FFJV", category: "Federation Francaise de Jeu Video (clubs esports amateurs)", url: "https://www.ffjv.org/fr/", logo: "/images/partenaires-vea/FFJV-logo.png" },
];

/** Terrains d'intervention — lieux physiques ou je suis prestataire. */
interface Terrain {
  name: string;
  type: string;
}

const TERRAINS: Terrain[] = [
  // Centres sociaux d'Amiens — intervention recurrente
  { name: "Tour du Marais", type: "Etouvie" },
  { name: "Elbeuf", type: "Saint-Just" },
  { name: "Moxy", type: "Saint-Acheul" },
  { name: "L'Albatros", type: "Amiens" },
  { name: "Marcel Paul", type: "Amiens Nord" },
  { name: "Salamandre", type: "Amiens Nord" },
  { name: "Pierre Rollin", type: "Amiens Nord" },
  { name: "La Pleiade", type: "Pigeonnier" },
  // Structures jeunesse / culture
  { name: "Etoile du Sud", type: "Centre culturel" },
  // Institutions partenaires recurrentes
  { name: "Service Jeunesse d'Amiens", type: "Collectivite territoriale" },
  { name: "APSL 80", type: "Profession Sport & Loisirs (Rec en action)" },
  { name: "UFOLEP Somme", type: "Federation sportive multisport" },
];

const ASSOCIATIFS: Partner[] = [
  { name: "MABB", category: "Metropole Amienoise Basket-Ball (membre fondateur)", url: "https://www.mabb.fr/", logo: "/images/partenaires-vea/mabb-logo.png" },
  { name: "B2G Amiens", category: "Co-organisateur E-Night World Cup", url: "https://www.helloasso.com/associations/b2g-amiens", logo: "/images/partenaires-vea/B2G-logo.webp" },
  { name: "Jeunesse en Or", category: "Association QPV (convention colocation)", logo: "/images/partenaires-vea/JEO-logo.png" },
  { name: "Comite Basket Somme", category: "Comite departemental basket-ball" },
  { name: "OMNE Esport", category: "Organisateur INTERCUP 2026", logo: "/images/partenaires-vea/omne-esport.jpg" },
  { name: "Pedagojeux", category: "Asso pedagogie jeu video", url: "https://www.pedagojeux.fr/", logo: "/images/partenaires-vea/pedagojeux.png" },
];

const LOCAUX: Partner[] = [
  { name: "EVA Amiens", category: "Partenaire gaming", logo: "/images/partenaires-vea/EVA.png" },
  { name: "GameCash", category: "Lots & recompenses tournois", url: "https://www.gamecash.fr/", logo: "/images/partenaires-vea/Game cash.png" },
  { name: "WarpZone", category: "Bar gaming Amiens", logo: "/images/partenaires-vea/Warpzone.png" },
  { name: "Battle Kart", category: "Partenaire evenementiel" },
  { name: "Moxy Amiens", category: "Hotel partenaire evenementiel", url: "https://www.instagram.com/moxyamiens/", logo: "/images/partenaires-vea/moxy.jpg" },
  { name: "Pourqua'pa", category: "Partenaire local Amiens", url: "https://www.instagram.com/pourquapa/", logo: "/images/partenaires-vea/pourquapa.jpg" },
];

const MEDIAS: Partner[] = [
  { name: "Courrier Picard", category: "Presse regionale", url: "https://www.courrier-picard.fr/" },
  { name: "Gazette Sports", category: "Media sportif local", url: "https://gazettesports.fr/", logo: "/images/partenaires-vea/Gazette-sport.png" },
  { name: "France Bleu Picardie", category: "Radio regionale", url: "https://www.francebleu.fr/picardie" },
  { name: "NRJ Amiens", category: "Radio locale" },
];

function PartnerCard({ partner }: { partner: Partner }) {
  // Si url disponible, on rend la card cliquable -> ouvre le site officiel
  // dans un nouvel onglet. Pour le SEO et le partage de "link juice".
  // rel="noopener noreferrer" obligatoire pour target="_blank" (securite).
  const NameNode = partner.url ? (
    <a
      href={partner.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-vea-accent hover:underline transition-colors"
      title={`Visiter le site officiel de ${partner.name}`}
    >
      {partner.name}
      <span aria-hidden="true" className="ml-1 text-[10px]">↗</span>
    </a>
  ) : (
    <span>{partner.name}</span>
  );

  // DA 22/05 : plus de "carte blanche". Cellule sobre facon mur de partenaires
  // institutionnel — logo en niveaux de gris qui revient en couleur au survol.
  return (
    <div className="group flex flex-col items-center text-center px-3 py-6 rounded-2xl transition-colors hover:bg-vea-surface-soft">
      <div className="h-16 w-full mb-4 flex items-center justify-center">
        {partner.logo ? (
          // Logo officiel partenaire (object-contain pour eviter deformation)
          <Image
            src={partner.logo}
            alt={`Logo ${partner.name}`}
            width={72}
            height={64}
            className="max-h-16 w-auto object-contain grayscale opacity-70 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100"
          />
        ) : (
          // Fallback : monogramme typographique (pas de boite)
          <span className="font-display text-3xl font-bold text-vea-border-strong transition-colors group-hover:text-vea-accent">
            {partner.name[0]}
          </span>
        )}
      </div>
      <h3 className="text-sm font-bold text-vea-text mb-1">{NameNode}</h3>
      <p className="text-xs text-vea-text-muted leading-snug">
        {partner.category}
      </p>
    </div>
  );
}

function TerrainCard({ terrain }: { terrain: Terrain }) {
  return (
    <div className="panel-accent py-3 h-full transition-colors hover:border-l-vea-border-strong">
      <h3 className="text-sm font-bold text-vea-accent leading-tight">
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
          <PartnerSection title="Partenaires locaux & commerciaux" partners={LOCAUX} delay={0.15} />
          <PartnerSection title="Medias partenaires" partners={MEDIAS} delay={0.2} />
        </div>
      </section>

      {/* CTA — bloc editorial accent (plus de carte blanche centree) */}
      <section className="py-20 px-4 section-bg">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 border-t-2 border-vea-accent pt-10">
              <div className="max-w-xl">
                <span className="kicker mb-3">Rejoindre l&apos;ecosysteme</span>
                <h2 className="text-3xl sm:text-4xl font-bold text-vea-text leading-tight mt-2">
                  Devenir <span className="text-vea-accent">partenaire</span>
                </h2>
                <p className="text-vea-text-muted mt-4">
                  Vous souhaitez soutenir VEA, organiser un evenement commun, ou
                  rejoindre notre reseau ? On est tres ouverts a la discussion.
                </p>
              </div>
              <Link href="/contact" className="btn-primary shrink-0">
                Nous contacter
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
