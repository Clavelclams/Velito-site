/**
 * /admin/documents/[id] — Détail d'un document avec actions valider/rejeter
 *
 * Server Component qui :
 *   - Fetch le document + participant lié
 *   - Génère un signed URL pour afficher le fichier (le bucket est privé)
 *   - Rend DocumentActions (Client) pour les boutons
 *
 * Permission editor+ sur vea.
 */
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";
import DocumentActions from "./DocumentActions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const TYPE_LABELS: Record<string, string> = {
  ticket: "Ticket",
  facture: "Facture",
  justificatif: "Justificatif",
  peage: "Péage / transport",
  courrier: "Courrier",
  contrat: "Contrat",
  autre: "Autre",
};

const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  valide: "Validé",
  rejete: "Rejeté",
  archive: "Archivé",
};

const STATUT_COLORS: Record<string, string> = {
  en_attente: "bg-amber-100 text-amber-700 border-amber-200",
  valide: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejete: "bg-red-100 text-red-700 border-red-200",
  archive: "bg-vea-bg text-vea-text-dim border-vea-border",
};

function displayName(p: { prenom: string; nom: string; est_mineur: boolean | null }): string {
  if (p.est_mineur) {
    const initiale = (p.nom ?? "").trim().charAt(0).toUpperCase();
    return `${p.prenom} ${initiale}.`;
  }
  return `${p.prenom} ${p.nom}`;
}

function formatBytes(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) redirect("/admin?denied=documents");

  const { id } = await params;
  const supabase = await createClient();

  const { data: doc } = await supabase
    .schema("vea")
    .from("documents")
    .select(
      "id, nom, type, participant_id, uploader_id, storage_path, mime_type, taille_octets, description, statut, motif_rejet, created_at, reviewed_at, reviewer_id, participants(prenom, nom, est_mineur)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!doc) notFound();

  // Generate signed URL pour download / preview (valide 1h)
  const { data: signedUrlData } = await supabase.storage
    .from("vea-documents")
    .createSignedUrl(doc.storage_path, 3600);
  const fileUrl = signedUrlData?.signedUrl;

  // Fetch uploader et reviewer (depuis shared.users)
  const userIds = [doc.uploader_id, doc.reviewer_id].filter((x): x is string =>
    Boolean(x)
  );
  const { data: usersRaw } = userIds.length > 0
    ? await supabase
        .schema("shared")
        .from("users")
        .select("id, prenom, nom, email")
        .in("id", userIds)
    : { data: [] };
  const usersMap = new Map<string, { prenom: string | null; nom: string | null; email: string | null }>();
  for (const u of usersRaw ?? []) {
    usersMap.set(u.id, { prenom: u.prenom, nom: u.nom, email: u.email });
  }
  const uploader = usersMap.get(doc.uploader_id);
  const reviewer = doc.reviewer_id ? usersMap.get(doc.reviewer_id) : null;

  const participant = doc.participants as { prenom: string; nom: string; est_mineur: boolean | null } | null;
  const isImage = doc.mime_type.startsWith("image/");
  const isPdf = doc.mime_type === "application/pdf";

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/admin/documents"
            className="text-xs text-vea-text-dim hover:text-vea-accent"
          >
            ← Retour liste documents
          </Link>
        </div>

        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-vea-accent-soft text-vea-accent">
                {TYPE_LABELS[doc.type] ?? doc.type}
              </span>
              <span
                className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${STATUT_COLORS[doc.statut]}`}
              >
                {STATUT_LABELS[doc.statut] ?? doc.statut}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-vea-text mb-2 leading-tight">
              {doc.nom}
            </h1>
          </div>
          <DocumentActions
            documentId={doc.id}
            storagePath={doc.storage_path}
            statut={doc.statut as "en_attente" | "valide" | "rejete" | "archive"}
          />
        </div>

        {/* Métadonnées */}
        <div className="card-clean p-5 mb-4 space-y-2 text-sm">
          {participant && (
            <p className="text-vea-text">
              <span className="text-vea-text-dim">Concerne :</span>{" "}
              <strong>{displayName(participant)}</strong>
            </p>
          )}
          <p className="text-vea-text">
            <span className="text-vea-text-dim">Uploadé par :</span>{" "}
            <strong>
              {uploader
                ? uploader.prenom
                  ? `${uploader.prenom} ${uploader.nom ?? ""}`.trim()
                  : uploader.email
                : "Inconnu"}
            </strong>{" "}
            le{" "}
            {new Date(doc.created_at).toLocaleString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-vea-text">
            <span className="text-vea-text-dim">Fichier :</span>{" "}
            {doc.mime_type} · {formatBytes(doc.taille_octets)}
          </p>
          {doc.reviewed_at && reviewer && (
            <p className="text-vea-text">
              <span className="text-vea-text-dim">
                {doc.statut === "valide" ? "Validé" : "Rejeté"} par :
              </span>{" "}
              <strong>
                {reviewer.prenom
                  ? `${reviewer.prenom} ${reviewer.nom ?? ""}`.trim()
                  : reviewer.email}
              </strong>{" "}
              le{" "}
              {new Date(doc.reviewed_at).toLocaleString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        {/* Motif rejet */}
        {doc.statut === "rejete" && doc.motif_rejet && (
          <div className="card-clean p-4 mb-4 border-l-4 border-l-red-500 bg-red-50">
            <p className="text-xs font-bold text-red-700 uppercase tracking-widest mb-1">
              Motif du rejet
            </p>
            <p className="text-sm text-red-800">{doc.motif_rejet}</p>
          </div>
        )}

        {/* Description */}
        {doc.description && (
          <div className="card-clean p-4 mb-4">
            <p className="text-xs font-bold text-vea-text-dim uppercase tracking-widest mb-2">
              Description
            </p>
            <p className="text-sm text-vea-text whitespace-pre-wrap">{doc.description}</p>
          </div>
        )}

        {/* Aperçu fichier */}
        {fileUrl && (
          <div className="card-clean p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-vea-text-dim uppercase tracking-widest">
                Aperçu du fichier
              </p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full bg-vea-accent text-white hover:bg-vea-accent-hover transition-colors"
              >
                Télécharger
              </a>
            </div>
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fileUrl}
                alt={doc.nom}
                className="w-full rounded-lg border border-vea-border"
              />
            ) : isPdf ? (
              <iframe
                src={fileUrl}
                title={doc.nom}
                className="w-full h-[600px] rounded-lg border border-vea-border"
              />
            ) : (
              <p className="text-sm text-vea-text-muted italic">
                Aperçu indisponible pour ce type de fichier. Utilise le bouton
                <strong> Télécharger </strong>pour l&apos;ouvrir.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
