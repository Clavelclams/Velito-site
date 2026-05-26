/**
 * /admin/evenements/[id] — Detail event admin avec edition motifs.
 *
 * Server Component. Permission editor+ sur vea requise.
 *
 * Recap :
 *   1. Lit l'event via [id] (le slug ou l'UUID — on essaie les 2)
 *   2. Fetch toutes les presences de l'event + jointure participants
 *   3. Agrege par participant -> liste avec motifs[] cumulés
 *   4. Affiche le QR code + meta event + ParticipantsList (client)
 *
 * Use case principal : qq1 a scanné "jouer" mais l'admin veut ajouter "aider"
 * apres car la personne a aussi range. -> Coche la case "aider" -> save.
 */
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";
import { getScanUrl, getQRCodeUrl } from "@/lib/qrcode";
import ParticipantsList, { type ParticipantRow } from "./ParticipantsList";
import AddManualParticipantForm from "./AddManualParticipantForm";
import EditEventForm from "./EditEventForm";
import BilanEventForm from "./BilanEventForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

type Motif = "jouer" | "aider" | "regarder";

export default async function AdminEventDetailPage({ params }: PageProps) {
  const { id } = await params;

  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) redirect("/admin?denied=events");

  const supabase = await createClient();

  // Fetch event : on essaie d'abord par event_slug (cas commun), puis par id UUID
  let { data: event } = await supabase
    .schema("vea")
    .from("evenements")
    .select("id, nom, event_slug, date, heure, lieu, type, description, statut, token, scan_actif, capacite, bilan_public, bilan_recap, bilan_nb_total, bilan_nb_filles, bilan_nb_garcons, bilan_nb_joueurs, bilan_nb_spectateurs, bilan_nb_benevoles, bilan_show_total, bilan_show_genre, bilan_show_joueurs, bilan_show_spectateurs, bilan_show_benevoles")
    .eq("event_slug", id)
    .maybeSingle();

  if (!event && /^[0-9a-f-]{36}$/i.test(id)) {
    const r = await supabase
      .schema("vea")
      .from("evenements")
      .select("id, nom, event_slug, date, heure, lieu, type, description, statut, token, scan_actif, capacite, bilan_public, bilan_recap, bilan_nb_total, bilan_nb_filles, bilan_nb_garcons, bilan_nb_joueurs, bilan_nb_spectateurs, bilan_nb_benevoles, bilan_show_total, bilan_show_genre, bilan_show_joueurs, bilan_show_spectateurs, bilan_show_benevoles")
      .eq("id", id)
      .maybeSingle();
    event = r.data;
  }

  if (!event) notFound();

  // QR / scan URL
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "vea.velito.fr";
  const protocol = host.includes("localhost") ? "http" : "https";
  const siteOrigin = `${protocol}://${host}`;
  const scanUrl = getScanUrl(event.token, siteOrigin);
  const qrThumb = getQRCodeUrl(scanUrl, 200);
  const qrFull = getQRCodeUrl(scanUrl, 600);

  // Fetch presences + jointure participants (1 ligne par presence)
  const { data: presencesRaw } = await supabase
    .schema("vea")
    .from("presences")
    .select(`
      id, motif, heures_aide, participant_id,
      participants:participant_id (
        id, prenom, nom, sexe, date_naissance, phone, pre_inscrit
      )
    `)
    .eq("event_slug", event.event_slug);

  type PresenceRow = {
    id: string;
    motif: Motif;
    heures_aide: number;
    participant_id: string;
    participants: {
      id: string;
      prenom: string;
      nom: string;
      sexe: "F" | "M" | "X" | null;
      date_naissance: string | null;
      phone: string | null;
      pre_inscrit: boolean;
    } | null;
  };

  // Agrege par participant_id : 1 row UI par participant, motifs[] cumulé
  const byParticipant = new Map<string, ParticipantRow>();
  for (const p of (presencesRaw ?? []) as unknown as PresenceRow[]) {
    if (!p.participants) continue;
    const existing = byParticipant.get(p.participant_id);
    if (existing) {
      existing.motifs.push(p.motif);
      // Si "aider" est dans cette presence, on prend la valeur heures
      if (p.motif === "aider") {
        existing.heures_aide = p.heures_aide;
      }
    } else {
      byParticipant.set(p.participant_id, {
        participant_id: p.participant_id,
        prenom: p.participants.prenom,
        nom: p.participants.nom,
        sexe: p.participants.sexe,
        date_naissance: p.participants.date_naissance,
        phone: p.participants.phone,
        pre_inscrit: p.participants.pre_inscrit,
        motifs: [p.motif],
        heures_aide: p.motif === "aider" ? p.heures_aide : 0,
      });
    }
  }

  const participants = [...byParticipant.values()].sort((a, b) =>
    `${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`)
  );

  // Previsionnel "monde attendu" (table vea.preinscriptions_event).
  // Tolerant : si la table n'existe pas encore (migration non lancee), data=null -> 0.
  const { data: preRaw } = await supabase
    .schema("vea")
    .from("preinscriptions_event")
    .select(`participant_id, participants:participant_id ( prenom, nom )`)
    .eq("event_slug", event.event_slug);
  type PreRow = { participant_id: string; participants: { prenom: string; nom: string } | null };
  const preinscrits = ((preRaw ?? []) as unknown as PreRow[])
    .map((r) => (r.participants ? `${r.participants.prenom} ${r.participants.nom}` : null))
    .filter((x): x is string => !!x);
  const mondeAttendu = preinscrits.length;

  const dateStr = new Date(event.date).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // Stats par motif
  const stats = {
    total: participants.length,
    joueurs: participants.filter((p) => p.motifs.includes("jouer")).length,
    aidants: participants.filter((p) => p.motifs.includes("aider")).length,
    spectateurs: participants.filter((p) => p.motifs.includes("regarder")).length,
    multi: participants.filter((p) => p.motifs.length > 1).length,
    preInscrits: participants.filter((p) => p.pre_inscrit).length,
    filles: participants.filter((p) => p.sexe === "F").length,
    garcons: participants.filter((p) => p.sexe === "M").length,
    sexeNR: participants.filter((p) => !p.sexe || p.sexe === "X").length,
  };

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/evenements" className="text-xs text-vea-text-dim hover:text-vea-accent">
            ← Retour /admin/evenements
          </Link>
        </div>

        {/* Header event + QR */}
        <div className="card-clean p-6 mb-6 flex items-start gap-4 flex-wrap">
          <a
            href={qrFull}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 block w-28 h-28 border border-vea-border rounded-lg overflow-hidden hover:border-vea-accent transition-colors"
            title="Voir QR HD"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrThumb} alt="QR" width={112} height={112} className="w-full h-full" />
          </a>
          <div className="flex-1 min-w-0">
            <span className="badge-red mb-2 inline-block">Admin event</span>
            <h1 className="text-2xl sm:text-3xl font-black text-vea-text">
              {event.nom}
            </h1>
            <p className="text-sm text-vea-text-muted mt-1">
              {dateStr} · {event.lieu} · {event.type}
            </p>
            {event.description && (
              <p className="text-xs text-vea-text-dim mt-2 italic">{event.description}</p>
            )}
            <p className="text-[10px] text-vea-text-dim font-mono break-all mt-3">
              {scanUrl}
            </p>
          </div>
        </div>

        {/* Édition de l'événement (date, lieu, infos) */}
        <EditEventForm
          event={{
            id: event.id,
            event_slug: event.event_slug,
            nom: event.nom,
            date: event.date,
            heure: (event as { heure?: string | null }).heure ?? null,
            lieu: event.lieu,
            type: event.type,
            description: event.description,
            capacite: (event as { capacite?: number | null }).capacite ?? null,
          }}
        />

        {/* Bilan public (chiffres editoriaux + visibilite) */}
        <BilanEventForm
          event={{
            id: event.id,
            event_slug: event.event_slug,
            bilan_public: (event as { bilan_public?: boolean }).bilan_public ?? false,
            bilan_recap: (event as { bilan_recap?: string | null }).bilan_recap ?? null,
            bilan_nb_total: (event as { bilan_nb_total?: number | null }).bilan_nb_total ?? null,
            bilan_nb_filles: (event as { bilan_nb_filles?: number | null }).bilan_nb_filles ?? null,
            bilan_nb_garcons: (event as { bilan_nb_garcons?: number | null }).bilan_nb_garcons ?? null,
            bilan_nb_joueurs: (event as { bilan_nb_joueurs?: number | null }).bilan_nb_joueurs ?? null,
            bilan_nb_spectateurs: (event as { bilan_nb_spectateurs?: number | null }).bilan_nb_spectateurs ?? null,
            bilan_nb_benevoles: (event as { bilan_nb_benevoles?: number | null }).bilan_nb_benevoles ?? null,
            bilan_show_total: (event as { bilan_show_total?: boolean }).bilan_show_total ?? true,
            bilan_show_genre: (event as { bilan_show_genre?: boolean }).bilan_show_genre ?? true,
            bilan_show_joueurs: (event as { bilan_show_joueurs?: boolean }).bilan_show_joueurs ?? true,
            bilan_show_spectateurs: (event as { bilan_show_spectateurs?: boolean }).bilan_show_spectateurs ?? true,
            bilan_show_benevoles: (event as { bilan_show_benevoles?: boolean }).bilan_show_benevoles ?? false,
          }}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <StatBox label="Total" value={stats.total} />
          <StatBox label="Joueurs" value={stats.joueurs} />
          <StatBox label="Benevoles" value={stats.aidants} />
          <StatBox label="Spectateurs" value={stats.spectateurs} />
          <StatBox label="Multi-roles" value={stats.multi} />
        </div>

        {/* Mixite auto — calculee depuis le sexe des fiches (pre-inscription ou compte) */}
        <div className="card-clean p-4 mb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <h3 className="text-sm font-bold text-vea-text">Mixite filles / garcons (auto)</h3>
            <span className="text-xs font-semibold text-vea-accent">
              {stats.filles + stats.garcons > 0
                ? `${Math.round((stats.filles / (stats.filles + stats.garcons)) * 100)}% filles / ${100 - Math.round((stats.filles / (stats.filles + stats.garcons)) * 100)}% garcons`
                : "Aucun sexe renseigne"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Filles" value={stats.filles} />
            <StatBox label="Garcons" value={stats.garcons} />
            <StatBox label="Sexe non renseigne" value={stats.sexeNR} />
          </div>
          {stats.sexeNR > 0 && (
            <p className="text-[11px] text-vea-text-dim mt-3 italic">
              {stats.sexeNR} fiche{stats.sexeNR > 1 ? "s" : ""} sans sexe renseigne : le ratio ne porte que sur les {stats.filles + stats.garcons} fiches ou le sexe est connu. Complete-les via /admin/bilan.
            </p>
          )}
        </div>
        {stats.preInscrits > 0 && (
          <p className="text-[11px] text-vea-text-dim mb-6 italic">
            Dont {stats.preInscrits} pre-inscrit{stats.preInscrits > 1 ? "s" : ""} (sans compte VEA — merge auto par nom+prenom+tel).
          </p>
        )}

        {/* Monde attendu (previsionnel depuis l'agenda) */}
        <div className="card-clean p-5 mb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
            <h3 className="text-sm font-bold text-vea-text">Monde attendu (previsionnel)</h3>
            <span className="text-2xl font-black text-vea-accent">{mondeAttendu}</span>
          </div>
          <p className="text-xs text-vea-text-muted leading-relaxed">
            Personnes qui ont cliqu&eacute; &laquo;&nbsp;Je serai pr&eacute;sent&nbsp;&raquo; depuis l&apos;agenda.
            Indicatif, sans XP &mdash; la pr&eacute;sence r&eacute;elle se valide au scan le jour J.
          </p>
          {preinscrits.length > 0 && (
            <p className="text-xs text-vea-text-dim mt-3 leading-relaxed">{preinscrits.join(", ")}</p>
          )}
        </div>

        {/* Raccourci action exceptionnelle / urgence benevole (20/05/2026) */}
        <div className="card-clean p-4 mb-6 border border-vea-accent/20 bg-vea-accent-soft/30">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-vea-text mb-1">
                Action exceptionnelle / urgence
              </h3>
              <p className="text-xs text-vea-text-muted leading-relaxed">
                Cas type : un benevole a depanne hors scan (pret de voiture,
                materiel, transport jeune…). Tu attribues l&apos;XP a la main
                avec une description pour l&apos;audit.
              </p>
            </div>
            <Link
              href={`/admin/heures?event=${encodeURIComponent(event.nom)}`}
              className="shrink-0 text-[10px] uppercase tracking-widest font-bold px-3 py-2 rounded-full bg-vea-accent text-white hover:bg-vea-accent-hover transition-colors"
            >
              + Attribuer XP / heures
            </Link>
          </div>
        </div>

        <h2 className="text-lg font-bold text-vea-text mb-4">
          Participants ({participants.length})
        </h2>

        <p className="text-xs text-vea-text-muted mb-4 leading-relaxed">
          Coche / decoche les motifs. Au moins 1 motif doit rester coche
          (sinon utilise &quot;Retirer&quot; pour sortir le participant).
          Les XP sont recalcules automatiquement quand tu modifies.
        </p>

        {/* Form pour ajouter un participant qui n'a pas pu scanner */}
        <AddManualParticipantForm
          eventToken={event.token}
          eventName={event.nom}
        />

        <ParticipantsList eventSlug={event.event_slug} participants={participants} />
      </div>
    </div>
  );
}

// Mini stat box
function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-clean p-3 text-center">
      <div className="text-2xl font-black text-vea-text">{value}</div>
      <div className="text-[9px] uppercase tracking-widest font-bold text-vea-text-muted mt-1">
        {label}
      </div>
    </div>
  );
}
