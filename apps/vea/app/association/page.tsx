/**
 * Page Association VEA
 *
 * 👉 Structure :
 * 1. Hero — titre + sous-titre
 * 2. Card "Notre Histoire"
 * 3. Section "Nos Valeurs" (4 cards)
 * 4. Card "Notre Vision"
 * 5. Section "L'Équipe Dirigeante" (placeholder)
 */

interface Value {
  title: string;
  description: string;
}

const VALUES: Value[] = [
  {
    title: "Excellence & Performance",
    description:
      "Pousser chaque joueur à progresser, que ce soit en compétition ou dans sa vie quotidienne.",
  },
  {
    title: "Inclusion & Solidarité",
    description:
      "Le gaming ne connaît pas de frontières. Chacun a sa place, quel que soit son niveau ou son parcours.",
  },
  {
    title: "Éducation & Prévention",
    description:
      "Sensibiliser aux bonnes pratiques du numérique et lutter contre les dérives du jeu vidéo.",
  },
  {
    title: "Innovation Sociale",
    description:
      "Utiliser l'esport comme levier d'insertion professionnelle et de cohésion territoriale.",
  },
];

interface TeamMember {
  name: string;
  role: string;
}

const TEAM: TeamMember[] = [
  { name: "Clavel NDEMA MOUSSA", role: "Président" },
  { name: "À venir", role: "Vice-président(e)" },
  { name: "À venir", role: "Trésorier(e)" },
  { name: "À venir", role: "Secrétaire" },
];

export default function AssociationPage() {
  return (
    <>
      {/* ======= HERO ======= */}
      <section className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-vea-white mb-4">
            L&apos;Association
          </h1>
          <p className="text-lg text-vea-white/50 max-w-2xl mx-auto">
            Plus qu&apos;un club de jeux vidéo, un acteur social.
          </p>
        </div>
      </section>

      {/* ======= NOTRE HISTOIRE ======= */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-vea-gray border border-vea-gray-light/20 rounded-xl p-8">
            <h2 className="text-xl font-bold text-vea-red mb-4">
              Notre Histoire
            </h2>
            <p className="text-vea-white/60 leading-relaxed">
              Fondée en 2020 au cœur d&apos;Amiens, Velito Esport est née de la
              volonté de structurer la pratique du jeu vidéo amateur. Ce qui a
              commencé comme une passion partagée entre amis est devenu un
              projet associatif ambitieux : utiliser l&apos;esport comme un outil
              d&apos;inclusion, de formation et de développement local.
            </p>
          </div>
        </div>
      </section>

      {/* ======= NOS VALEURS ======= */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-vea-white mb-8 text-center">
            Nos Valeurs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {VALUES.map((val) => (
              <div
                key={val.title}
                className="bg-vea-gray border border-vea-gray-light/20 rounded-xl p-6 hover:border-vea-red/30 transition-colors"
              >
                <h3 className="text-lg font-bold text-vea-white mb-2">
                  {val.title}
                </h3>
                <p className="text-sm text-vea-white/50 leading-relaxed">
                  {val.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= NOTRE VISION ======= */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-vea-gray border border-vea-red/20 rounded-xl p-8 text-center">
            <h2 className="text-xl font-bold text-vea-red mb-4">
              Notre Vision
            </h2>
            <p className="text-lg text-vea-white/70 leading-relaxed font-medium">
              Faire d&apos;Amiens une place forte de l&apos;esport responsable.
            </p>
          </div>
        </div>
      </section>

      {/* ======= L'ÉQUIPE DIRIGEANTE ======= */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-vea-white mb-8 text-center">
            L&apos;Équipe Dirigeante
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map((member) => (
              <div
                key={member.role}
                className="bg-vea-gray border border-vea-gray-light/20 rounded-xl p-6 text-center"
              >
                {/* 👉 Avatar placeholder — cercle avec initiale */}
                <div className="w-16 h-16 bg-vea-gray-light rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-vea-white/40 text-xl font-bold">
                    {member.name[0]}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-vea-white">
                  {member.name}
                </h3>
                <p className="text-xs text-vea-red mt-1 font-medium">
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
