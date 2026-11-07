/**
 * Page /login — Server Component.
 *
 * [07/11/2026] « Se connecter avec Velito » (connexion unique du hub).
 * Avant : un formulaire email + mot de passe propre à compta. Il échouait
 * toujours (« Identifiants invalides ») depuis l'activation de la protection
 * anti-robots de Supabase le 11/06/2026 : Supabase exige un jeton hCaptcha à
 * chaque connexion, et ce formulaire n'en envoyait pas.
 * Plutôt que de dupliquer le hCaptcha ici, compta délègue la connexion au hub
 * (comme « Se connecter avec Google ») :
 *   1. bouton → hub.velito.fr/login?return=https://compta.velito.fr/
 *   2. le hub vérifie mot de passe + hCaptcha et pose la session dans un
 *      cookie partagé sur .velito.fr ;
 *   3. retour sur compta, qui lit ce même cookie (même projet Supabase).
 * Si on est déjà connecté au hub, l'étape 2 est sautée (redirection directe).
 *
 * Être connecté ne suffit pas : le middleware vérifie toujours la liste
 * blanche COMPTA_EMAILS_AUTORISES (authentifié ≠ autorisé).
 *
 * Pas de lien « créer un compte » : Compta est un outil interne.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  // Adresse de retour = la racine de CE site (déduite de la requête, pour
  // marcher aussi en préversion Vercel). Le hub la revalide de son côté.
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host") ?? "compta.velito.fr";
  const protocole = h.get("x-forwarded-proto") ?? "https";
  const retour = `${protocole}://${hote}/`;
  const hub = process.env.NEXT_PUBLIC_HUB_URL ?? "https://hub.velito.fr";
  const lienConnexion = `${hub.replace(/\/$/, "")}/login?return=${encodeURIComponent(retour)}`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Velito Compta</h1>
        <p className="mt-1 text-sm text-compta-text-muted">
          Pré-comptabilité VEA &amp; VENA, accès restreint
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4 rounded-lg border border-compta-border bg-compta-surface p-6 text-center">
        <a
          href={lienConnexion}
          className="flex w-full items-center justify-center gap-3 rounded-md bg-compta-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-compta-accent-hover"
        >
          {/* Repère Velito : un X de points, comme le logo */}
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
        <p className="text-xs text-compta-text-muted">
          Tu passes par la connexion unique de Velito, puis tu reviens ici.
          Si tu es déjà connecté, c&apos;est immédiat.
        </p>
      </div>
    </main>
  );
}
