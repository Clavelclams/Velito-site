/**
 * /admin/president VEA — Espace Président (Alban + Clavel).
 *
 * Server Component. Acces RESERVE : scope "vea" = owner (presidents).
 * Si l'user est admin editor mais pas owner -> message d'acces restreint
 * (pas un redirect brutal, pour que ce soit clair).
 *
 * Contenu (demande Clavel 22/05/2026) : vue strategique de pilotage —
 *   - Fil rouge financier de l'asso (objectifs compta par saison)
 *   - Roadmap sur 3 horizons (2026 -> 2030)
 *   - Projet phare de l'annee (Amiens Roule dans ses Quartiers)
 *   - 5 conditions critiques qui determinent tout
 *   - Lien vers la strategie complete dans Notion
 *
 * Source : page Notion "Strategie VEA 2026-2030 — Plan de prosperite".
 * Resume structure ici ; le detail vivant reste sur Notion (1 seule source
 * de verite a maintenir).
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";

export const dynamic = "force-dynamic";

const NOTION_STRATEGIE_URL =
  "https://www.notion.so/366c92232ed881528d4dc18e52e0236a";

// ---- Fil rouge financier : objectif chiffre par saison ----
const FIL_ROUGE = [
  {
    saison: "2025 / 2026",
    montant: "4 653 €",
    statut: "Réalisé",
    note: "Prestations uniquement (Mercredis Elbeuf, Moxy, Saint-Just…).",
    done: true,
  },
  {
    saison: "2026 / 2027",
    montant: "10 – 12 K€",
    statut: "Cible",
    note: "Doublement : prestations 6 500 € + FDVA 3,5–5 K€ + adhésions.",
    done: false,
  },
  {
    saison: "2027 / 2028",
    montant: "25 – 32 K€",
    statut: "Cible",
    note: "Conventions pluriannuelles + montée en gamme des prestations.",
    done: false,
  },
  {
    saison: "2028",
    montant: "36 – 50 K€",
    statut: "Cible",
    note: "Structure établie. Seuil d'un premier salarié coordinateur.",
    done: false,
  },
];

// ---- Roadmap par horizon ----
const HORIZONS = [
  {
    titre: "Horizon 1 — Stabiliser",
    periode: "Mai 2026 → Avril 2027",
    objectif:
      "Professionnaliser sans régresser, préparer le terrain. Priorité absolue : jury CDA.",
    points: [
      "Maintenir les prestations existantes, activer le canal devis du site.",
      "Pré-rédiger le dossier FDVA Fonctionnement (dépôt janvier 2027).",
      "Lancer une adhésion symbolique à la rentrée 2026 + bouton don.",
      "Compta carrée saison 2025/2026, local Pigeonnier opérationnel.",
    ],
  },
  {
    titre: "Horizon 2 — Changer de dimension",
    periode: "Avril 2027 → Décembre 2028",
    objectif:
      "Jury passé : viser les conventions pluriannuelles qui changent tout.",
    points: [
      "Convention Politique de la Ville Amiens Métropole (10–25 K€/an).",
      "Convention A3 Culture / équipements de proximité (15–40 K€/an).",
      "Cité Éducative Étouvie + agrément JEP pour les financements ANS.",
      "Adhésions structurées (15/30/50 €) : 50–80 adhérents/an.",
    ],
  },
  {
    titre: "Horizon 3 — Pérenniser",
    periode: "2029 → 2030",
    objectif:
      "Acteur reconnu de l'esport éducatif Hauts-de-France. VEA ne dépend plus à 100 % de Clavel.",
    points: [
      "1er salarié coordinateur (>50 K€/an dont 30 K€ de subventions récurrentes).",
      "Duplication territoriale en partenariat (Abbeville, Beauvais…).",
      "Articulation VENA / VEA : le commercial privé bascule sur VENA.",
      "Agrément ESUS (accès Banque des Territoires, France Active).",
    ],
  },
];

// ---- 5 conditions critiques ----
const CONDITIONS = [
  {
    titre: "Jury CDA validé (avril 2027)",
    desc: "Priorité absolue. S'il est raté, tout le plan se décale de 6 mois minimum.",
  },
  {
    titre: "Local Pigeonnier réellement actif",
    desc: "Créneaux récurrents (club mercredi, soirée mensuelle, ateliers). Un local vide = bail récupérable par la Métropole.",
  },
  {
    titre: "Gouvernance au-delà de Clavel",
    desc: "Le bureau doit pouvoir tenir l'activité courante 2 mois sans Clavel (Tony, compta, démarches).",
  },
  {
    titre: "Documentation d'impact systématique",
    desc: "Sans chiffres, pas de subventions. Le site collecte participants, heures, démographie, engagement — à exploiter dès septembre 2026.",
  },
  {
    titre: "Positionnement cohérent maintenu",
    desc: "VEA = inclusion + prévention + cohésion sociale via gaming. Pas de dérive compétition pure (perte de 80 % des financements).",
  },
];

export default async function PresidentPage() {
  // Garde : reserve aux owners (presidents). Editor non-owner -> message clair.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/president");

  const isOwner = await hasPermission("vea", "owner");
  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-vea-bg">
        <div className="card-clean p-8 max-w-md w-full text-center">
          <span className="badge-red mb-4 inline-block">Accès restreint</span>
          <h1 className="text-2xl font-bold text-vea-text mb-3">
            Espace réservé aux{" "}
            <span className="text-vea-accent">présidents</span>
          </h1>
          <p className="text-sm text-vea-text-muted mb-6">
            Cette page est accessible uniquement à Alban et Clavel (rôle
            propriétaire sur VEA).
          </p>
          <Link href="/admin" className="btn-primary inline-block">
            Retour au dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div>
            <span className="badge-red mb-3 inline-block">Espace Président</span>
            <h1 className="text-3xl sm:text-4xl font-black text-vea-text">
              Stratégie &amp; roadmap
            </h1>
            <p className="text-vea-text-muted text-sm mt-1">
              Le cap de l&apos;association sur 3 ans — réservé à Alban et Clavel.
            </p>
          </div>
          <Link
            href="/admin"
            className="text-xs text-vea-text-dim hover:text-vea-accent transition-colors"
          >
            ← Retour au dashboard
          </Link>
        </div>

        {/* Vision */}
        <div className="card-clean p-6 sm:p-8 mb-10 bg-vea-accent-soft/30 border-l-4 border-l-vea-accent">
          <h2 className="text-xs uppercase tracking-widest text-vea-accent font-bold mb-2">
            Vision 2030
          </h2>
          <p className="text-lg sm:text-xl font-bold text-vea-text leading-snug">
            Faire passer VEA d&apos;une petite asso à 10 K€/an à une structure
            établie à 30–50 K€/an d&apos;ici fin 2028, puis un acteur reconnu de
            l&apos;esport éducatif des Hauts-de-France à horizon 2030.
          </p>
          <p className="text-sm text-vea-text-muted mt-3">
            Contrainte forte : survie + jury CDA en priorité absolue jusqu&apos;à
            avril 2027, puis expansion mesurée.
          </p>
        </div>

        {/* Fil rouge financier */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-vea-text mb-1">
            Fil rouge financier
          </h2>
          <p className="text-sm text-vea-text-muted mb-5">
            L&apos;objectif de chiffre par saison — le cap à tenir.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FIL_ROUGE.map((f) => (
              <div
                key={f.saison}
                className={`card-clean p-5 ${
                  f.done ? "border-l-4 border-l-vea-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-widest text-vea-text-dim font-semibold">
                    {f.saison}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      f.done
                        ? "bg-vea-accent-soft text-vea-accent"
                        : "bg-vea-bg text-vea-text-muted border border-vea-border"
                    }`}
                  >
                    {f.statut}
                  </span>
                </div>
                <div className="text-2xl font-black text-vea-text mb-2">
                  {f.montant}
                </div>
                <p className="text-xs text-vea-text-muted leading-relaxed">
                  {f.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Roadmap 3 horizons */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-vea-text mb-5">
            Roadmap sur 3 horizons
          </h2>
          <div className="space-y-4">
            {HORIZONS.map((h) => (
              <div key={h.titre} className="card-clean p-6">
                <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                  <h3 className="text-lg font-bold text-vea-text">{h.titre}</h3>
                  <span className="text-xs font-semibold text-vea-accent">
                    {h.periode}
                  </span>
                </div>
                <p className="text-sm text-vea-text-muted mb-4">{h.objectif}</p>
                <ul className="space-y-2">
                  {h.points.map((p) => (
                    <li
                      key={p}
                      className="text-sm text-vea-text flex gap-2 leading-relaxed"
                    >
                      <span className="text-vea-accent font-bold flex-shrink-0">
                        —
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Projet phare */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-vea-text mb-5">
            Projet phare de l&apos;année
          </h2>
          <div className="card-clean p-6 sm:p-8">
            <h3 className="text-lg font-bold text-vea-text mb-2">
              Amiens Roule dans ses Quartiers
            </h3>
            <p className="text-sm text-vea-text-muted leading-relaxed">
              Initiative de découverte des jeux esport dans les quartiers
              prioritaires : VEA se greffe sur des temps forts existants (Open
              Gym 100 % féminin × MABB à Étouvie, Happy Eid × Jeunesse en Or en
              Amiens Nord, tournois Switch 2 + PS5) pour toucher de nouveaux
              publics là où ils sont déjà. C&apos;est le fil conducteur terrain
              de la saison et la matière des futurs dossiers de subvention.
            </p>
          </div>
        </section>

        {/* 5 conditions critiques */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-vea-text mb-1">
            Les 5 conditions critiques
          </h2>
          <p className="text-sm text-vea-text-muted mb-5">
            Ce qui détermine si le plan tient ou s&apos;effondre.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CONDITIONS.map((c, i) => (
              <div key={c.titre} className="card-clean p-5 flex gap-4">
                <div className="text-2xl font-black text-vea-accent/30 leading-none">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-vea-text mb-1">
                    {c.titre}
                  </h3>
                  <p className="text-xs text-vea-text-muted leading-relaxed">
                    {c.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Lien Notion */}
        <div className="card-clean p-6 text-center bg-vea-bg">
          <p className="text-sm text-vea-text-muted mb-4">
            Cette page est un résumé. La stratégie complète, vivante et détaillée
            (cibles subventions, calendriers, points de vigilance) reste dans
            Notion.
          </p>
          <a
            href={NOTION_STRATEGIE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline inline-block"
          >
            Ouvrir la stratégie complète dans Notion ↗
          </a>
        </div>
      </div>
    </div>
  );
}
