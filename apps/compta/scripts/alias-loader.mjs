/**
 * Résolveur d'alias "@/" pour l'EXÉCUTION DES TESTS sous Node.
 *
 * Pourquoi ce fichier existe : nos modules utilisent l'alias "@/…" (défini
 * dans tsconfig.json). TypeScript et Next.js le comprennent, mais Node brut
 * (qui exécute nos tests par type-stripping) ne lit PAS tsconfig et ne sait
 * donc pas résoudre "@/lib/services/montants". Ce loader traduit tout
 * specifier commençant par "@/" en chemin de fichier réel, à partir de la
 * racine de l'app (cwd = apps/compta quand on lance les tests).
 *
 * C'est un "resolve hook" du système de modules de Node : il s'intercale
 * AVANT la résolution par défaut. Les imports non-alias passent inchangés.
 */
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const racine = process.cwd();

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    let cible = path.join(racine, specifier.slice(2));
    // Ajoute l'extension .ts/.tsx si l'import est écrit sans (convention TS).
    if (!path.extname(cible)) {
      if (existsSync(cible + ".ts")) cible += ".ts";
      else if (existsSync(cible + ".tsx")) cible += ".tsx";
    }
    return next(pathToFileURL(cible).href, context);
  }
  return next(specifier, context);
}
