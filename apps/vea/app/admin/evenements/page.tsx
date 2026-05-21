/**
 * /admin/evenements — Admin page pour creer/lister les events VEA.
 *
 * Server Component. Permission editor+ sur org vea requise.
 * Affiche : form de creation + liste des 20 derniers events crees.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";
import AddEventForm from "./AddEventForm";
import { getScanUrl, getQRCodeUrl } from "@/lib/qrcode";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ passes?: string }>;
}) {
  const { passes } = await searchParams;
  const showPast = passes === "1";

  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) redirect("/admin?denied=events");

  // Recupere l'origin du site pour generer les URL QR (dev = localhost, prod = vea.velito.fr)
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "vea.velito.fr";
  const protocol = host.includes("localhost") ? "http" : "https";
  const siteOrigin = `${protocol}://${host}`;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/evenements");

  // Le passé/à venir se déduit de la DATE (auto, aucune action admin requise).
  // Vue par défaut : events À VENIR (date >= aujourd'hui) non annulés, triés du
  // plus proche au plus loin. ?passes=1 : events passés (triés du + récent).
  // Les events passés restent visibles côté public dans l'agenda.
  const today = new Date().toISOString().slice(0, 10);
  let eventsQuery = supabase
    .schema("vea")
    .from("evenements")
    .select("id, nom, event_slug, date, lieu, type, statut, token, created_at");
  eventsQuery = showPast
    ? eventsQuery.lt("date", today).order("date", { ascending: false }).limit(40)
    : eventsQuery
        .gte("date", today)
        .neq("statut", "annule")
        .order("date", { ascending: true })
        .limit(40);
  const { data: events } = await eventsQuery;

  type EventRow = {
    id: string;
    nom: string;
    event_slug: string;
    date: string;
    lieu: string;
    type: string;
    statut: string;
    token: string;
    created_at: string;
  };
  const eventsList = (events ?? []) as EventRow[];

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-xs text-vea-text-dim hover:text-vea-accent">
            ← Retour /admin
          </Link>
        </div>

        <div className="mb-8">
          <span className="badge-red mb-3 inline-block">Admin VEA</span>
          <h1 className="text-3xl sm:text-4xl font-black text-vea-text mb-2">
            Gestion <span className="text-vea-accent">events</span> + QR scan
          </h1>
          <p className="text-sm text-vea-text-muted leading-relaxed">
            Cree un evenement, recois son QR code unique. Affiche le QR sur place :
            les participants le scannent pour s&apos;enregistrer (jouer / aider /
            regarder) et gagner de l&apos;XP automatiquement.
          </p>
        </div>

        <AddEventForm siteOrigin={siteOrigin} />

        {/* Liste events — par défaut À VENIR (le passé sort de la vue admin et
            reste dans l'agenda public). Bascule via ?passes=1. */}
        <div className="mt-12">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className="text-lg font-bold text-vea-text">
              {showPast ? "Events passés" : "Events à venir"} ({eventsList.length})
            </h2>
            <Link
              href={showPast ? "/admin/evenements" : "/admin/evenements?passes=1"}
              className="text-xs text-vea-accent hover:underline font-semibold"
            >
              {showPast ? "← Events à venir" : "Voir les events passés →"}
            </Link>
          </div>
          {eventsList.length === 0 ? (
            <p className="card-clean p-6 text-center text-sm text-vea-text-muted">
              {showPast
                ? "Aucun event passé."
                : "Aucun event à venir. Crée-en un avec le formulaire ci-dessus."}
            </p>
          ) : (
            <div className="space-y-3">
              {eventsList.map((e) => {
                const scanUrl = getScanUrl(e.token, siteOrigin);
                const qrThumbUrl = getQRCodeUrl(scanUrl, 200); // thumbnail dans la liste
                const qrFullUrl = getQRCodeUrl(scanUrl, 600); // version HD pour download
                const dateStr = new Date(e.date).toLocaleDateString("fr-FR", {
                  weekday: "short", day: "numeric", month: "short", year: "numeric",
                });
                const isPast = new Date(e.date) < new Date();
                return (
                  <div key={e.id} className="card-clean p-4 flex items-start gap-4">
                    {/* QR code thumbnail 100px */}
                    <a
                      href={qrFullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Cliquer pour voir le QR en HD"
                      className="shrink-0 block w-24 h-24 border border-vea-border rounded-lg overflow-hidden hover:border-vea-accent transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrThumbUrl}
                        alt={`QR ${e.nom}`}
                        width={96}
                        height={96}
                        className="w-full h-full"
                      />
                    </a>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-vea-text">{e.nom}</h3>
                        <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${
                          e.statut === "annule" ? "bg-vea-bg text-vea-text-dim line-through" :
                          isPast ? "bg-vea-bg text-vea-text-dim" :
                          "bg-vea-accent-soft text-vea-accent"
                        }`}>
                          {e.statut === "annule" ? "Annulé" : isPast ? "Passé" : "À venir"}
                        </span>
                      </div>
                      <div className="text-xs text-vea-text-muted mb-2">
                        {dateStr} · {e.lieu} · {e.type}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <Link
                          href={`/admin/evenements/${e.event_slug}`}
                          className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full bg-vea-accent text-white hover:bg-vea-accent-hover transition-colors"
                        >
                          Voir participants
                        </Link>
                        <a
                          href={qrFullUrl}
                          download={`vea-qr-${e.event_slug}.png`}
                          className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border border-vea-border text-vea-text-muted hover:border-vea-accent hover:text-vea-accent transition-all"
                        >
                          Télécharger QR
                        </a>
                        <a
                          href={scanUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border border-vea-border text-vea-text-muted hover:border-vea-accent hover:text-vea-accent transition-all"
                        >
                          Ouvrir URL scan
                        </a>
                      </div>

                      <p className="text-[9px] text-vea-text-dim font-mono break-all mt-2">
                        {scanUrl}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
