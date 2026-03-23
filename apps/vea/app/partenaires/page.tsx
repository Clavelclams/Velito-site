/**
 * Page Partenaires VEA
 *
 * 👉 Structure :
 * 1. Hero — titre + sous-titre
 * 2. Grid de partenaires (placeholders)
 * 3. CTA "Devenir Partenaire"
 *
 * 👉 Les partenaires sont en dur pour l'instant.
 * Plus tard : alimenté par un CMS ou Supabase.
 */
import Link from "next/link";

interface Partner {
  name: string;
  category: string;
  placeholder: boolean; // 👉 true = pas encore de vrai logo
}

const PARTNERS: Partner[] = [
  { name: "Ville d'Amiens", category: "Collectivité", placeholder: true },
  { name: "Tech Store", category: "Matériel", placeholder: true },
  { name: "Local Bank", category: "Finance", placeholder: true },
  { name: "Votre Logo ici", category: "Devenez partenaire", placeholder: true },
];

export default function PartenairesPage() {
  return (
    <>
      {/* ======= HERO ======= */}
      <section className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-vea-white mb-4">
            Nos Partenaires
          </h1>
          <p className="text-lg text-vea-white/50 max-w-2xl mx-auto">
            Ils soutiennent le développement de l&apos;esport à Amiens.
          </p>
        </div>
      </section>

      {/* ======= GRID PARTENAIRES ======= */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PARTNERS.map((partner) => (
              <div
                key={partner.name}
                className="bg-vea-gray border border-vea-gray-light/20 rounded-xl p-8 text-center hover:border-vea-red/30 transition-colors group"
              >
                {/* 👉 Placeholder logo — carré gris avec initiale */}
                <div className="w-20 h-20 bg-vea-gray-light rounded-lg mx-auto mb-4 flex items-center justify-center group-hover:bg-vea-gray-light/80 transition-colors">
                  <span className="text-vea-white/30 text-2xl font-bold">
                    {partner.name[0]}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-vea-white mb-1">
                  {partner.name}
                </h3>
                <p className="text-xs text-vea-white/40">{partner.category}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= CTA DEVENIR PARTENAIRE ======= */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-vea-gray border border-vea-red/20 rounded-xl p-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-vea-white mb-4">
              Devenir Partenaire
            </h2>
            <p className="text-vea-white/50 mb-8 max-w-xl mx-auto leading-relaxed">
              Associez votre marque à un projet d&apos;impact social autour de
              l&apos;esport. Visibilité locale, engagement communautaire, image
              positive.
            </p>
            {/* 👉 Pour l'instant le bouton pointe vers /contact */}
            {/* Plus tard : lien vers un PDF de dossier de sponsoring */}
            <Link
              href="/contact"
              className="inline-block bg-vea-red hover:bg-vea-red/90 text-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-sm"
            >
              Télécharger le dossier de sponsoring
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
