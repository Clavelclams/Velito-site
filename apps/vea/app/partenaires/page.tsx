/**
 * Page Partenaires VEA
 * Liste complète réelle classée en 4 catégories + CTA devenir partenaire
 */
import Link from "next/link";

interface Partner {
  name: string;
  category: string;
}

const INSTITUTIONNELS: Partner[] = [
  { name: "Amiens Métropole", category: "Services Jeunesse" },
  { name: "France Esport", category: "Réseau national esport" },
  { name: "FFJV", category: "Fédération Française de Jeu Vidéo" },
  { name: "UFOLEP Somme", category: "Fédération sportive multisport" },
];

const ASSOCIATIFS: Partner[] = [
  { name: "MABB", category: "Métropole Amiénoise Basket-Ball" },
  { name: "Jeunesse en Or", category: "Association QPV" },
  { name: "Comité Basket Somme", category: "Comité départemental basket-ball" },
  { name: "OMNE Esport", category: "Organisateur INTERCUP" },
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
      <div className="w-14 h-14 bg-vea-navy rounded-lg mx-auto mb-3 flex items-center justify-center">
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

function PartnerSection({
  title,
  partners,
}: {
  title: string;
  partners: Partner[];
}) {
  return (
    <div className="mb-12">
      <h3 className="text-lg font-bold text-vea-white mb-6 pl-4 border-l-4 border-vea-accent">
        {title}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {partners.map((p) => (
          <PartnerCard key={p.name} partner={p} />
        ))}
      </div>
    </div>
  );
}

export default function PartenairesPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="pt-20 pb-12 px-4 bg-gradient-to-b from-vea-dark to-vea-navy">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-gradient mb-4">
            Nos Partenaires
          </h1>
          <p className="text-lg text-vea-text-muted max-w-2xl mx-auto">
            Ils soutiennent le développement de l&apos;esport à Amiens. Merci à eux.
          </p>
        </div>
      </section>

      {/* ===== GRILLES PAR CATÉGORIE ===== */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <PartnerSection title="Partenaires institutionnels" partners={INSTITUTIONNELS} />
          <PartnerSection title="Partenaires associatifs" partners={ASSOCIATIFS} />
          <PartnerSection title="Partenaires locaux" partners={LOCAUX} />
          <PartnerSection title="Médias partenaires" partners={MEDIAS} />

          {/* Card "Votre logo ici" */}
          <div className="mt-8">
            <div className="bg-vea-card border-2 border-dashed border-vea-border rounded-xl p-8 text-center max-w-xs mx-auto hover:border-vea-accent/40 transition-colors">
              <div className="w-14 h-14 bg-vea-navy rounded-lg mx-auto mb-3 flex items-center justify-center">
                <span className="text-vea-accent text-2xl font-bold">+</span>
              </div>
              <h3 className="text-sm font-bold text-vea-white mb-1">
                Votre logo ici
              </h3>
              <p className="text-xs text-vea-text-muted">Devenez partenaire</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="card-glow p-10">
            <h2 className="text-2xl font-bold text-vea-white mb-4">
              Devenir Partenaire
            </h2>
            <p className="text-vea-text-muted mb-8 max-w-xl mx-auto leading-relaxed">
              Associez votre image aux valeurs positives de l&apos;esport et
              touchez une audience jeune et engagée.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-vea-accent hover:bg-vea-accent-hover text-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-sm"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
