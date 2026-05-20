/**
 * /admin/rapports/[id] — Detail d'un rapport avec rendu Markdown + actions
 *
 * V1 : rendu Markdown très basique (en monospace). V2 : utiliser react-markdown
 * pour un vrai rendu HTML stylisé.
 */
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";
import RapportActions from "./RapportActions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const TYPE_LABELS: Record<string, string> = {
  PV_CA: "PV de CA",
  PV_AG: "PV d'AG",
  convocation: "Convocation",
  rapport_activite: "Rapport d'activité",
  CR_reunion: "CR de réunion",
  autre: "Autre",
};

const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  valide: "Validé",
  publie: "Publié",
  archive: "Archivé",
};

const STATUT_COLORS: Record<string, string> = {
  brouillon: "bg-vea-bg text-vea-text-dim border-vea-border",
  valide: "bg-amber-100 text-amber-700 border-amber-200",
  publie: "bg-emerald-100 text-emerald-700 border-emerald-200",
  archive: "bg-vea-bg text-vea-text-dim border-vea-border",
};

/**
 * Mini renderer Markdown V1 (très limité, en attendant react-markdown V2).
 * Gère titres #/##/###, listes -, gras **, italique *, blocs de code `.
 */
function renderMarkdownBasic(md: string): string {
  // Échapper HTML pour sécurité
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Titres (ordre important : ### avant ##)
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-vea-text mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-vea-text mt-5 mb-2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-black text-vea-text mt-6 mb-3">$1</h1>');

  // Listes (regroupées en ul)
  html = html.replace(/^- (.+)$/gm, '<li class="ml-5 list-disc text-sm text-vea-text">$1</li>');

  // Gras et italique
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Sauts de ligne en <br> dans les paragraphes
  // (V2 : un vrai parser remplacera tout ça)
  html = html.replace(/\n\n+/g, '</p><p class="text-sm text-vea-text my-2">');
  html = `<p class="text-sm text-vea-text my-2">${html}</p>`;
  // Nettoyer les <p> autour des titres et listes
  html = html.replace(/<p[^>]*>(\s*<(h[1-3]|li)[\s\S]*?<\/\2>\s*)<\/p>/g, "$1");

  return html;
}

export default async function RapportDetailPage({ params }: PageProps) {
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) redirect("/admin?denied=rapports");

  const { id } = await params;
  const supabase = await createClient();

  const { data: rapport } = await supabase
    .schema("vea")
    .from("rapports")
    .select("id, type, titre, date_reunion, redacteur_id, contenu_markdown, participants_presents, statut, validated_by, validated_at, published_at, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (!rapport) notFound();

  // Récup redacteur + validateur
  const userIds = [rapport.redacteur_id, rapport.validated_by].filter((x): x is string => Boolean(x));
  const { data: usersRaw } = userIds.length > 0
    ? await supabase
        .schema("shared")
        .from("users")
        .select("id, prenom, nom, email")
        .in("id", userIds)
    : { data: [] };
  const usersMap = new Map<string, { prenom: string | null; nom: string | null; email: string | null }>();
  for (const u of usersRaw ?? []) usersMap.set(u.id, u);
  const redacteur = usersMap.get(rapport.redacteur_id);
  const validateur = rapport.validated_by ? usersMap.get(rapport.validated_by) : null;

  // Récup participants présents (depuis vea.participants)
  const participantsIds = (rapport.participants_presents as string[] | null) ?? [];
  const { data: participantsRaw } = participantsIds.length > 0
    ? await supabase
        .schema("vea")
        .from("participants")
        .select("id, prenom, nom, role, est_mineur")
        .in("id", participantsIds)
    : { data: [] };
  const participants = participantsRaw ?? [];

  const contenuHtml = renderMarkdownBasic(rapport.contenu_markdown || "(contenu vide)");

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/rapports" className="text-xs text-vea-text-dim hover:text-vea-accent">
            ← Retour liste rapports
          </Link>
        </div>

        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-vea-accent-soft text-vea-accent">
                {TYPE_LABELS[rapport.type] ?? rapport.type}
              </span>
              <span
                className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${STATUT_COLORS[rapport.statut]}`}
              >
                {STATUT_LABELS[rapport.statut] ?? rapport.statut}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-vea-text mb-2 leading-tight">
              {rapport.titre}
            </h1>
            <p className="text-sm text-vea-text-muted">
              Réunion du{" "}
              {new Date(rapport.date_reunion).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="card-clean p-4 mb-4">
          <p className="text-xs font-bold text-vea-text-dim uppercase tracking-widest mb-3">
            Workflow : brouillon → validé → publié → archivé
          </p>
          <RapportActions
            rapportId={rapport.id}
            currentStatut={rapport.statut as "brouillon" | "valide" | "publie" | "archive"}
          />
        </div>

        {/* Métadonnées */}
        <div className="card-clean p-5 mb-4 space-y-2 text-sm">
          {redacteur && (
            <p className="text-vea-text">
              <span className="text-vea-text-dim">Rédigé par :</span>{" "}
              <strong>
                {redacteur.prenom
                  ? `${redacteur.prenom} ${redacteur.nom ?? ""}`.trim()
                  : redacteur.email}
              </strong>{" "}
              le{" "}
              {new Date(rapport.created_at).toLocaleString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          {validateur && rapport.validated_at && (
            <p className="text-vea-text">
              <span className="text-vea-text-dim">Validé par :</span>{" "}
              <strong>
                {validateur.prenom
                  ? `${validateur.prenom} ${validateur.nom ?? ""}`.trim()
                  : validateur.email}
              </strong>{" "}
              le{" "}
              {new Date(rapport.validated_at).toLocaleString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          {rapport.published_at && (
            <p className="text-vea-text">
              <span className="text-vea-text-dim">Publié le :</span>{" "}
              {new Date(rapport.published_at).toLocaleString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {/* Participants présents */}
        {participants.length > 0 && (
          <div className="card-clean p-5 mb-4">
            <p className="text-xs font-bold text-vea-text-dim uppercase tracking-widest mb-3">
              Présents ({participants.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => {
                const name = p.est_mineur
                  ? `${p.prenom} ${(p.nom ?? "").charAt(0).toUpperCase()}.`
                  : `${p.prenom} ${p.nom}`;
                return (
                  <span
                    key={p.id}
                    className="text-xs px-3 py-1.5 rounded-full bg-white border border-vea-border text-vea-text"
                  >
                    {name}{" "}
                    <span className="text-[9px] text-vea-text-dim">({p.role})</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Contenu Markdown rendu */}
        <div className="card-clean p-6 mb-4">
          <p className="text-xs font-bold text-vea-text-dim uppercase tracking-widest mb-4">
            Contenu
          </p>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: contenuHtml }}
          />
        </div>

        <p className="text-[10px] text-vea-text-dim italic mt-6 text-center">
          V1 : rendu Markdown basique + édition statut. V2 : édition du contenu
          directement dans la page + génération PDF.
        </p>
      </div>
    </div>
  );
}
