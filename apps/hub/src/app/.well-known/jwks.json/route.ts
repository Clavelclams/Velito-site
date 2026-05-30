/**
 * JWKS — /.well-known/jwks.json
 *
 * Spec : RFC 7517 (JSON Web Key Set).
 *
 * Expose les CLÉS PUBLIQUES (jamais les privées) des paires RSA actives,
 * pour que les apps clientes puissent VÉRIFIER les JWT signés par notre IdP.
 *
 * Pendant une rotation : on garde aussi les clés rotées < 24h pour que les
 * tokens en circulation restent vérifiables. Au-delà : les tokens signés
 * avec les anciennes clés sont rejetés.
 *
 * Cache CDN : 5 min (compromis entre rotation rapide et performance).
 */
import { NextResponse } from "next/server";
import { getPublicJwks } from "@/lib/oauth/keys";

export const dynamic = "force-dynamic"; // Lit la DB à chaque requête (avec cache mem côté serveur)

export async function GET(request: Request) {
  // Mode debug en dev : ?debug=1 expose l'erreur dans la réponse JSON.
  // À retirer en prod quand tout marche. Pour l'instant ça aide à diagnostiquer.
  const url = new URL(request.url);
  const debug =
    process.env.NODE_ENV !== "production" && url.searchParams.has("debug");

  try {
    const jwks = await getPublicJwks();

    if (debug) {
      // En mode debug on retourne aussi le nombre de clés trouvées + une info env
      return NextResponse.json({
        ...jwks,
        _debug: {
          keysCount: jwks.keys.length,
          hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
          supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING",
        },
      });
    }

    return NextResponse.json(jwks, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300", // 5 min
      },
    });
  } catch (error) {
    console.error("[jwks] error:", error);
    if (debug) {
      return NextResponse.json(
        {
          keys: [],
          _debug: {
            error: error instanceof Error ? error.message : String(error),
            hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
            supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING",
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ keys: [] }, { status: 500 });
  }
}
