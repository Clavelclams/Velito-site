/**
 * Format « défi au score » (17/11/2026, migration 015) — logique pure, testée.
 *
 * Un défi = des rotations ; une rotation = deux équipes éphémères (Rouge,
 * Bleu) ; une équipe = un score. Aucune personne nulle part : une équipe
 * s'appelle « G3 Rouge », point.
 *
 * Ce module décide : le nom d'une équipe, le classement du jour, le record,
 * le récapitulatif, le CSV, et ce que l'écran doit montrer à un instant
 * donné. Les pages et les actions ne font qu'afficher et écrire.
 */

export type Couleur = "ROUGE" | "BLEU";
export type StatutRotation = "A_VENIR" | "EN_COURS" | "VALIDEE";
export type Phase = "ESSAI" | "COMPTEE";

export interface EquipeDefi {
  id: string;
  rotation_id: string;
  couleur: Couleur;
  score: number;
}

export interface RotationDefi {
  id: string;
  numero: number;
  heure: string | null;
  statut: StatutRotation;
  phase: Phase | null;
  chrono_debut: string | null;
  chrono_fin: string | null;
  valide_le: string | null;
}

export interface Defi {
  id: string;
  titre: string;
  unite: string;
  token: string;
  duree_manche_s: number;
  rotation_courante_id: string | null;
}

export const COULEURS: Couleur[] = ["ROUGE", "BLEU"];
export const NOM_COULEUR: Record<Couleur, string> = { ROUGE: "Rouge", BLEU: "Bleu" };

export function nomEquipe(numero: number, couleur: Couleur): string {
  return `G${numero} ${NOM_COULEUR[couleur]}`;
}

/**
 * Programme saisi par le staff, une rotation par ligne : « G1 9h30 »,
 * « 1 09:30 », « G6 11h00 ». Renvoie les rotations triées, ou une erreur.
 */
export function parserProgramme(texte: string): { ok: true; rotations: { numero: number; heure: string }[] } | { ok: false; erreur: string } {
  const lignes = texte.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lignes.length === 0) return { ok: false, erreur: "Programme vide : une rotation par ligne, par exemple « G1 9h30 »." };
  if (lignes.length > 40) return { ok: false, erreur: "40 rotations au maximum." };
  const vues = new Set<number>();
  const rotations: { numero: number; heure: string }[] = [];
  for (const ligne of lignes) {
    const m = /^G?(\d{1,2})\s+(\d{1,2})\s*[h:]\s*(\d{2})$/i.exec(ligne);
    if (!m) return { ok: false, erreur: `Ligne « ${ligne} » illisible : écris par exemple « G1 9h30 ».` };
    const numero = Number(m[1]);
    const h = Number(m[2]);
    const min = Number(m[3]);
    if (numero < 1 || h > 23 || min > 59) return { ok: false, erreur: `Ligne « ${ligne} » : numéro ou heure impossible.` };
    if (vues.has(numero)) return { ok: false, erreur: `G${numero} apparaît deux fois.` };
    vues.add(numero);
    rotations.push({ numero, heure: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}` });
  }
  rotations.sort((a, b) => a.numero - b.numero);
  return { ok: true, rotations };
}

export interface LigneClassementDefi {
  rang: number;
  nom: string;
  couleur: Couleur;
  numero: number;
  score: number;
}

/**
 * Classement du jour : les équipes des rotations VALIDÉES, par score
 * décroissant. Ex æquo : même rang, puis la rotation la plus ancienne
 * d'abord (elle a posé le score la première).
 */
export function classementDuJour(rotations: RotationDefi[], equipes: EquipeDefi[]): LigneClassementDefi[] {
  const parId = new Map(rotations.map((r) => [r.id, r]));
  const lignes = equipes
    .map((e) => ({ e, r: parId.get(e.rotation_id) }))
    .filter((x): x is { e: EquipeDefi; r: RotationDefi } => !!x.r && x.r.statut === "VALIDEE")
    .map(({ e, r }) => ({ nom: nomEquipe(r.numero, e.couleur), couleur: e.couleur, numero: r.numero, score: e.score }))
    .sort((a, b) => b.score - a.score || a.numero - b.numero || (a.couleur === "ROUGE" ? -1 : 1));
  let rang = 0;
  let precedent: number | null = null;
  return lignes.map((l, i) => {
    if (l.score !== precedent) {
      rang = i + 1;
      precedent = l.score;
    }
    return { rang, ...l };
  });
}

/** Le record du jour (null si aucune rotation validée, ou que des zéros). */
export function recordDuJour(classement: LigneClassementDefi[]): { score: number; equipes: string[] } | null {
  const premier = classement[0];
  if (!premier || premier.score === 0) return null;
  return { score: premier.score, equipes: classement.filter((l) => l.score === premier.score).map((l) => l.nom) };
}

/** Gagnant d'une rotation : couleur, « EGALITE », ou null si pas de score. */
export function gagnantRotation(equipes: EquipeDefi[]): Couleur | "EGALITE" | null {
  const r = equipes.find((e) => e.couleur === "ROUGE");
  const b = equipes.find((e) => e.couleur === "BLEU");
  if (!r || !b) return null;
  if (r.score === 0 && b.score === 0) return null;
  if (r.score === b.score) return "EGALITE";
  return r.score > b.score ? "ROUGE" : "BLEU";
}

export interface LigneRecap {
  numero: number;
  heure: string | null;
  statut: StatutRotation;
  rouge: number;
  bleu: number;
  total: number;
  gagnant: Couleur | "EGALITE" | null;
}

export function recapitulatif(rotations: RotationDefi[], equipes: EquipeDefi[]) {
  const lignes: LigneRecap[] = [...rotations]
    .sort((a, b) => a.numero - b.numero)
    .map((r) => {
      const eq = equipes.filter((e) => e.rotation_id === r.id);
      const rouge = eq.find((e) => e.couleur === "ROUGE")?.score ?? 0;
      const bleu = eq.find((e) => e.couleur === "BLEU")?.score ?? 0;
      return { numero: r.numero, heure: r.heure, statut: r.statut, rouge, bleu, total: rouge + bleu, gagnant: gagnantRotation(eq) };
    });
  const jouees = lignes.filter((l) => l.statut === "VALIDEE");
  return {
    lignes,
    rotationsJouees: jouees.length,
    totalJour: jouees.reduce((s, l) => s + l.total, 0),
  };
}

/** Lignes du CSV (une par équipe, puis le total), prêtes pour genererCsv. */
export function lignesCsv(rotations: RotationDefi[], equipes: EquipeDefi[], unite: string): string[][] {
  const recap = recapitulatif(rotations, equipes);
  const lignes: string[][] = [["Rotation", "Heure", "Équipe", `Score (${unite})`, "Gagnant de la rotation", "Statut"]];
  for (const l of recap.lignes) {
    const statut = l.statut === "VALIDEE" ? "jouée" : l.statut === "EN_COURS" ? "en cours" : "à venir";
    const gagnant = l.gagnant === "EGALITE" ? "égalité" : l.gagnant ? nomEquipe(l.numero, l.gagnant) : "";
    for (const c of COULEURS) {
      lignes.push([`G${l.numero}`, l.heure ?? "", nomEquipe(l.numero, c), String(c === "ROUGE" ? l.rouge : l.bleu), gagnant, statut]);
    }
  }
  lignes.push([]);
  lignes.push(["Total de la matinée (rotations jouées)", "", "", String(recap.totalJour), "", `${recap.rotationsJouees} rotation(s) jouée(s)`]);
  return lignes;
}

// ---------------------------------------------------------------------------
// Ce que l'écran montre à l'instant t
// ---------------------------------------------------------------------------

export type Panneau = "COMMENT" | "MANETTE" | "CLASSEMENT";
export const PANNEAUX: Panneau[] = ["COMMENT", "MANETTE", "CLASSEMENT"];
/** Durée d'affichage de chaque panneau en alternance (ms). */
export const DUREE_PANNEAU_MS = 12_000;
/** Après la fin du chrono de la manche comptée, le résultat reste affiché. */
export const DUREE_RESULTAT_MS = 150_000;

export type VueEcran =
  | { type: "MANCHE"; phase: Phase; resteMs: number }
  | { type: "RESULTAT" }
  | { type: "ALTERNANCE"; panneau: Panneau };

/**
 * - chrono en cours → la manche (compte à rebours géant), alternance en pause ;
 * - manche comptée finie depuis moins de 2 min 30 → le résultat de la rotation ;
 * - sinon → alternance des trois panneaux, réglée sur l'horloge (tous les
 *   écrans ouverts montrent le même panneau au même moment).
 */
export function vueEcran(rotation: Pick<RotationDefi, "phase" | "chrono_fin"> | null, maintenantMs: number): VueEcran {
  if (rotation?.chrono_fin && rotation.phase) {
    const fin = Date.parse(rotation.chrono_fin);
    if (fin > maintenantMs) return { type: "MANCHE", phase: rotation.phase, resteMs: fin - maintenantMs };
    if (rotation.phase === "COMPTEE" && maintenantMs - fin < DUREE_RESULTAT_MS) return { type: "RESULTAT" };
  }
  const i = Math.floor(maintenantMs / DUREE_PANNEAU_MS) % PANNEAUX.length;
  return { type: "ALTERNANCE", panneau: PANNEAUX[i]! };
}

/** 187 000 ms → « 3:07 » ; arrondi au-dessus (on n'affiche pas 0:00 avant la fin). */
export function formaterChrono(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
