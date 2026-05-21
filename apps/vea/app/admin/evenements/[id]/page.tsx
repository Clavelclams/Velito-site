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
    .select("id, nom, event_slug, date, lieu, type, description, statut, token, scan_actif, capacite")
    .eq("event_slug", id)
    .maybeSingle();

  if (!event && /^[0-9a-f-]{36}$/i.test(id)) {
    const r = await supabase
      .schema("vea")
      .from("evenements")
      .select("id, nom, event_slug, date, lieu, type, description, statut, token, scan_actif, capacite")
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
  for (const p of (presencesRaw ?? []) as PresenceRow[]) {
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
            lieu: event.lieu,
            type: event.type,
            description: event.description,
            capacite: (event as { capacite?: number | null }).capacite ?? null,
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
        {stats.preInscrits > 0 && (
          <p className="text-[11px] text-vea-text-dim mb-6 italic">
            Dont {stats.preInscrits} pre-inscrit{stats.preInscrits > 1 ? "s" : ""} (sans compte VEA — merge auto par nom+prenom+tel).
          </p>
        )}

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
