/**
 * ACCÈS AUX DONNÉES — les fiches de révision.
 *
 * Décision d'architecture V1 : les fiches sont des FICHIERS MARKDOWN dans
 * content/fiches/, pas des lignes en base. Pourquoi :
 *  1. N'importe quelle conversation Claude (une par projet) peut en produire —
 *     il suffit de déposer un .md dans le dossier, pas d'API à appeler ;
 *  2. Versionné par Git : l'historique des fiches EST l'historique de ma
 *     progression (défendable au jury) ;
 *  3. Zéro table, zéro migration, zéro RLS à maintenir pour un outil perso.
 * Le jour où il faut du multi-utilisateurs (vraie plateforme), cette couche
 * est la SEULE à réécrire — c'est tout l'intérêt de l'avoir isolée ici.
 *
 * Ce module utilise fs → SERVEUR UNIQUEMENT (Server Components). Ne jamais
 * l'importer dans un composant "use client".
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/** Métadonnées d'une fiche — miroir du frontmatter YAML (voir PROMPT_FICHES.md). */
export interface FicheMeta {
  /** Nom du fichier sans .md — sert d'URL (/fiches/[slug]). */
  slug: string;
  titre: string;
  /** Projet source : compta, interactive, mabb, pirb, hub, vea, vena, arena, autre. */
  projet: string;
  /** Bloc du référentiel CDA : 1 développer · 2 concevoir · 3 déployer. */
  bloc: 1 | 2 | 3;
  themes: string[];
  /** Fichier(s) de code réel dont la fiche parle. */
  source?: string;
  /** Date de création (ISO). */
  date: string;
}

export interface Fiche extends FicheMeta {
  /** Le corps Markdown (sans le frontmatter). */
  contenu: string;
}

const DOSSIER_FICHES = path.join(process.cwd(), "content", "fiches");
const DOSSIER_PROJETS = path.join(process.cwd(), "content", "projets");

/**
 * FICHE PROJET — le second type de contenu du site.
 * Une par projet (content/projets/<projet>.md), maintenue par la
 * conversation Claude du projet : présentation, architecture, comment c'est
 * fait, état d'avancement, décisions techniques justifiées, prochaines
 * étapes. C'est à la fois mon tableau de suivi ET le brouillon vivant du
 * dossier professionnel CDA.
 */
export interface ProjetMeta {
  slug: string;
  titre: string;
  /** Avancement estimé 0-100 (affiché en barre sur le dashboard). */
  avancement: number;
  statut: string;
  /** Date de dernière mise à jour de la fiche (ISO). */
  maj: string;
}

export interface Projet extends ProjetMeta {
  contenu: string;
}

/** Toutes les fiches projet, triées par date de mise à jour. */
export function listerProjets(): ProjetMeta[] {
  if (!fs.existsSync(DOSSIER_PROJETS)) return [];
  return fs
    .readdirSync(DOSSIER_PROJETS)
    .filter((f) => f.endsWith(".md"))
    .map((fichier) => {
      const brut = fs.readFileSync(path.join(DOSSIER_PROJETS, fichier), "utf8");
      const { data } = matter(brut);
      const slug = fichier.replace(/\.md$/, "");
      const avancementBrut = Number(data.avancement);
      return {
        slug,
        titre: String(data.titre ?? slug),
        avancement: Number.isFinite(avancementBrut)
          ? Math.max(0, Math.min(100, avancementBrut))
          : 0,
        statut: String(data.statut ?? "en cours"),
        maj: String(data.maj ?? ""),
      };
    })
    .sort((a, b) => b.maj.localeCompare(a.maj));
}

/** Une fiche projet complète, ou null. */
export function getProjet(slug: string): Projet | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const chemin = path.join(DOSSIER_PROJETS, `${slug}.md`);
  if (!fs.existsSync(chemin)) return null;
  const brut = fs.readFileSync(chemin, "utf8");
  const { data, content } = matter(brut);
  const avancementBrut = Number(data.avancement);
  return {
    slug,
    titre: String(data.titre ?? slug),
    avancement: Number.isFinite(avancementBrut)
      ? Math.max(0, Math.min(100, avancementBrut))
      : 0,
    statut: String(data.statut ?? "en cours"),
    maj: String(data.maj ?? ""),
    contenu: content,
  };
}

/** Valide et normalise le frontmatter d'un fichier (défauts prudents). */
function versMeta(slug: string, data: Record<string, unknown>): FicheMeta {
  const blocBrut = Number(data.bloc);
  return {
    slug,
    titre: String(data.titre ?? slug),
    projet: String(data.projet ?? "autre").toLowerCase(),
    bloc: blocBrut === 1 || blocBrut === 2 || blocBrut === 3 ? blocBrut : 1,
    themes: Array.isArray(data.themes) ? data.themes.map(String) : [],
    source: data.source ? String(data.source) : undefined,
    date: String(data.date ?? ""),
  };
}

/** Toutes les fiches (métadonnées seules), triées des plus récentes aux plus anciennes. */
export function listerFiches(): FicheMeta[] {
  if (!fs.existsSync(DOSSIER_FICHES)) return [];
  return fs
    .readdirSync(DOSSIER_FICHES)
    .filter((f) => f.endsWith(".md"))
    .map((fichier) => {
      const brut = fs.readFileSync(path.join(DOSSIER_FICHES, fichier), "utf8");
      const { data } = matter(brut);
      return versMeta(fichier.replace(/\.md$/, ""), data);
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Une fiche complète (métadonnées + contenu Markdown), ou null si absente. */
export function getFiche(slug: string): Fiche | null {
  // Garde anti path-traversal : le slug vient de l'URL, on interdit tout
  // caractère de chemin ("../../etc/passwd" ne doit jamais atteindre fs).
  if (!/^[a-z0-9-]+$/.test(slug)) return null;

  const chemin = path.join(DOSSIER_FICHES, `${slug}.md`);
  if (!fs.existsSync(chemin)) return null;

  const brut = fs.readFileSync(chemin, "utf8");
  const { data, content } = matter(brut);
  return { ...versMeta(slug, data), contenu: content };
}
