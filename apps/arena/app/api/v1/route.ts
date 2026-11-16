/**
 * GET /api/v1 — point d'entrée de l'API publique (sans clé).
 * Dit ce qui existe et où lire la documentation : un développeur qui tape
 * l'URL à la main doit tomber sur quelque chose d'utile, pas sur une 404.
 */
import { DOC_API, ENTETES_CORS } from "@/lib/arena/api-v1";
import { LIMITE_PAR_MINUTE } from "@/lib/arena/api-cles";

export function GET() {
  return new Response(
    JSON.stringify({
      api: "ARENA",
      version: "v1",
      documentation: DOC_API,
      authentification: "En-tête Authorization: Bearer arena_… (clé créée dans l'espace organisateur)",
      limite: `${LIMITE_PAR_MINUTE} requêtes par minute et par clé`,
      routes: [
        "GET /api/v1/tournois",
        "GET /api/v1/tournois/{token}",
        "GET /api/v1/classement",
      ],
    }),
    { headers: { "Content-Type": "application/json; charset=utf-8", ...ENTETES_CORS } }
  );
}
