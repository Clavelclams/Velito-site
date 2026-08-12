/**
 * Page QR d'un tournoi — pensée pour être IMPRIMÉE et affichée à l'entrée.
 *
 * Le QR encode l'URL publique /t/[qr_token]. Les joueurs le scannent avec
 * leur téléphone et suivent le bracket en direct. Génération côté SERVEUR
 * (lib `qrcode` → data URL) : rien à télécharger côté client, ça marche
 * même sur la connexion 3G d'une salle des fêtes.
 */
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { estStaffDe, getContexteStaff } from "@/lib/arena/auth";
import { getServiceClient } from "@/lib/supabase/service";
import type { Tournoi } from "@/lib/arena/types";

export default async function PageQR({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getContexteStaff();
  if (!ctx) return null;

  const db = getServiceClient();
  const { data } = await db
    .schema("arena")
    .from("tournois")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const tournoi = data as Tournoi;
  if (!estStaffDe(ctx, tournoi.organisation_id)) notFound();

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arena.velito.fr";
  const urlPublique = `${base}/t/${tournoi.qr_token}`;

  const qrDataUrl = await QRCode.toDataURL(urlPublique, {
    width: 480,
    margin: 1,
    color: { dark: "#0f0f1a", light: "#ffffff" },
  });

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="rounded-2xl bg-white p-8 text-arena-bg">
        <p className="text-xs font-semibold uppercase tracking-widest">
          ARENA · Velito
        </p>
        <h1 className="mt-1 text-2xl font-black">{tournoi.titre}</h1>
        <p className="mt-1 text-sm text-arena-faint">
          {tournoi.jeu} · {new Date(tournoi.date_debut).toLocaleDateString("fr-FR")}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL générée serveur, next/image inutile ici */}
        <img
          src={qrDataUrl}
          alt={`QR code vers la page publique du tournoi ${tournoi.titre}`}
          className="mx-auto mt-4 h-64 w-64"
        />
        <p className="mt-3 text-sm font-semibold">
          📱 Scanne pour suivre le bracket en direct
        </p>
        <p className="mt-1 break-all text-xs text-arena-muted">{urlPublique}</p>
      </div>

      <div className="mt-6 flex justify-center gap-3 print:hidden">
        <a
          href={`/admin/tournois/${tournoi.id}`}
          className="rounded-lg border border-arena-border px-4 py-2 text-sm text-arena-muted hover:text-arena-ink"
        >
          ← Retour au tournoi
        </a>
        <a
          href={urlPublique}
          className="rounded-lg border border-arena-border px-4 py-2 text-sm text-arena-muted hover:text-arena-ink"
        >
          Voir la page publique
        </a>
      </div>
      <p className="mt-3 text-xs text-arena-faint print:hidden">
        Astuce : Ctrl+P pour imprimer cette page et l&apos;afficher à
        l&apos;entrée de la salle.
      </p>
    </div>
  );
}
