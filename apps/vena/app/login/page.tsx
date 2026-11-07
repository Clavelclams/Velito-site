/**
 * /login VENA — connexion admin par le hub (« Se connecter avec Velito »).
 *
 * [07/11/2026] Bug : le bouton restait sur « Connexion… » sans rien faire.
 * Cause : la connexion se faisait DANS le navigateur avec un client Supabase
 * construit à partir de NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY. Ces variables
 * sont marquées « Sensitive » sur Vercel, donc absentes au build : le
 * JavaScript livré ne contenait ni l'adresse du projet ni la clé, la création
 * du client plantait au clic et l'état « chargement » ne retombait jamais.
 * (Même piège que le devis VENA du 23/05, mais côté navigateur cette fois.)
 *
 * Correctif : comme compta, on délègue la connexion au hub, qui a le
 * hCaptcha exigé par Supabase et pose une session partagée sur .velito.fr.
 * Le hub nous renvoie ensuite sur ?redirect= (chemin local seulement) ou
 * /admin. La page /admin vérifie toujours la permission « vena ».
 *
 * Server Component : plus aucune clé Supabase n'est nécessaire côté navigateur.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/** Chemin local uniquement (pas de "//hote" ni d'adresse externe). */
function cheminLocal(brut: string | undefined): string {
  if (!brut || !brut.startsWith("/") || brut.startsWith("//") || brut.startsWith("/\\")) {
    return "/admin";
  }
  return brut;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  const destination = cheminLocal(redirectParam);

  // Déjà connecté : direction l'admin (qui vérifie la permission).
  let connecte = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    connecte = Boolean(user);
  } catch {
    connecte = false;
  }
  if (connecte) redirect(destination);

  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host") ?? "velito.fr";
  const protocole = h.get("x-forwarded-proto") ?? "https";
  const retour = `${protocole}://${hote}${destination}`;
  const hub = process.env.NEXT_PUBLIC_HUB_URL ?? "https://hub.velito.fr";
  const lienConnexion = `${hub.replace(/\/$/, "")}/login?return=${encodeURIComponent(retour)}`;

  return (
    <div className="min-h-screen bg-vena-cream flex items-center justify-center px-4 py-12">
      <div className="bg-white border border-vena-border rounded-2xl p-8 sm:p-10 w-full max-w-md shadow-sm text-center">
        <h1 className="text-2xl font-display font-black text-vena-kaki mb-1">Espace admin</h1>
        <p className="text-vena-text-muted mb-8 text-sm">
          Connecte-toi pour accéder aux demandes de devis VENA.
        </p>

        <a
          href={lienConnexion}
          className="flex w-full items-center justify-center gap-3 rounded-full bg-vena-kaki px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0" fill="currentColor">
            {[
              [4, 4], [8, 8], [12, 12], [16, 16], [20, 20],
              [20, 4], [16, 8], [8, 16], [4, 20],
            ].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" />
            ))}
          </svg>
          Se connecter avec Velito
        </a>
        <p className="mt-3 text-xs text-vena-text-muted">
          Connexion unique Velito, puis retour ici. Si tu es déjà connecté, c&apos;est immédiat.
        </p>

        <div className="mt-8 border-t border-vena-border pt-6">
          <Link href="/" className="text-sm text-vena-text-muted hover:text-vena-kaki">
            ← Retour au site
          </Link>
        </div>
      </div>
    </div>
  );
}
