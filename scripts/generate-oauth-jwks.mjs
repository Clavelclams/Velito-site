#!/usr/bin/env node
/**
 * ============================================================================
 * generate-oauth-jwks.mjs — Génère une paire RSA 2048 pour signer les JWT OAuth
 * du hub Velito. À exécuter UNE fois au bootstrap (ou pour rotation).
 * ============================================================================
 *
 * USAGE :
 *   node scripts/generate-oauth-jwks.mjs
 *
 *   → Affiche dans le terminal :
 *     1. Le SQL INSERT à coller dans Supabase (projet velito-hub)
 *     2. Un récap KID/algorithm/date
 *
 * SÉCURITÉ :
 *   ⚠️ Le SQL généré contient la CLÉ PRIVÉE en clair (PEM).
 *   - NE LE COMMIT JAMAIS dans git.
 *   - NE LE COLLE JAMAIS dans un canal partagé (Slack, Discord, mail).
 *   - Exécute-le DIRECTEMENT dans le SQL Editor Supabase puis ferme le terminal.
 *   - Si tu doutes d'une fuite : exécute ce script à nouveau, INSERT la nouvelle
 *     paire, et UPDATE shared.oauth_jwks SET rotated_at = now() WHERE kid = 'ancien'.
 *
 * POURQUOI PAS DE GÉNÉRATION CÔTÉ POSTGRES :
 *   Postgres + pgcrypto ne supportent pas la génération de paires RSA
 *   directement. On utilise donc Node `crypto.generateKeyPairSync` qui est
 *   un standard maîtrisé (OpenSSL en interne). La clé privée ne quitte
 *   jamais la table `shared.oauth_jwks` une fois insérée.
 *
 * RATIONALE TECHNIQUE :
 *   - RSA 2048 = standard industrie (suffisant pour 2026, à monter à 3072+
 *     avant 2030 si on est prudent).
 *   - Format clé privée : PKCS#8 PEM (compatible jose, jsonwebtoken, etc.).
 *   - Format clé publique : JWK (JSON Web Key) selon RFC 7517 — c'est ce que
 *     /jwks.json exposera.
 *   - kid (Key ID) = uuid v4 pour qu'on puisse rotater sans casser les JWT
 *     en circulation (chaque JWT a un `kid` dans son header).
 * ============================================================================
 */

import { generateKeyPairSync, createPublicKey, randomUUID } from "node:crypto";

// ----------------------------------------------------------------------------
// 1. Génération de la paire RSA 2048
// ----------------------------------------------------------------------------
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// ----------------------------------------------------------------------------
// 2. Construction du JWK public (RFC 7517 + RFC 7518)
//    On extrait n (modulus) et e (exponent) depuis la clé publique au format
//    JWK natif de Node.
// ----------------------------------------------------------------------------
const publicJwk = createPublicKey(publicKey).export({ format: "jwk" });

const kid = randomUUID();

// Ajout des claims standards manquants
publicJwk.kid = kid;
publicJwk.alg = "RS256";
publicJwk.use = "sig";

// ----------------------------------------------------------------------------
// 3. Construction du SQL INSERT à coller dans Supabase
//    On échappe les apostrophes simples par doublement (standard SQL).
// ----------------------------------------------------------------------------
const escapeSqlString = (s) => s.replace(/'/g, "''");
const publicJwkJson = JSON.stringify(publicJwk);

const sql = `-- ============================================================================
-- Insertion d'une nouvelle clé de signature OAuth dans shared.oauth_jwks.
-- Généré par scripts/generate-oauth-jwks.mjs le ${new Date().toISOString()}.
-- ============================================================================
-- ⚠️ Cette SQL contient la CLÉ PRIVÉE en clair. À EXÉCUTER PUIS DÉTRUIRE.
-- N'enregistre PAS ce fichier sur disque, ne le commit PAS, ne le partage PAS.
-- ============================================================================

INSERT INTO shared.oauth_jwks (kid, alg, use_for, private_pem, public_jwk)
VALUES (
  '${kid}',
  'RS256',
  'sig',
  '${escapeSqlString(privateKey)}',
  '${escapeSqlString(publicJwkJson)}'::jsonb
);

-- Vérification : la nouvelle clé est bien posée et active (rotated_at IS NULL)
SELECT kid, alg, use_for, created_at, rotated_at
  FROM shared.oauth_jwks
 ORDER BY created_at DESC
 LIMIT 5;
`;

// ----------------------------------------------------------------------------
// 4. Affichage final
// ----------------------------------------------------------------------------
console.log("============================================================================");
console.log("  Nouvelle paire RSA 2048 générée pour OAuth Velito");
console.log("============================================================================");
console.log("");
console.log("  KID (Key ID) :", kid);
console.log("  Algorithm    : RS256");
console.log("  Date         :", new Date().toISOString());
console.log("");
console.log("============================================================================");
console.log("  SQL À EXÉCUTER DANS SUPABASE (projet velito-hub) :");
console.log("============================================================================");
console.log("");
console.log(sql);
console.log("");
console.log("============================================================================");
console.log("  RAPPEL SÉCU :");
console.log("    1. Copie le SQL ci-dessus");
console.log("    2. Colle-le DIRECTEMENT dans le SQL Editor Supabase");
console.log("    3. Exécute");
console.log("    4. FERME ce terminal — la clé privée doit disparaître de l'historique");
console.log("");
console.log("    Pour une rotation future : relance ce script + UPDATE shared.oauth_jwks");
console.log("    SET rotated_at = now() WHERE kid = '<ancien_kid>';");
console.log("============================================================================");
