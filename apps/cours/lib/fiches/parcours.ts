/**
 * ACCÈS AUX DONNÉES — les parcours d'apprentissage.
 *
 * Un parcours = une techno de MA stack (html-css, javascript, sql, php-symfony…),
 * découpée en leçons ORDONNÉES du niveau zéro au niveau « défendable au jury ».
 * Structure sur disque (même philosophie fichiers que fiches/quiz — pas de BDD) :
 *
 *   content/parcours/<techno>/_parcours.json   → métadonnées du parcours
 *   content/parcours/<techno>/<NN-slug>.md     → une leçon (NN = ordre sur 2 chiffres)
 *
 * Chaque leçon a un identifiant global `<techno>-<NN-slug>` : c'est cette clé
 * qui relie la leçon à son quiz (content/quiz/<id>.json) et à la progression
 * (localStorage). Ce module utilise fs → SERVEUR UNIQUEMENT.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface ParcoursMeta {
  /** Nom du dossier — sert d'URL (/parcours/[techno]). */
  slug: string;
  titre: string;
  description: string;
  /** Emoji affiché sur la carte du parcours. */
  icone: string;
  /** Ordre d'affichage recommandé des parcours entre eux. */
  ordre: number;
  nbLecons: number;
  /** Identifiants globaux des leçons (pour calculer la progression côté client). */
  idsLecons: string[];
}

export interface LeconMeta {
  /** Identifiant global : `<techno>-<fichier sans .md>` (clé quiz + progression). */
  id: string;
  /** Nom de fichier sans .md — segment d'URL (/parcours/[techno]/[lecon]). */
  fichier: string;
  parcours: string;
  titre: string;
  ordre: number;
  /** debutant | intermediaire | solide */
  niveau: string;
  /** Durée estimée en minutes. */
  duree: number;
}

export interface Lecon extends LeconMeta {
  contenu: string;
}

const DOSSIER_PARCOURS = path.join(process.cwd(), "content", "parcours");

/** Garde anti path-traversal — les deux segments viennent de l'URL. */
const SLUG_VALIDE = /^[a-z0-9-]+$/;

/** Métadonnées d'un parcours depuis son _parcours.json (défauts prudents). */
function lireInfosParcours(techno: string): Omit<ParcoursMeta, "slug" | "nbLecons" | "idsLecons"> {
  const chemin = path.join(DOSSIER_PARCOURS, techno, "_parcours.json");
  try {
    const brut = JSON.parse(fs.readFileSync(chemin, "utf8")) as Record<string, unknown>;
    return {
      titre: String(brut.titre ?? techno),
      description: String(brut.description ?? ""),
      icone: String(brut.icone ?? "📚"),
      ordre: Number.isFinite(Number(brut.ordre)) ? Number(brut.ordre) : 99,
    };
  } catch {
    return { titre: techno, description: "", icone: "📚", ordre: 99 };
  }
}

/** Les leçons d'un parcours, triées par ordre. */
export function listerLecons(techno: string): LeconMeta[] {
  if (!SLUG_VALIDE.test(techno)) return [];
  const dossier = path.join(DOSSIER_PARCOURS, techno);
  if (!fs.existsSync(dossier)) return [];
  return fs
    .readdirSync(dossier)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((nomFichier) => {
      const brut = fs.readFileSync(path.join(dossier, nomFichier), "utf8");
      const { data } = matter(brut);
      const fichier = nomFichier.replace(/\.md$/, "");
      const ordreBrut = Number(data.ordre);
      return {
        id: `${techno}-${fichier}`,
        fichier,
        parcours: techno,
        titre: String(data.titre ?? fichier),
        ordre: Number.isFinite(ordreBrut) ? ordreBrut : 99,
        niveau: String(data.niveau ?? "debutant"),
        duree: Number.isFinite(Number(data.duree)) ? Number(data.duree) : 20,
      };
    })
    .sort((a, b) => a.ordre - b.ordre);
}

/** Tous les parcours, triés, avec leur compte de leçons. */
export function listerParcours(): ParcoursMeta[] {
  if (!fs.existsSync(DOSSIER_PARCOURS)) return [];
  return fs
    .readdirSync(DOSSIER_PARCOURS, { withFileTypes: true })
    .filter((e) => e.isDirectory() && SLUG_VALIDE.test(e.name))
    .map((e) => {
      const lecons = listerLecons(e.name);
      return {
        slug: e.name,
        ...lireInfosParcours(e.name),
        nbLecons: lecons.length,
        idsLecons: lecons.map((l) => l.id),
      };
    })
    .filter((p) => p.nbLecons > 0)
    .sort((a, b) => a.ordre - b.ordre);
}

/** Une leçon complète (métadonnées + Markdown), ou null. */
export function getLecon(techno: string, fichier: string): Lecon | null {
  if (!SLUG_VALIDE.test(techno) || !SLUG_VALIDE.test(fichier)) return null;
  const chemin = path.join(DOSSIER_PARCOURS, techno, `${fichier}.md`);
  if (!fs.existsSync(chemin)) return null;
  const meta = listerLecons(techno).find((l) => l.fichier === fichier);
  if (!meta) return null;
  const { content } = matter(fs.readFileSync(chemin, "utf8"));
  return { ...meta, contenu: content };
}
