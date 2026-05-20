/**
 * /scan/[token] — Page de scan d'un evenement VEA.
 *
 * Le user arrive ici en scannant un QR code (genere depuis /admin/evenements).
 * Server Component qui :
 *   1. Lit le token URL (doit etre UUID valide)
 *   2. Fetch l'event correspondant
 *   3. Verifie scan_actif + statut != annule
 *   4. Si user connecte    -> affiche ScanForm directement (motif uniquement)
 *      Si user NON connecte -> affiche ScanFlowGuest (form infos + motif en 2 etapes)
 *      Permet aux jeunes sans compte de participer + alimente le bilan asso.
 *
 * Pas dynamique force ici parce qu'on a besoin du fresh state event (scan_actif).
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ScanForm from "./ScanForm";
import ScanFlowGuest from "./ScanFlowGuest";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ScanPage({ params }: PageProps) {
  const { token } = await params;

  // Validation format UUID
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // PLUS DE redirect /login : si pas de user, on bascule sur ScanFlowGuest
  // (form pre-inscription nom/prenom/sexe/date_naissance/tel puis motif).
  // Cf logique de routing en bas de la fonction.

  // Fetch event via token
  const { data: event } = await supabase
    .schema("vea")
    .from("evenements")
    .select("id, nom, event_slug, date, lieu, type, description, statut, scan_actif")
    .eq("token", token)
    .maybeSingle();

  if (!event) {
    notFound();
  }

  // Verifier scan actif + statut
  if (!event.scan_actif) {
    return (
      <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
        <div className="max-w-md mx-auto card-clean p-8 text-center">
          <span className="badge-red mb-3 inline-block">Scan ferme</span>
          <h1 className="text-2xl font-bold text-vea-text mb-2">
            Le scan est ferme
          </h1>
          <p className="text-sm text-vea-text-muted">
            L&apos;event &quot;{event.nom}&quot; n&apos;accepte plus de scans pour le moment.
          </p>
        </div>
      </div>
    );
  }

  if (event.statut === "annule") {
    return (
      <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
        <div className="max-w-md mx-auto card-clean p-8 text-center">
          <span className="badge-red mb-3 inline-block">Annule</span>
          <h1 className="text-2xl font-bold text-vea-text mb-2">
            Event annule
          </h1>
          <p className="text-sm text-vea-text-muted">
            &quot;{event.nom}&quot; a ete annule.
          </p>
        </div>
      </div>
    );
  }

  const dateStr = new Date(event.date).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header event */}
        <div className="card-clean p-6 mb-6 text-center">
          <span className="badge-red mb-3 inline-block">Scan event</span>
          <h1 className="text-2xl sm:text-3xl font-black text-vea-text mb-2">
            {event.nom}
          </h1>
          <p className="text-sm text-vea-text-muted">
            {dateStr} · {event.lieu} · {event.type}
          </p>
          {event.description && (
            <p className="text-xs text-vea-text-dim mt-3 italic max-w-md mx-auto leading-relaxed">
              {event.description}
            </p>
          )}
        </div>

        {/* Routing UI :
              - user connecte    -> ScanForm direct (motif seul)
              - user NON connecte -> ScanFlowGuest (2 etapes : infos puis motif)
            Les 2 finissent avec le meme ecran de succes (+ XP gagne). */}
        {user ? (
          <ScanForm token={token} eventName={event.nom} />
        ) : (
          <>
            <ScanFlowGuest token={token} eventName={event.nom} />
            <p className="text-xs text-vea-text-dim text-center mt-6">
              Deja un compte VEA ?{" "}
              <Link
                href={`/login?redirect=/scan/${token}`}
                className="underline hover:text-vea-accent font-semibold"
              >
                Connecte-toi
              </Link>{" "}
              pour gagner direct tes XP.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
