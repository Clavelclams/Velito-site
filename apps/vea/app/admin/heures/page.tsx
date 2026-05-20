/**
 * /admin/heures — Page admin pour attribuer XP / heures benevolat manuellement.
 *
 * Server Component. Verifie permissions au chargement (hasPermission editor+
 * sur l'org vea). Si pas autorise, redirige vers /admin (qui affichera "acces
 * restreint" — pas vers /login car le user est probablement connecte).
 *
 * Charge la liste de TOUS les participants pour le select du form.
 * (Optimisation future : pagination ou recherche cote serveur si la liste
 * depasse les 200 participants, mais pour l'instant on a ~100 max.)
 *
 * Affiche aussi en bas un historique des 20 derniers logs_xp crees par
 * l'admin connecte (pour qu'il puisse verifier qu'il a bien ajoute la bonne
 * personne).
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";
import AddHeuresForm, { type ParticipantOption } from "./AddHeuresForm";

// force-dynamic : on a besoin de la liste fraiche des participants a chaque visite
// (un participant peut avoir ete ajoute depuis la derniere visite)
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<{ event?: string }>;
}

export default async function AdminHeuresPage({ searchParams }: PageProps = {}) {
  // 20/05/2026 : si on arrive depuis /admin/evenements/[id] avec ?event=NOM,
  // on pre-remplit la description du form avec le contexte event entre crochets.
  const params = await (searchParams ?? Promise.resolve({}));
  const eventContext = params.event ?? "";
  // 1. Verification permission (editor+ sur org vea)
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) {
    redirect("/admin?denied=heures");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/admin/heures");
  }

  // 2. Liste des participants pour le select
  // On exclut les fiches archivees / sans nom (rares)
  const { data: participantsRaw } = await supabase
    .schema("vea")
    .from("participants")
    .select("id, prenom, nom, pseudo, role, xp_saison_actuelle")
    .order("prenom", { ascending: true });

  const participants: ParticipantOption[] = (participantsRaw ?? [])
    .filter((p) => p.prenom && p.nom)
    .map((p) => ({
      id: p.id,
      prenom: p.prenom,
      nom: p.nom,
      pseudo: p.pseudo,
      role: p.role,
      xp_saison_actuelle: Number(p.xp_saison_actuelle ?? 0),
    }));

  // 3. Historique des 20 derniers logs XP crees par cet admin
  const { data: recentLogs } = await supabase
    .schema("vea")
    .from("logs_xp")
    .select(
      "id, action, xp_gagne, description, saison, created_at, participants(prenom, nom)"
    )
    .eq("cree_par", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  type LogRow = {
    id: string;
    action: string;
    xp_gagne: number;
    description: string | null;
    saison: string;
    created_at: string;
    participants: { prenom: string; nom: string } | null;
  };
  const logs = (recentLogs ?? []) as unknown as LogRow[];

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb / nav */}
        <div className="mb-6">
          <Link
            href="/admin"
            className="text-xs text-vea-text-dim hover:text-vea-accent transition-colors"
          >
            ← Retour /admin
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <span className="badge-red mb-3 inline-block">Admin VEA</span>
          <h1 className="text-3xl sm:text-4xl font-black text-vea-text mb-2">
            Attribuer des <span className="text-vea-accent">heures / XP</span>
          </h1>
          <p className="text-sm text-vea-text-muted leading-relaxed">
            Ajoute des heures de bénévolat ou attribue de l&apos;XP manuellement
            à un participant. Le système calcule automatiquement le nouveau
            niveau, attribue les badges saisonniers et crédite les points VENA
            si un seuil est franchi.
          </p>
          <div className="mt-4 inline-block bg-vea-accent-soft border border-vea-accent/20 rounded-lg px-3 py-1.5 text-[11px] text-vea-text">
            <span className="font-semibold">Barème XP</span> : bénévolat 1h ={" "}
            <strong>15 XP</strong> · tournoi <strong>+10</strong> · podium{" "}
            <strong>+5</strong> · urgent <strong>+20</strong> · manuel libre
          </div>
        </div>

        {/* Si on vient d'un raccourci event, on l'affiche en bandeau */}
        {eventContext && (
          <div className="card-clean p-3 mb-4 border border-vea-accent/30 bg-vea-accent-soft/40">
            <p className="text-xs text-vea-text">
              <span className="font-bold">Contexte event :</span> {eventContext}
            </p>
            <p className="text-[10px] text-vea-text-dim italic mt-0.5">
              La description du form sera pre-remplie avec ce contexte.
            </p>
          </div>
        )}

        {/* Form */}
        <AddHeuresForm
          participants={participants}
          initialDescription={
            eventContext ? `[${eventContext}] ` : ""
          }
          initialAction={eventContext ? "urgent" : "benevolat"}
        />

        {/* Historique recent */}
        {logs.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold text-vea-text mb-4">
              Tes 20 dernières attributions
            </h2>
            <div className="space-y-2">
              {logs.map((log) => {
                const dateStr = new Date(log.created_at).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const participantName = log.participants
                  ? `${log.participants.prenom} ${log.participants.nom}`
                  : "(inconnu)";
                return (
                  <div
                    key={log.id}
                    className="card-clean p-3 flex items-center gap-4 text-xs"
                  >
                    <span className="font-bold text-vea-accent shrink-0 w-16 text-right">
                      +{log.xp_gagne} XP
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-vea-text">
                        {participantName}
                      </div>
                      <div className="text-vea-text-muted truncate">
                        {log.description || `(action: ${log.action})`}
                      </div>
                    </div>
                    <span className="text-vea-text-dim shrink-0 text-[10px]">
                      {dateStr}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
