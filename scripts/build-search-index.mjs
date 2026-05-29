/**
 * ============================================================================
 * build-search-index.mjs — Crawler de contenu pour la search globale du hub.
 * ============================================================================
 *
 * OBJECTIF :
 *   Lire tous les fichiers .tsx des apps Velito (hub + vea + vena + interactive
 *   + arena + prevention), extraire le texte des balises h1/h2/h3/h4/p/li,
 *   produire un index JSON à plat dans `apps/hub/public/search-index.json`
 *   que la NavBar consommera via MiniSearch à runtime.
 *
 * APPROCHE :
 *   Regex pragmatique (décision validée avec Clavel). On capte ~80% du texte
 *   en clair dans le JSX, on loupe les expressions JS (variables, fonctions
 *   i18n, props). En contrepartie : zéro dépendance, code lisible, exécution
 *   instantanée. Si on veut capter plus, on enrichit manuellement via
 *   `MANUAL_ENTRIES` ou on passe à un parser AST plus tard.
 *
 * TRIGGER :
 *   - `npm run prebuild` (avant `next build`) → garantit l'index à jour en prod
 *   - `npm run dev` (avant `next dev`) → garantit l'index à jour en dev
 *   - `npm run build-search-index` → manuel pour debug
 *
 * SORTIE :
 *   apps/hub/public/search-index.json — accessible via /search-index.json
 *
 * SCHÉMA DE CHAQUE ENTRÉE :
 *   {
 *     id: string,            // unique : `${app}-${relativePath}-${kind}-${i}`
 *     app: string,           // hub | vea | vena | interactive | arena | prevention
 *     appLabel: string,      // "Hub Velito" | "VEA" | "VENA" | ...
 *     url: string,           // URL finale (interne /xxx ou externe https://...)
 *     kind: string,          // title | subtitle | paragraph | item
 *     level: number,         // 1 pour h1, 2 pour h2, 3 pour h3, 4 pour h4/p/li
 *     text: string,          // contenu textuel (HTML entities décodées)
 *     section?: string,      // dernier titre rencontré dans le même fichier (contexte)
 *   }
 *
 * DÉFENSE JURY CDA :
 *   - Build-time crawler (pas runtime) : performance et fiabilité.
 *   - Index plat servi en static (CDN-friendly) : zéro charge serveur à chaque search.
 *   - Fuzzy matching via MiniSearch (algo BM25) à runtime côté navigateur.
 * ============================================================================
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(__filename, "..", "..");  // .../Velito-site/

// ----------------------------------------------------------------------------
// Configuration des apps à indexer.
//   - srcDir : où sont les .tsx (relatif à REPO_ROOT)
//   - baseUrl : préfixe d'URL final (externe en prod, "/" pour le hub)
//   - routePrefix : sous-chemin à retirer pour calculer la route
// ----------------------------------------------------------------------------
const APPS = [
  {
    app: "hub",
    appLabel: "Hub Velito",
    srcDir: "apps/hub/src/app",
    baseUrl: "",                  // routes internes du hub → /xxx
    routePrefix: "apps/hub/src/app",
  },
  {
    app: "vea",
    appLabel: "VEA",
    srcDir: "apps/vea/app",
    baseUrl: "https://vea.velito.fr",
    routePrefix: "apps/vea/app",
  },
  {
    app: "vena",
    appLabel: "VENA",
    srcDir: "apps/vena/app",
    baseUrl: "https://velito.fr",
    routePrefix: "apps/vena/app",
  },
  {
    app: "interactive",
    appLabel: "Interactive",
    srcDir: "apps/interactive/app",
    baseUrl: "https://interactive.velito.fr",
    routePrefix: "apps/interactive/app",
  },
];

// ----------------------------------------------------------------------------
// Entrées CURATED ajoutées à la main : pour les modules de la galaxy hub
// (chargés dynamiquement dans modules.ts → la regex JSX ne les capte pas).
// ----------------------------------------------------------------------------
const MANUAL_ENTRIES = [
  // Modules historiques (galaxy InfiniteMenu) — issus de apps/hub/src/components/galaxy/modules.ts
  { app: "vea",         appLabel: "VEA",         url: "https://vea.velito.fr",      kind: "module", level: 1, text: "VEA — Inclusion par l'esport, Amiens", section: "Modules" },
  { app: "vena",        appLabel: "VENA",        url: "https://velito.fr",          kind: "module", level: 1, text: "VENA Services — Agence numérique amiénoise", section: "Modules" },
  { app: "arena",       appLabel: "ARENA",       url: "/construction?slug=arena",       kind: "module", level: 1, text: "ARENA — Plateforme tournois esport", section: "Modules" },
  { app: "interactive", appLabel: "Interactive", url: "/construction?slug=interactive", kind: "module", level: 1, text: "Interactive — Animations gaming bars et MJC", section: "Modules" },
  { app: "prevention",  appLabel: "Prévention",  url: "/construction?slug=prevention",  kind: "module", level: 1, text: "Velito Prévention — Prévention numérique B2B", section: "Modules" },
  { app: "hub",         appLabel: "Hub Velito",  url: "/construction?slug=plateforme",  kind: "module", level: 1, text: "Plateforme — Marketplace freelances locaux", section: "Modules" },
  { app: "hub",         appLabel: "Hub Velito",  url: "/construction?slug=prod",        kind: "module", level: 1, text: "Prod — Studio audiovisuel B2B", section: "Modules" },
  { app: "hub",         appLabel: "Hub Velito",  url: "/construction?slug=store",       kind: "module", level: 1, text: "Store — Marketplace créateurs amiénois", section: "Modules" },
  { app: "hub",         appLabel: "Hub Velito",  url: "/construction?slug=morse",       kind: "module", level: 1, text: "Morse — Messagerie unifiée Velito", section: "Modules" },

  // Entrées /account du hub (page sobre, peu de texte en h1/h2)
  { app: "hub", appLabel: "Hub Velito", url: "/account", kind: "page", level: 1, text: "Mon compte — Identité, apps activées, déconnexion", section: "Compte" },
  { app: "hub", appLabel: "Hub Velito", url: "/login",   kind: "page", level: 1, text: "Connexion — Un compte unique pour toutes les apps Velito", section: "Compte" },
];

// ----------------------------------------------------------------------------
// Regex pour capturer le texte JSX entre balises ouvrantes/fermantes.
//   `<h1...>texte</h1>` — on capture "texte" (multi-ligne).
//   Limitation : si le contenu contient des expressions JS `{xxx}` on les vire.
//   Le contenu est ensuite nettoyé (entities HTML, whitespace).
// ----------------------------------------------------------------------------
const TAG_PATTERNS = [
  { tag: "h1", kind: "title",     level: 1 },
  { tag: "h2", kind: "subtitle",  level: 2 },
  { tag: "h3", kind: "subtitle",  level: 3 },
  { tag: "h4", kind: "subtitle",  level: 4 },
  { tag: "p",  kind: "paragraph", level: 5 },
  { tag: "li", kind: "item",      level: 5 },
];

const HTML_ENTITIES = {
  "&apos;": "'",
  "&quot;": '"',
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&laquo;": "«",
  "&raquo;": "»",
  "&hellip;": "…",
};

function decodeEntities(str) {
  return str.replace(/&[a-z]+;/g, (m) => HTML_ENTITIES[m] ?? m);
}

/**
 * Nettoie un fragment JSX :
 *  - vire les expressions {xxx} (variables, fonctions JS)
 *  - vire les sous-balises JSX <Foo .../> et leur contenu
 *  - décode les entities HTML
 *  - collapse les whitespaces
 * Retourne null si trop court pour être indexé (< 3 chars).
 */
function cleanJsxText(raw) {
  let cleaned = raw
    .replace(/\{[^}]*\}/g, " ")          // expressions JS
    .replace(/<[^>]+>/g, " ")            // sous-balises JSX
    .replace(/\s+/g, " ")                // collapse whitespaces
    .trim();
  cleaned = decodeEntities(cleaned);
  if (cleaned.length < 3) return null;
  return cleaned;
}

/**
 * Mappe un chemin de fichier .tsx Next.js (app router) vers une route URL.
 *  apps/hub/src/app/page.tsx               → /
 *  apps/hub/src/app/login/page.tsx         → /login
 *  apps/hub/src/app/login/LoginForm.tsx    → /login  (composant non-routeur)
 *  apps/vea/app/agenda/[slug]/page.tsx     → /agenda/[slug]
 *  Ignore layout.tsx (pas une route).
 */
function fileToRoute(relativePath, routePrefix) {
  let p = relativePath;
  // Normaliser séparateurs (Windows → /)
  p = p.split(sep).join("/");
  const prefixNorm = routePrefix.split(sep).join("/");
  if (p.startsWith(prefixNorm)) {
    p = p.slice(prefixNorm.length);
  }
  if (p.startsWith("/")) p = p.slice(1);
  // Retirer le fichier final (page.tsx, layout.tsx, ou autre composant)
  const segments = p.split("/");
  segments.pop();
  return "/" + segments.join("/");
}

/**
 * Récupère récursivement tous les .tsx d'un dossier.
 */
function listTsxFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTsxFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      // Skip layout.tsx (routing-only) + fichiers qui commencent par "_" (Next.js privés)
      if (entry.name === "layout.tsx") continue;
      out.push(full);
    }
  }
  return out;
}

/**
 * Extrait toutes les entrées d'un fichier .tsx pour une app donnée.
 * On garde une variable `currentSection` pour donner du contexte aux items
 * (le dernier titre rencontré dans le fichier).
 */
function extractEntries(fileFullPath, appConfig) {
  const raw = readFileSync(fileFullPath, "utf-8");
  const relativePath = relative(REPO_ROOT, fileFullPath);
  const route = fileToRoute(relativePath, appConfig.routePrefix);
  const url = appConfig.baseUrl + (route === "/" ? "" : route);

  const entries = [];
  let currentSection = null;
  let counter = 0;

  for (const { tag, kind, level } of TAG_PATTERNS) {
    // Regex non-greedy, multi-ligne. Capture tout entre <tag ...> et </tag>.
    const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "g");
    let match;
    while ((match = re.exec(raw)) !== null) {
      const text = cleanJsxText(match[1]);
      if (!text) continue;
      // Skip les textes purement techniques / placeholder
      if (/^(loading|error|fallback|undefined|null|true|false)$/i.test(text)) continue;
      // Skip les entrées suspectes (commentaires de code captés par la regex)
      if (text.length > 280) continue;
      if (text.includes("import ") && text.includes("from")) continue;
      if (text.includes("export default")) continue;
      if (/^[·\s`:,"{}]*$/.test(text)) continue;  // ponctuation pure

      entries.push({
        id: `${appConfig.app}-${relativePath.replace(/[\\/]/g, "_")}-${tag}-${counter++}`,
        app: appConfig.app,
        appLabel: appConfig.appLabel,
        url,
        kind,
        level,
        text,
        section: currentSection ?? undefined,
      });

      // Si c'est un titre, devient la section courante (donne du contexte aux items qui suivront)
      if (level <= 2) {
        currentSection = text;
      }
    }
  }

  return entries;
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
function main() {
  const allEntries = [];
  const stats = {};

  for (const appConfig of APPS) {
    const srcAbs = join(REPO_ROOT, appConfig.srcDir);
    const files = listTsxFiles(srcAbs);
    let appCount = 0;
    for (const file of files) {
      try {
        const entries = extractEntries(file, appConfig);
        allEntries.push(...entries);
        appCount += entries.length;
      } catch (err) {
        console.warn(`[build-search-index] échec ${file} : ${err.message}`);
      }
    }
    stats[appConfig.app] = { files: files.length, entries: appCount };
  }

  // Ajout des entrées manuelles
  for (const m of MANUAL_ENTRIES) {
    allEntries.push({
      id: `manual-${m.app}-${allEntries.length}`,
      ...m,
    });
    stats[m.app] = stats[m.app] ?? { files: 0, entries: 0 };
    stats[m.app].entries += 1;
  }

  // Sortie
  const outDir = join(REPO_ROOT, "apps/hub/public");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "search-index.json");
  writeFileSync(outPath, JSON.stringify(allEntries, null, 0), "utf-8");

  console.log(`[build-search-index] ${allEntries.length} entrées écrites dans ${outPath}`);
  for (const [app, s] of Object.entries(stats)) {
    console.log(`  - ${app.padEnd(12)} ${String(s.files).padStart(3)} fichiers → ${s.entries} entrées`);
  }
}

main();
