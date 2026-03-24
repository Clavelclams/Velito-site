/**
 * Page Partenaires VEA
 * Grille partenaires (4 cols, 2 mobile) + CTA devenir partenaire
 */
import Link from "next/link";

interface Partner {
  name: string;
  category: string;
  dashed?: boolean; // Card en pointillés = place libre
}

const PARTNERS: Partner[] = [
  { name: "Ville d'Amiens", category: "Collectivité" },
  { name: "Tech Store", category: "Matériel" },
  { name: "Local Bank", category: "Finance" },
  { name: "Votre Logo ici", category: "Devenez partenaire", dashed: true },
];

export default function PartenairesPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="pt-20 pb-12 px-4 bg-gradient-to-b from-vea-dark to-vea-navy">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-vea-white mb-4">
            Nos Partenaires
          </h1>
          <p className="text-lg text-vea-text-muted max-w-2xl mx-auto">
            Ils soutiennent le développement de l&apos;esport à Amiens. Merci à eux.
          </p>
        </div>
      </section>

      {/* ===== GRILLE ===== */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {PARTNERS.map((partner) => (
              <div
                key={partner.name}
                className={`bg-vea-card rounded-xl p-8 text-center hover:border-vea-accent/30 transition-colors ${
                  partner.dashed
                    ? "border-2 border-dashed border-vea-border"
                    : "border border-vea-border"
                }`}
              >
                <div className="w-16 h-16 bg-vea-navy rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <span className="text-vea-text-dim text-xl font-bold">
                    {partner.name[0]}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-vea-white mb-1">
                  {partner.name}
                </h3>
                <p className="text-xs text-vea-text-muted">{partner.category}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-vea-card border border-vea-border rounded-xl p-10">
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
              Télécharger le dossier de sponsoring
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
