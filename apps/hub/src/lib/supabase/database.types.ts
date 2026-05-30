/**
 * Types Database pour le client Supabase service_role du Hub Velito.
 *
 * ─── Pourquoi ce fichier (à savoir pour le jury CDA) ──────────────────────────
 *
 * Le client Supabase JS, sans Database type generic, infère le retour de TOUTES
 * ses requêtes (.select, .insert, .update, .upsert, .maybeSingle, .single)
 * comme le type `never`. C'est le type "vide" en TypeScript : aucune propriété
 * accessible. Conséquence : en TS strict (notre cas), tout code qui touche le
 * résultat d'une requête refuse de compiler.
 *
 * Ce fichier décrit le SHAPE de chaque table Postgres côté TypeScript. On le
 * passe en generic à `createClient<Database, "shared">(...)`. À partir de là,
 * Supabase utilise CE TYPE pour inférer le retour de chaque opération en
 * fonction de la table et du select demandé. Résultat : autocomplétion IDE,
 * vérification statique, refactor sûr (si on change une colonne, TS râle
 * partout où elle est utilisée).
 *
 * ─── Pourquoi pas `supabase gen types typescript` (l'auto-génération) ─────────
 *
 * Le CLI Supabase ne génère QUE les schemas exposés dans la Data API. Notre
 * schema `shared` héberge les tables OAuth en server-only (RLS sans policy),
 * donc même s'il est techniquement Exposed pour permettre au service_role
 * d'écrire via PostgREST, on préfère maintenir ce fichier à la main pour
 * éviter une dépendance CLI qui pourrait fuiter les colonnes en clair dans
 * le repo (le CLI ne sait pas masquer `private_pem` par exemple).
 *
 * ─── Maintenance ─────────────────────────────────────────────────────────────
 *
 * Quand on ajoute/modifie une colonne dans `sql/oauth-tables-v1.sql` (ou un
 * autre script SQL), il faut mettre à jour CE fichier. Si on oublie : TS râle
 * au build, ce qui est le bon comportement (better fail compile-time than
 * runtime).
 *
 * Schemas couverts :
 *  - shared : 5 tables OAuth + JWKS
 *  - public : réservé (le client public est dans server.ts, pas ici)
 *
 * Réf SQL : apps/hub/sql/oauth-tables-v1.sql
 */

export interface Database {
  shared: {
    Tables: {
      /**
       * Apps tierces enregistrées qui peuvent appeler /oauth/authorize.
       * - first_party : nos propres apps (hub, vea, vena, interactive, etc.)
       *   → skip du consent screen
       * - tierce : devra passer par /oauth/consent
       */
      oauth_clients: {
        Row: {
          client_id: string;
          client_secret: string | null;
          name: string;
          description: string | null;
          logo_url: string | null;
          redirect_uris: string[];
          allowed_scopes: string[];
          is_first_party: boolean;
          created_at: string;
        };
        Insert: {
          client_id: string;
          client_secret?: string | null;
          name: string;
          description?: string | null;
          logo_url?: string | null;
          redirect_uris: string[];
          allowed_scopes: string[];
          is_first_party?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["shared"]["Tables"]["oauth_clients"]["Insert"]>;
        Relationships: [];
      };

      /**
       * Paire de clés RSA pour signer/vérifier les JWT OAuth.
       * - private_pem : clé privée PKCS8 (sensible, lue uniquement côté serveur)
       * - public_jwk  : clé publique JWK (exposée via /.well-known/jwks.json)
       * - rotated_at  : NULL = active, sinon date de rotation
       */
      oauth_jwks: {
        Row: {
          kid: string;
          alg: string;
          use_for: string;
          private_pem: string;
          public_jwk: Record<string, unknown>;
          created_at: string;
          rotated_at: string | null;
        };
        Insert: {
          kid: string;
          alg: string;
          use_for?: string;
          private_pem: string;
          public_jwk: Record<string, unknown>;
          created_at?: string;
          rotated_at?: string | null;
        };
        Update: Partial<Database["shared"]["Tables"]["oauth_jwks"]["Insert"]>;
        Relationships: [];
      };

      /**
       * Codes d'autorisation OAuth (one-shot, TTL 60s).
       * Émis par /oauth/authorize, consommés par /oauth/token.
       * Stocke le code_challenge PKCE pour vérification ultérieure.
       */
      oauth_authorization_codes: {
        Row: {
          code: string;
          client_id: string;
          user_id: string;
          redirect_uri: string;
          scope: string[];
          code_challenge: string;
          code_challenge_method: string;
          nonce: string | null;
          expires_at: string;
          consumed_at: string | null;
          created_at: string;
        };
        Insert: {
          code?: string;
          client_id: string;
          user_id: string;
          redirect_uri: string;
          scope: string[];
          code_challenge: string;
          code_challenge_method?: string;
          nonce?: string | null;
          expires_at?: string;
          consumed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["shared"]["Tables"]["oauth_authorization_codes"]["Insert"]
        >;
        Relationships: [];
      };

      /**
       * Refresh tokens opaques (UUID), TTL 30 jours, single-use avec rotation.
       * `family_id` regroupe les refresh tokens issus du même grant initial :
       * en cas de replay détecté → on révoque TOUTE la family (kill switch).
       */
      oauth_refresh_tokens: {
        Row: {
          token: string;
          client_id: string;
          user_id: string;
          scope: string[];
          family_id: string;
          expires_at: string;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          token?: string;
          client_id: string;
          user_id: string;
          scope: string[];
          family_id?: string;
          expires_at: string;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["shared"]["Tables"]["oauth_refresh_tokens"]["Insert"]
        >;
        Relationships: [];
      };

      /**
       * Trace RGPD des consentements user → app tierce.
       * Clé composite (user_id, client_id). Mise à jour à chaque ajout de scope.
       */
      oauth_consents: {
        Row: {
          user_id: string;
          client_id: string;
          scope: string[];
          granted_at: string;
        };
        Insert: {
          user_id: string;
          client_id: string;
          scope: string[];
          granted_at?: string;
        };
        Update: Partial<Database["shared"]["Tables"]["oauth_consents"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };

  /**
   * Schema public : non utilisé via le client service_role.
   * Le client public/authenticated est dans `server.ts` (auth user-side).
   */
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
