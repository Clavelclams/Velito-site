/**
 * Socle commun des routes /api/v1 (14/11/2026) : vérification de la clé,
 * limite de débit, réponses JSON homogènes.
 *
 * Chaque route fait :
 *   const acces = await verifierAcces(request);
 *   if (!acces.ok) return acces.reponse;
 *   ... lecture avec getAnonClient() ...
 *   return repondre(donnees, acces);
 *
 * Ce que la clé donne : le droit d'appeler l'API, rien de plus. Les données
 * sont lues avec le client ANONYME (lib/supabase/anon.ts) : la RLS publique
 * décide de ce qui sort, exactement comme pour un visiteur du site.
 */
import { getServiceClient } from "../supabase/service";
import { empreinteCle, extraireCle, LIMITE_PAR_MINUTE } from "./api-cles";

export const DOC_API = "https://arena.velito.fr/developpeurs";

/** En-têtes CORS : l'API est publique, un site de club peut l'appeler.
 *  On conseille quand même d'appeler depuis un serveur (la clé reste privée). */
export const ENTETES_CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-Api-Key",
  "Access-Control-Max-Age": "86400",
};

export type Acces =
  | { ok: true; organisationId: string; restant: number }
  | { ok: false; reponse: Response };

function erreur(statut: number, code: string, message: string, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ erreur: { code, message, documentation: DOC_API } }), {
    status: statut,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...ENTETES_CORS,
      ...extra,
    },
  });
}

export async function verifierAcces(request: Request): Promise<Acces> {
  const cle = extraireCle(request.headers);
  if (!cle) {
    return {
      ok: false,
      reponse: erreur(
        401,
        "cle_absente",
        "Clé d'API absente ou mal formée. Envoie-la dans l'en-tête Authorization: Bearer arena_…",
        { "WWW-Authenticate": 'Bearer realm="arena"' }
      ),
    };
  }

  const { data, error } = await getServiceClient()
    .schema("arena")
    .rpc("api_consommer", { p_empreinte: empreinteCle(cle), p_limite: LIMITE_PAR_MINUTE });
  if (error) {
    // Base indisponible : on le dit franchement, sans détail technique.
    console.error("[arena/api-v1] api_consommer", error.code, error.message);
    return { ok: false, reponse: erreur(503, "indisponible", "Service momentanément indisponible, réessaie dans une minute.") };
  }
  const ligne = (data as { organisation_id: string; autorise: boolean; restant: number }[] | null)?.[0];
  if (!ligne) {
    return { ok: false, reponse: erreur(401, "cle_invalide", "Clé d'API inconnue ou révoquée.") };
  }
  if (!ligne.autorise) {
    // Fenêtre fixe d'une minute : on dit quand réessayer.
    const attente = 60 - new Date().getSeconds();
    return {
      ok: false,
      reponse: erreur(429, "trop_de_requetes", `Limite de ${LIMITE_PAR_MINUTE} requêtes par minute atteinte.`, {
        "Retry-After": String(attente),
        "X-RateLimit-Limit": String(LIMITE_PAR_MINUTE),
        "X-RateLimit-Remaining": "0",
      }),
    };
  }
  return { ok: true, organisationId: ligne.organisation_id, restant: ligne.restant };
}

export function repondre(donnees: unknown, acces: { restant: number }): Response {
  return new Response(JSON.stringify(donnees), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Pendant un tournoi les scores bougent : pas de cache partagé.
      "Cache-Control": "no-store",
      "X-RateLimit-Limit": String(LIMITE_PAR_MINUTE),
      "X-RateLimit-Remaining": String(acces.restant),
      ...ENTETES_CORS,
    },
  });
}

export function introuvable(message: string): Response {
  return erreur(404, "introuvable", message);
}

/** Réponse au « preflight » CORS du navigateur (OPTIONS). */
export function preflight(): Response {
  return new Response(null, { status: 204, headers: ENTETES_CORS });
}

/** URL publique d'un tournoi (page /t/[token]), sur le domaine qui a servi
 *  la requête (production, préproduction ou local : toujours juste). */
export function urlTournoi(request: Request, token: string): string {
  return `${new URL(request.url).origin}/t/${token}`;
}
