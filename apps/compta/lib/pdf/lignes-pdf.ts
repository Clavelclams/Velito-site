/**
 * PDF → lignes de texte positionnées (07/11/2026). Côté SERVEUR uniquement.
 *
 * Librairie : unpdf (build de pdf.js prévu pour Node et le serverless, sans
 * worker à configurer). Pourquoi une librairie : un PDF n'est pas du texte,
 * c'est une liste d'instructions de dessin ; il faut un vrai lecteur pour en
 * sortir les morceaux de texte ET leur position.
 *
 * On regroupe les morceaux qui ont (presque) la même ordonnée en une ligne,
 * de haut en bas, puis de gauche à droite. Le sens métier (débit, crédit,
 * soldes) est décidé ailleurs, dans le service pur lib/services/releve-cm.ts.
 *
 * Le fichier n'est jamais écrit sur disque ni stocké : lu en mémoire, puis oublié.
 * Importé uniquement depuis une server action (jamais depuis un composant client).
 */
import { getDocumentProxy } from "unpdf";
import type { LigneTexte } from "@/lib/services/releve-cm";

/** Tolérance verticale (points) pour considérer deux morceaux sur la même ligne. */
const TOLERANCE_Y = 2;

export async function lignesDuPdf(octets: Uint8Array): Promise<LigneTexte[]> {
  const pdf = await getDocumentProxy(octets);
  const lignes: LigneTexte[] = [];
  try {
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const contenu = await page.getTextContent();
      const parY = new Map<number, LigneTexte>();
      for (const item of contenu.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const x = item.transform[4] as number;
        const y = Math.round(item.transform[5] as number);
        const cle = [...parY.keys()].find((k) => Math.abs(k - y) <= TOLERANCE_Y) ?? y;
        if (!parY.has(cle)) parY.set(cle, { page: p, y: cle, elements: [] });
        parY.get(cle)!.elements.push({ x, largeur: item.width, texte: item.str });
      }
      const triees = [...parY.values()].sort((a, b) => b.y - a.y);
      for (const l of triees) l.elements.sort((a, b) => a.x - b.x);
      lignes.push(...triees);
    }
  } finally {
    // Libère la mémoire du document (le loadingTask porte la destruction).
    await pdf.loadingTask.destroy();
  }
  return lignes;
}
