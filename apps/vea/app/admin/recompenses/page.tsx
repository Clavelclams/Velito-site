/**
 * /admin/recompenses — Liste des Old VEA qui ont droit a des recompenses
 * mais ne les ont pas (encore) reclamees.
 *
 * Contexte :
 * Les anciens membres seedes depuis Yapla (87 NSP + 13 NULL) ont accumule
 * un historique d'events et d'heures benevolat. Selon ce score, ils ont
 * droit a des recompenses (REWARDS_BY_LEVEL : niveau 3 = lot partenaire,
 * niveau 5 = T-shirt, niveau 10 = tenue complete). Mais ces recompenses
 * ne peuvent etre reclamees QUE quand ils ont cree leur compte VEA.
 *
 * Cette page liste donc :
 *   1. Les Old VEA qui ont franchi un seuil de recompense
 *   2. Indique s'ils ont deja un compte (user_id NOT NULL) ou pas
 *   3. Donne le contact (email / pas d'email) pour relancer
 *
 * Permission editor+ sur vea.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";

export const dynamic = "force-dynamic";

// Formule "niveau estime retroactif" pour les Old VEA (qui n'ont pas
// d'XP_saison_actuelle puisque la saison 2026/27 demarre en sept 2026).
// Reprise de ProgressionDashboard.tsx pour coherence.
function computeNiveauOldEstime(events: number, heures: number): number {
  const score = events * 5 + heures * 0.5;
  return Math.floor(score / 100) + 1;
}

// Seuils de recompenses (sync avec lib/gamification.ts REWARDS_BY_LEVEL)
const SEUILS_RECOMPENSES = [
  { niveau: 3, recompense: "Lot partenaire + 1 point VENA" },
  { niveau: 5, recompense: "T-shirt VEA + Badge Guerrier + 2 points VENA" },
  { niveau: 10, recompense: "Tenue complete + Badge Legende + 5 points VENA" },
];

function getRecompensesDues(niveau: number): { niveau: number; recompense: string }[] {
  return SEUILS_RECOMPENSES.filter((s) => niveau >= s.niveau);
}

export default async function AdminRecompensesPage() {
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) redirect("/admin?denied=recompenses");

  const supabase = await createClient();

  // Fetch tous les participants avec leur historique Old VEA
  // (events_old + benevole_hours - benevole_hours_2026_2027 = heures pre 2026/27)
  const { data: participantsRaw } = await supabase
    .schema("vea")
    .from("participants")
    .select(
      "id, prenom, nom, email, user_id, role, events_old, benevole_hours, benevole_hours_2026_2027, est_mineur"
    )
    .order("nom", { ascending: true });

  type ParticipantRow = {
    id: string;
    prenom: string;
    nom: string;
    email: string | null;
    user_id: string | null;
    role: string | null;
    events_old: number | null;
    benevole_hours: number | null;
    benevole_hours_2026_2027: number | null;
    est_mineur: boolean | null;
  };

  // RGPD : pour les mineurs, on n'affiche QUE le prenom + initiale du nom
  // (regle absolue heritee du CDC VEA, decision Clavel + bureau).
  function displayName(p: { prenom: string; nom: string; est_mineur: boolean | null }): string {
    if (p.est_mineur) {
      const initiale = (p.nom ?? "").trim().charAt(0).toUpperCase();
      return `${p.prenom} ${initiale}.`;
    }
    return `${p.prenom} ${p.nom}`;
  }

  const participants = (participantsRaw ?? []) as ParticipantRow[];

  // Filtrer : Old VEA = ceux qui ont un historique avant la saison actuelle
  // -> events_old > 0 OU heures pre-2026/27 > 0
  type EnrichedParticipant = ParticipantRow & {
    heuresOld: number;
    niveauEstime: number;
    recompensesDues: { niveau: number; recompense: string }[];
    aUnCompte: boolean;
  };

  const concernes: EnrichedParticipant[] = participants
    .map((p) => {
      const events = Number(p.events_old ?? 0);
      const heuresTotal = Number(p.benevole_hours ?? 0);
      const heuresCurrent = Number(p.benevole_hours_2026_2027 ?? 0);
      const heuresOld = Math.max(0, heuresTotal - heuresCurrent);
      const niveauEstime = computeNiveauOldEstime(events, heuresOld);
      const recompensesDues = getRecompensesDues(niveauEstime);
      return {
        ...p,
        heuresOld,
        niveauEstime,
        recompensesDues,
        aUnCompte: p.user_id !== null,
      };
    })
    .filter((p) => p.recompensesDues.length > 0)
    .sort((a, b) => b.niveauEstime - a.niveauEstime);

  // Stats
  const totalConcernes = concernes.length;
  const avecCompte = concernes.filter((p) => p.aUnCompte).length;
  const sansCompte = totalConcernes - avecCompte;
  const avecEmail = concernes.filter((p) => !p.aUnCompte && p.email).length;

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-xs text-vea-text-dim hover:text-vea-accent">
            ← Retour /admin
          </Link>
        </div>

        <div className="mb-8">
          <span className="badge-red mb-3 inline-block">Admin VEA</span>
          <h1 className="text-3xl sm:text-4xl font-black text-vea-text mb-2">
            Récompenses <span className="text-vea-accent">Old VEA</span> à réclamer
          </h1>
          <p className="text-sm text-vea-text-muted leading-relaxed">
            Les anciens membres qui ont atteint un niveau récompense via leur
            historique (events + heures bénévolat). Le niveau est estimé
            rétroactivement avec la formule events × 5 + heures × 0.5. Ils
            doivent créer leur compte VEA pour réclamer.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="card-clean p-4 text-center">
            <div className="text-2xl font-black text-vea-accent">{totalConcernes}</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">
              Concernés
            </p>
          </div>
          <div className="card-clean p-4 text-center">
            <div className="text-2xl font-black text-emerald-600">{avecCompte}</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">
              Ont un compte
            </p>
          </div>
          <div className="card-clean p-4 text-center">
            <div className="text-2xl font-black text-vea-accent">{sansCompte}</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">
              Sans compte
            </p>
          </div>
          <div className="card-clean p-4 text-center">
            <div className="text-2xl font-black text-vea-text">{avecEmail}</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">
              Email connu (relancable)
            </p>
          </div>
        </div>

        {/* Aide */}
        <div className="card-clean p-4 mb-6 border border-vea-accent/20 bg-vea-accent-soft/30">
          <p className="text-xs text-vea-text-muted leading-relaxed">
            <strong className="text-vea-text">Workflow conseillé</strong> :{" "}
            {avecEmail > 0 ? (
              <>
                pour les <strong>{avecEmail}</strong>{" "}
                {avecEmail > 1 ? "anciens" : "ancien"} avec email connu, envoyer
                une relance type «&nbsp;Crée ton compte VEA, ta récompense
                t&apos;attend&nbsp;». Pour les autres, les contacter par
                téléphone ou en personne lors d&apos;un prochain event.
              </>
            ) : (
              <>
                aucun email connu pour les anciens sans compte. Les contacter
                par téléphone ou en personne lors d&apos;un prochain event.
              </>
            )}
          </p>
        </div>

        {/* Liste */}
        {concernes.length === 0 ? (
          <div className="card-clean p-8 text-center">
            <p className="text-sm text-vea-text-muted">
              Aucun ancien membre n&apos;a (encore) atteint un seuil de récompense.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {concernes.map((p) => (
              <div
                key={p.id}
                className="card-clean p-4 flex items-start justify-between gap-4 flex-wrap"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-bold text-vea-text">
                      {displayName(p)}
                    </h3>
                    {p.est_mineur && (
                      <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                        Mineur (anonymise)
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-vea-accent-soft text-vea-accent">
                      Niveau {p.niveauEstime}
                    </span>
                    {p.aUnCompte ? (
                      <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        A un compte
                      </span>
                    ) : p.email ? (
                      <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                        Sans compte (email connu)
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-vea-bg text-vea-text-dim">
                        Sans compte ni email
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-vea-text-muted mb-2">
                    {p.events_old ?? 0} events historiques · {p.heuresOld}h bénévolat ·{" "}
                    {p.role ?? "joueur"}
                  </p>
                  <div className="space-y-0.5">
                    {p.recompensesDues.map((r) => (
                      <p key={r.niveau} className="text-xs text-vea-text">
                        <span className="text-vea-accent font-semibold">Niveau {r.niveau}</span>
                        {" : "}
                        {r.recompense}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 flex flex-col gap-1 items-end">
                  {p.email && (
                    <a
                      href={`mailto:${p.email}?subject=Tes%20r%C3%A9compenses%20VEA%20t%27attendent&body=Salut%20${encodeURIComponent(p.prenom)}%2C%0A%0ATu%20as%20atteint%20le%20niveau%20${p.niveauEstime}%20gr%C3%A2ce%20%C3%A0%20ta%20pr%C3%A9sence%20historique%20chez%20VEA%20(${p.events_old ?? 0}%20events%2C%20${p.heuresOld}h%20b%C3%A9n%C3%A9volat).%0A%0ACr%C3%A9e%20ton%20compte%20sur%20https%3A%2F%2Fvea.velito.com%2Fsignup%20pour%20r%C3%A9clamer%20tes%20r%C3%A9compenses.%0A%0A--%0ALe%20bureau%20VEA`}
                      className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full bg-vea-accent text-white hover:bg-vea-accent-hover transition-colors"
                    >
                      Relancer par email
                    </a>
                  )}
                  {p.email && (
                    <p className="text-[9px] text-vea-text-dim font-mono truncate max-w-[200px]">
                      {p.email}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-[10px] text-vea-text-dim italic mt-8 text-center">
          Calcul rétroactif. La saison de l&apos;Éveil (2026/27) démarre en septembre 2026 ;
          ces niveaux estimés ne sont pas l&apos;XP en cours, juste un proxy pour repérer
          qui est éligible aux récompenses à débloquer.
        </p>
      </div>
    </div>
  );
}
