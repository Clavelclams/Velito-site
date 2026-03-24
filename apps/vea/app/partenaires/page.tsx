/**
 * Page Partenaires VEA — REFONTE VIOLET + ROUGE + MOTION
 * Liste complète classée en 4 catégories + CTA devenir partenaire
 */
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

interface Partner {
  name: string;
  category: string;
}

const INSTITUTIONNELS: Partner[] = [
  { name: "France Esport", category: "Réseau national esport (affiliation officielle)" },
  { name: "FFJV", category: "Fédération Française de Jeu Vidéo (affiliation officielle)" },
];

/** Structures auprès desquelles VEA intervient — pas des partenaires officiels */
interface Terrain {
  name: string;
  type: string;
}

const TERRAINS: Terrain[] = [
  { name: "Service Jeunesse d'Amiens", type: "Collectivité territoriale" },
  { name: "UFOLEP Somme", type: "Fédération sportive multisport" },
];

const ASSOCIATIFS: Partner[] = [
  { name: "MABB", category: "Métropole Amiénoise Basket-Ball" },
  { name: "Jeunesse en Or", category: "Association QPV" },
  { name: "Comité Basket Somme", category: "Comité départemental basket-ball" },
  { name: "OMNE Esport", category: "Organisateur INTERCUP 2026" },
];

const LOCAUX: Partner[] = [
  { name: "EVA Amiens", category: "Partenaire gaming" },
  { name: "GameCash", category: "Lots & récompenses tournois" },
  { name: "WarpZone", category: "Bar gaming Amiens" },
  { name: "Battle Kart", category: "Partenaire événementiel" },
  { name: "Moxy Amiens", category: "Partenaire événementiel" },
];

const MEDIAS: Partner[] = [
  { name: "Courrier Picard", category: "Presse régionale" },
  { name: "Gazette Sports", category: "Média sportif local" },
  { name: "France Bleu Picardie", category: "Radio régionale" },
  { name: "NRJ Amiens", category: "Radio locale" },
];

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <div className="card-glow p-6 text-center">
      <div className="w-14 h-14 bg-vea-bg rounded-lg mx-auto mb-3 flex items-center justify-center">
        <span className="text-vea-text-dim text-lg font-bold">
          {partner.name[0]}
        </span>
      </div>
      <h3 className="text-sm font-bold text-vea-white mb-1">
        {partner.name}
      </h3>
      <p className="text-xs text-vea-text-muted">{partner.category}</p>
    </div>
  );
}

function TerrainCard({ terrain }: { terrain: Terrain }) {
  return (
    <div className="border border-dashed border-vea-border/50 rounded-2xl p-6 text-center opacity-80">
      <div className="w-14 h-14 bg-vea-bg/50 rounded-lg mx-auto mb-3 flex items-center justify-center">
        <span className="text-vea-text-dim text-lg font-bold">
          {terrain.name[0]}
        </span>
      </div>
      <h3 className="text-sm font-bold text-vea-white mb-1">
        {terrain.name}
      </h3>
      <p className="text-xs text-vea-text-muted mb-2">{terrain.type}</p>
      <span className="inline-block text-[10px] uppercase tracking-wider font-semibold text-vea-text-dim bg-vea-bg/80 border border-vea-border/30 px-2.5 py-0.5 rounded-full">
        Terrain
      </span>
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
      <div className="mb-12">
        <h3 className="text-lg font-bold text-vea-white mb-6 border-left-red">
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
      {/* ===== HERO ===== */}
      <section className="pt-24 pb-12 px-4 hero-bg">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h1 className="text-4xl sm:text-5xl font-black text-gradient-vea mb-4">
              Nos Partenaires
            </h1>
            <p className="text-lg text-vea-text-muted max-w-2xl mx-auto">
              Ils soutiennent le développement de l&apos;esport à Amiens. Merci à eux.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== GRILLES PAR CATÉGORIE ===== */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <PartnerSection title="Partenaires institutionnels" partners={INSTITUTIONNELS} delay={0} />

          {/* ===== TERRAINS D'INTERVENTION ===== */}
          <ScrollReveal delay={0.05}>
            <div className="mb-12">
              <h3 className="text-lg font-bold text-vea-white mb-2 border-left-red">
                Nos terrains d&apos;intervention
              </h3>
              <p className="text-xs text-vea-text-muted mb-6 pl-5">
                Structures auprès desquelles VEA intervient en tant que prestataire.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {TERRAINS.map((t) => (
                  <TerrainCard key={t.name} terrain={t} />
                ))}
              </div>
            </div>
          </ScrollReveal>

          <PartnerSection title="Partenaires associatifs" partners={ASSOCIATIFS} delay={0.1} />
          <PartnerSection title="Partenaires locaux" partners={LOCAUX} delay={0.2} />
          <PartnerSection title="Médias partenaires" partners={MEDIAS} delay={0.3} />

          {/* Card "Votre logo ici" */}
          <ScrollReveal delay={0.4}>
            <div className="mt-8">
              <div className="bg-vea-card border-2 border-dashed border-vea-border rounded-xl p-8 text-center max-w-xs mx-auto hover:border-vea-red/40 transition-colors">
                <div className="w-14 h-14 bg-vea-bg rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <span className="text-vea-red text-2xl font-bold">+</span>
                </div>
                <h3 className="text-sm font-bold text-vea-white mb-1">
                  Votre logo ici
                </h3>
                <p className="text-xs text-vea-text-muted">Devenez partenaire</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <div className="card-glow p-10">
              <h2 className="text-2xl font-bold text-gradient-vea mb-4">
                Devenir Partenaire
              </h2>
              <p className="text-vea-text-muted mb-8 max-w-xl mx-auto leading-relaxed">
                Associez votre image aux valeurs positives de l&apos;esport et
                touchez une audience jeune et engagée.
              </p>
              <Link
                href="/contact"
                className="inline-block bg-vea-red hover:bg-vea-accent-hover text-white font-semibold px-8 py-3.5 rounded-lg transition-all text-sm hover:shadow-[0_0_25px_rgba(230,57,70,0.4)]"
              >
                Nous contacter
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
