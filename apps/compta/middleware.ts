/**
 * Middleware Next.js — Velito Compta.
 *
 * DIFFÉRENCE ASSUMÉE avec le middleware du hub : le hub est un site PUBLIC
 * avec des zones privées → son middleware ne fait que rafraîchir la session,
 * chaque page protégée gère son redirect. Compta est un outil de gestion
 * 100 % PRIVÉ (données financières) → ici, TOUT est verrouillé par défaut :
 * pas de session valide = redirection /login, quelle que soit l'URL.
 *
 * "Default deny" à l'étage HTTP, symétrique du "default deny" RLS à l'étage
 * base de données. Même si une future page oublie de vérifier la session,
 * le middleware l'aura déjà bloquée. Défense en profondeur : la RLS protège
 * les DONNÉES même si ce middleware était contourné ; le middleware protège
 * l'INTERFACE même si une page est mal codée.
 *
 * Rôle n°2 (pattern officiel @supabase/ssr) : rafraîchir le token de session
 * à chaque requête pour que l'utilisateur ne soit pas déconnecté toutes les
 * heures. La danse request/response des cookies est reprise du hub.
 */
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes accessibles SANS session. Tout le reste exige d'être connecté. */
const ROUTES_PUBLIQUES = ["/login"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Config absente (tout premier lancement) : on laisse passer pour afficher
  // une erreur lisible dans la page plutôt qu'un blocage silencieux ici.
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        // 1. Sur la request : pour les Server Components exécutés après.
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        // 2. Response régénérée avec les cookies à jour.
        response = NextResponse.next({ request });
        // 3. Sur la response : ce que le navigateur recevra et stockera.
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() (et PAS getSession()) : getUser REVALIDE le JWT auprès du
  // serveur Supabase ; getSession se contente de lire le cookie local, qui
  // peut être forgé. Pour une décision de sécurité, toujours getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const estRoutePublique = ROUTES_PUBLIQUES.some(
    (route) => request.nextUrl.pathname === route,
  );

  // LISTE BLANCHE — indispensable depuis que Compta partage le projet
  // Supabase du hub : auth.users contient TOUS les comptes Velito, or avoir
  // un compte Velito ne donne aucun droit sur un outil financier interne.
  // Être authentifié ≠ être autorisé (authentification vs AUTORISATION —
  // distinction classique de jury). La RLS protège déjà les données ; cette
  // barrière protège l'accès à l'interface elle-même.
  // Env COMPTA_EMAILS_AUTORISES : emails séparés par des virgules.
  const emailsAutorises = (process.env.COMPTA_EMAILS_AUTORISES ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (
    user &&
    emailsAutorises.length > 0 &&
    !emailsAutorises.includes(user.email?.toLowerCase() ?? "")
  ) {
    // 403 direct, PAS de redirect vers /login : l'utilisateur EST connecté,
    // le renvoyer au login créerait une boucle infinie de redirections.
    return new NextResponse(
      "Accès restreint — Velito Compta est un outil interne.",
      { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  // Pas connecté + route privée → /login.
  if (!user && !estRoutePublique) {
    const urlLogin = request.nextUrl.clone();
    urlLogin.pathname = "/login";
    return NextResponse.redirect(urlLogin);
  }

  // Déjà connecté sur /login → retour à l'accueil (évite l'écran inutile).
  if (user && estRoutePublique) {
    const urlAccueil = request.nextUrl.clone();
    urlAccueil.pathname = "/";
    return NextResponse.redirect(urlAccueil);
  }

  return response;
}

/** Même matcher que le hub : tout sauf les assets statiques (perf). */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|otf|eot|css|js|map)$).*)",
  ],
};
