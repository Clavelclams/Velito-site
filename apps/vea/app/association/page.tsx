/**
 * Page Association VEA
 * Hero + 3 cards (histoire/valeurs/vision) + équipe + activités
 */

const VALUES = [
  { icon: "🏆", label: "Excellence & Performance" },
  { icon: "🤝", label: "Inclusion & Solidarité" },
  { icon: "📚", label: "Éducation & Prévention" },
  { icon: "💡", label: "Innovation Sociale" },
];

const TEAM = [
  { name: "Clavel NDEMA MOUSSA", role: "Président" },
  { name: "À définir", role: "Vice-président(e)" },
  { name: "À définir", role: "Trésorier(e)" },
  { name: "À définir", role: "Secrétaire" },
];

const ACTIVITIES = [
  {
    title: "Tournois locaux",
    description: "Compétitions ouvertes à tous sur EA FC, Clash Royale et plus.",
  },
  {
    title: "Prêt de matériel",
    description: "Consoles, PC, écrans mis à disposition lors des événements.",
  },
  {
    title: "Sensibilisation numérique",
    description: "Ateliers de prévention sur les usages du numérique et du jeu vidéo.",
  },
  {
    title: "Insertion professionnelle",
    description: "Accompagnement vers l'emploi via les métiers de l'esport et du digital.",
  },
];

export default function AssociationPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="pt-20 pb-12 px-4 bg-gradient-to-b from-vea-dark to-vea-navy">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-vea-white mb-4">
            L&apos;Association
          </h1>
          <p className="text-lg text-vea-text-muted max-w-2xl mx-auto">
            Plus qu&apos;un club de jeux vidéo, un acteur social.
          </p>
        </div>
      </section>

      {/* ===== 3 CARDS ===== */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Histoire */}
          <div className="bg-vea-card border border-vea-border rounded-xl p-7">
            <h2 className="text-lg font-bold text-vea-accent mb-3">
              Notre Histoire
            </h2>
            <p className="text-sm text-vea-text-muted leading-relaxed">
              Fondée en 2020 à Amiens, VEA structure la pratique du jeu vidéo
              amateur. Rapidement, l&apos;esport est devenu un outil
              d&apos;inclusion, d&apos;éducation et de mixité sociale.
            </p>
          </div>

          {/* Valeurs */}
          <div className="bg-vea-card border border-vea-border rounded-xl p-7">
            <h2 className="text-lg font-bold text-vea-accent mb-3">
              Nos Valeurs
            </h2>
            <ul className="space-y-2">
              {VALUES.map((v) => (
                <li key={v.label} className="flex items-center gap-2 text-sm text-vea-text-muted">
                  <span>{v.icon}</span>
                  <span>{v.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Vision */}
          <div className="bg-vea-card border border-vea-border rounded-xl p-7">
            <h2 className="text-lg font-bold text-vea-accent mb-3">
              Notre Vision
            </h2>
            <p className="text-sm text-vea-text-muted leading-relaxed">
              Faire d&apos;Amiens une place forte de l&apos;esport responsable.
              Un écosystème où le joueur est accompagné, les parents rassurés,
              et les talents peuvent éclore sereinement.
            </p>
          </div>
        </div>
      </section>

      {/* ===== ÉQUIPE DIRIGEANTE ===== */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-vea-white mb-8 text-center">
            L&apos;Équipe Dirigeante
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map((member) => (
              <div
                key={member.role}
                className="bg-vea-card border border-vea-border rounded-xl p-6 text-center"
              >
                <div className="w-16 h-16 bg-vea-navy rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-vea-text-dim text-xl font-bold">
                    {member.name[0]}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-vea-white">
                  {member.name}
                </h3>
                <p className="text-xs text-vea-accent mt-1 font-medium">
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NOS ACTIVITÉS ===== */}
      <section className="py-16 px-4 bg-vea-navy/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-vea-white mb-8 text-center">
            Nos Activités
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {ACTIVITIES.map((act) => (
              <div
                key={act.title}
                className="bg-vea-card border border-vea-border rounded-xl p-6 hover:border-vea-accent/30 transition-colors"
              >
                <h3 className="text-base font-bold text-vea-white mb-2">
                  {act.title}
                </h3>
                <p className="text-sm text-vea-text-muted leading-relaxed">
                  {act.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
