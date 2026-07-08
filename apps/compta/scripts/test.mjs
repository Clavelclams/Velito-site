/**
 * Lanceur de tests de services (fonctions pures).
 *
 *   node scripts/test.mjs lib/services/transactions.test.ts
 *   node scripts/test.mjs            → lance TOUS les *.test.ts de lib/
 *
 * Enregistre d'abord le résolveur d'alias "@/" (alias-loader.mjs), puis
 * importe le(s) fichier(s) de test. Node exécute le TypeScript directement
 * (type-stripping, v22+), donc aucune étape de compilation.
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { readdirSync } from "node:fs";
import path from "node:path";

// Branche le résolveur d'alias sur le système de modules.
register("./alias-loader.mjs", import.meta.url);

function trouverTests(dossier) {
  const out = [];
  for (const e of readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) out.push(...trouverTests(p));
    else if (e.name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

const arg = process.argv[2];
const cibles = arg ? [arg] : trouverTests("lib");

let echec = false;
for (const cible of cibles) {
  console.log(`\n▶ ${cible}`);
  try {
    await import(pathToFileURL(path.resolve(cible)).href);
  } catch (e) {
    echec = true;
    console.error(`  ERREUR au chargement : ${e.message}`);
  }
}
if (echec) process.exit(1);
