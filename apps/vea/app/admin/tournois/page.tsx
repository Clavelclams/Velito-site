/**
 * /admin/tournois — Gestion des tournois online + presentiel VEA.
 *
 * V1 (20/05/2026) : liste les tournois existants avec leurs participants.
 *   Pas encore de form de creation ici (faudra le coder en V2). En attendant,
 *   les tournois s'ajoutent via SQL direct ou via le seed (cf vea-tournois-online-v1.sql).
 *
 * Distinct des events terrain :
 *   - Pas d'XP civique attribue (les tournois competitifs ne sont pas du benevolat)
 *   - Le badge "vainqueur-online" / "vainqueur-presentiel" est attribue auto
 *     via trigger AFTER INSERT sur vea.tournoi_participants si resultat='champion'
 *
 * V2 a faire :
 *   - Form creation/edition tournoi
 *   - Form ajout participants avec drag-and-drop equipiers
 *   - Bouton "Marquer comme vainqueur" qui set resultat='champion' + cascade badge
 *   - Vue par equipe (vea.equipes)
 *   - Stats (top jeux, top vainqueurs, cash prize total)
 *
 * Permission editor+ sur vea.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";

export const dynamic = "force-dynamic";

interface TournoiRow {
  id: string;
  nom: string;
  jeu: string;
  date_debut: string;
  date_fin: string | null;
  mode: "online" | "presentiel" | "hybride";
  format: string;
  niveau: string;
  resultat: string | null;
  cash_prize: number | null;
  description: string | null;
  saison: string | null;
}

interface ParticipantRow {
  tournoi_id: string;
  role_dans_equipe: string;
  pseudo_utilise: string | null;
  participants: {
    prenom: string;
    nom: string;
    pseudo: string | null;
    est_mineur: boolean | null;
  } | null;
}

function displayName(p: {
  prenom: string;
  nom: string;
  est_mineur: boolean | null;
}): string {
  // RGPD : meme regle qu'ailleurs (mineur -> prenom + initiale)
  if (p.est_mineur) {
    const initiale = (p.nom ?? "").trim().charAt(0).toUpperCase();
    return `${p.prenom} ${initiale}.`;
  }
  return `${p.prenom} ${p.nom}`;
}

export default async function AdminTournoisPage() {
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) redirect("/admin?denied=tournois");

  const supabase = await createClient();

  // Liste tous les tournois
  const { data: tournoisRaw } = await supabase
    .schema("vea")
    .from("tournois")
    .select(
      "id, nom, jeu, date_debut, date_fin, mode, format, niveau, resultat, cash_prize, description, saison"
    )
    .order("date_debut", { ascending: false });
  const tournois = (tournoisRaw ?? []) as TournoiRow[];

  // Liste tous les participants en 1 query
  const tournoiIds = tournois.map((t) => t.id);
  const { data: participantsRaw } =
    tournoiIds.length > 0
      ? await supabase
          .schema("vea")
          .from("tournoi_participants")
          .select(
            "tournoi_id, role_dans_equipe, pseudo_utilise, participants(prenom, nom, pseudo, est_mineur)"
          )
          .in("tournoi_id", tournoiIds)
      : { data: [] };
  const participantsByTournoi = new Map<string, ParticipantRow[]>();
  for (const row of (participantsRaw ?? []) as unknown as ParticipantRow[]) {
    const list = participantsByTournoi.get(row.tournoi_id) ?? [];
    list.push(row);
    participantsByTournoi.set(row.tournoi_id, list);
  }

  // Stats simples
  const totalTournois = tournois.length;
  const totalVictoires = tournois.filter((t) => t.resultat === "champion").length;
  const totalCashPrize = tournois.reduce(
    (sum, t) => sum + Number(t.cash_prize ?? 0),
    0
  );

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
            Tournois <span className="text-vea-accent">online</span> & présentiel
          </h1>
          <p className="text-sm text-vea-text-muted leading-relaxed">
            Liste des compétitions où des membres ont représenté VEA. Distinct
            du système d&apos;événements terrain : pas d&apos;XP bénévolat, mais
            palmarès visible sur les profils joueurs et matière utile pour les
            dossiers de subvention esport.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="card-clean p-4 text-center">
            <div className="text-2xl font-black text-vea-accent">{totalTournois}</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">
              Tournois total
            </p>
          </div>
          <div className="card-clean p-4 text-center">
            <div className="text-2xl font-black text-amber-600">{totalVictoires}</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">
              Victoires
            </p>
          </div>
          <div className="card-clean p-4 text-center">
            <div className="text-2xl font-black text-vea-text">{totalCashPrize}€</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">
              Cash prize cumulé
            </p>
          </div>
        </div>

        {/* Aide V1 */}
        <div className="card-clean p-4 mb-6 border border-vea-accent/20 bg-vea-accent-soft/30">
          <p className="text-xs text-vea-text-muted leading-relaxed">
            <strong className="text-vea-text">V1 — Lecture seule</strong>. Le
            formulaire de création de tournoi sera ajouté en V2. En attendant,
            tu peux ajouter un tournoi via SQL direct dans Supabase Dashboard
            (cf <code className="text-vea-accent">vea-tournois-online-v1.sql</code>).
          </p>
        </div>

        {/* Liste */}
        {tournois.length === 0 ? (
          <div className="card-clean p-8 text-center">
            <p className="text-sm text-vea-text-muted">
              Aucun tournoi enregistré pour le moment.
            </p>
            <p className="text-xs text-vea-text-dim mt-2 italic">
              Exécute la migration SQL{" "}
              <code className="text-vea-accent">vea-tournois-online-v1.sql</code>{" "}
              pour seeder le premier tournoi (Ugo Mamba R6 2025/26).
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tournois.map((t) => {
              const participants = participantsByTournoi.get(t.id) ?? [];
              return (
                <div key={t.id} className="card-clean p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-vea-accent-soft text-vea-accent">
                          {t.jeu}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-vea-text-dim">
                          {t.mode === "online"
                            ? "En ligne"
                            : t.mode === "presentiel"
                            ? "Présentiel"
                            : "Hybride"}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-vea-text-dim">
                          {t.format}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-vea-text-dim">
                          Niveau {t.niveau}
                        </span>
                        {t.resultat === "champion" && (
                          <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                            Champion
                          </span>
                        )}
                        {t.resultat &&
                          t.resultat !== "champion" && (
                            <span className="text-[10px] uppercase tracking-widest text-vea-text-dim">
                              {t.resultat}
                            </span>
                          )}
                      </div>
                      <h3 className="text-base font-bold text-vea-text leading-tight">
                        {t.nom}
                      </h3>
                      <p className="text-xs text-vea-text-muted mt-1">
                        {new Date(t.date_debut).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        {t.date_fin && t.date_fin !== t.date_debut && (
                          <>
                            {" → "}
                            {new Date(t.date_fin).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </>
                        )}
                        {t.saison && <> · saison {t.saison}</>}
                        {/* 20/05/2026 fix : t.cash_prize=0 (number) etait truthy
                            dans le `&&` gauche et React rendait "0" -> "2025/260".
                            On cast explicitement en Number et compare > 0 directement. */}
                        {Number(t.cash_prize ?? 0) > 0 && (
                          <> · {Number(t.cash_prize).toFixed(2)}€</>
                        )}
                      </p>
                      {t.description && (
                        <p className="text-xs text-vea-text-muted mt-2 italic">
                          {t.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Participants */}
                  {participants.length > 0 && (
                    <div className="pt-3 border-t border-vea-border">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-vea-text-dim mb-2">
                        Représentants VEA
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {participants.map((p, i) => {
                          if (!p.participants) return null;
                          const name = displayName(p.participants);
                          const pseudo =
                            p.pseudo_utilise || p.participants.pseudo || "";
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-vea-border"
                            >
                              <span className="text-xs font-semibold text-vea-text">
                                {name}
                              </span>
                              {pseudo && (
                                <span className="text-[10px] text-vea-text-dim font-mono">
                                  ({pseudo})
                                </span>
                              )}
                              {p.role_dans_equipe === "capitaine" && (
                                <span className="text-[9px] uppercase tracking-widest font-bold text-vea-accent">
                                  C
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-vea-text-dim italic mt-8 text-center">
          V2 à venir : formulaire de création + édition + suppression de
          tournois directement depuis cette page. Le badge vainqueur online /
          présentiel s&apos;attribue automatiquement quand un participant est
          ajouté à un tournoi avec resultat = champion.
        </p>
      </div>
    </div>
  );
}
