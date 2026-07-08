/**
 * SERVICE IMPORT CSV — couche logique métier.
 *
 * Transforme le texte d'un relevé bancaire CSV en lignes prêtes à importer,
 * avec un rapport d'erreur PAR LIGNE (une ligne fautive ne fait pas échouer
 * tout l'import). Fonctions PURES → testables, et réutilisables côté client
 * pour la prévisualisation ET côté serveur pour l'écriture.
 *
 * Décisions à défendre :
 *  - découpage RFC 4180 (guillemets, séparateurs et sauts de ligne échappés) :
 *    un libellé bancaire « VIR "SALAIRE"; REF 42 » ne casse pas les colonnes ;
 *  - le SIGNE du montant porte le sens (négatif = dépense, positif = recette),
 *    ce qui colle aux relevés bancaires ; on ne stocke ensuite qu'un montant
 *    positif + un type (cohérent avec le schéma) ;
 *  - les lignes importées naissent en statut « à vérifier » (côté repository) :
 *    elles sont à catégoriser/confirmer, pas encore validées.
 */
import type { TypeFlux } from "@/types/database";
import type { SaisieTransaction } from "@/lib/services/transactions";
import { eurosVersCentimes, centimesVersSaisie } from "@/lib/services/montants";

export type FormatDate = "JJ/MM/AAAA" | "AAAA-MM-JJ";

export interface OptionsImport {
  separateur: string; // ";" ou ","
  aEntete: boolean; // la 1re ligne est-elle un en-tête à ignorer ?
  formatDate: FormatDate;
  colonneDate: number; // index de colonne (0-based)
  colonneLibelle: number;
  colonneMontant: number;
}

export interface LigneImport {
  numero: number; // n° de ligne de DONNÉES (1-based), pour l'affichage
  brut: string[];
  ok: boolean;
  saisie?: SaisieTransaction; // présent si ok
  erreur?: string; // présent si !ok
}

/**
 * Découpe un texte CSV en matrice [lignes][colonnes], en respectant les
 * guillemets (RFC 4180). Gère \r\n / \r / \n et les guillemets doublés ("").
 */
export function decouperCsv(texte: string, separateur: string): string[][] {
  const t = texte.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = "";
  let dansGuillemets = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (dansGuillemets) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          champ += '"';
          i++; // guillemet doublé = un guillemet littéral
        } else {
          dansGuillemets = false;
        }
      } else {
        champ += c;
      }
    } else if (c === '"') {
      dansGuillemets = true;
    } else if (c === separateur) {
      ligne.push(champ);
      champ = "";
    } else if (c === "\n") {
      ligne.push(champ);
      lignes.push(ligne);
      ligne = [];
      champ = "";
    } else {
      champ += c;
    }
  }
  // Dernier champ / dernière ligne (si le fichier ne finit pas par un saut).
  if (champ !== "" || ligne.length > 0) {
    ligne.push(champ);
    lignes.push(ligne);
  }

  // On ignore les lignes entièrement vides (fréquentes en fin de fichier).
  return lignes.filter((l) => !(l.length === 1 && l[0]!.trim() === ""));
}

/** Devine le séparateur le plus probable d'après la 1re ligne non vide. */
export function detecterSeparateur(texte: string): string {
  const premiere = texte.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  const pointVirgules = (premiere.match(/;/g) ?? []).length;
  const virgules = (premiere.match(/,/g) ?? []).length;
  return pointVirgules >= virgules ? ";" : ",";
}

/** "12/07/2026" ou "2026-07-12" → "2026-07-12" (ISO) ; null si invalide. */
export function parseDate(valeur: string, format: FormatDate): string | null {
  const v = valeur.trim();
  let a: string, m: string, j: string;

  if (format === "JJ/MM/AAAA") {
    const p = v.split(/[/.\-]/);
    if (p.length !== 3) return null;
    [j, m, a] = p as [string, string, string];
  } else {
    const p = v.split("-");
    if (p.length !== 3) return null;
    [a, m, j] = p as [string, string, string];
  }

  if (!/^\d{1,2}$/.test(j) || !/^\d{1,2}$/.test(m) || !/^\d{4}$/.test(a)) {
    return null;
  }
  const iso = `${a}-${m.padStart(2, "0")}-${j.padStart(2, "0")}`;
  // Vérifie que la date EXISTE réellement (round-trip, sans décalage fuseau).
  const d = new Date(iso + "T00:00:00Z");
  return d.toISOString().slice(0, 10) === iso ? iso : null;
}

/**
 * Interprète un montant signé de relevé : le signe donne le sens.
 * "-45,00" → dépense 4500 ; "1 234,56" → recette 123456. null si invalide
 * ou nul (un mouvement à 0 n'a pas de sens).
 */
export function parseMontantSigne(
  valeur: string,
): { type: TypeFlux; centimes: number } | null {
  const v = valeur.trim();
  if (v === "") return null;
  const negatif = v.startsWith("-");
  // On retire un éventuel signe de tête, puis on réutilise le parseur maison
  // (qui gère "1 234,56", la virgule, etc. et refuse tout signe résiduel).
  const sansSigne = v.replace(/^[-+]/, "").trim();
  const centimes = eurosVersCentimes(sansSigne);
  if (centimes === null || centimes === 0) return null;
  return { type: negatif ? "depense" : "recette", centimes };
}

/**
 * Construit les lignes d'import à partir de la matrice CSV et des options de
 * mapping. Chaque ligne est validée indépendamment ; le résultat porte soit
 * une `saisie` prête, soit une `erreur` explicite.
 */
export function construireLignesImport(
  matrice: string[][],
  options: OptionsImport,
  entiteId: string,
): LigneImport[] {
  const donnees = options.aEntete ? matrice.slice(1) : matrice;

  return donnees.map((brut, index) => {
    const numero = index + 1;
    const cellule = (i: number) => (i >= 0 && i < brut.length ? brut[i]!.trim() : "");

    const dateBrute = cellule(options.colonneDate);
    const libelle = cellule(options.colonneLibelle);
    const montantBrut = cellule(options.colonneMontant);

    const dateIso = parseDate(dateBrute, options.formatDate);
    if (dateIso === null) {
      return { numero, brut, ok: false, erreur: `Date invalide : « ${dateBrute} »` };
    }
    if (libelle === "") {
      return { numero, brut, ok: false, erreur: "Libellé vide" };
    }
    const montant = parseMontantSigne(montantBrut);
    if (montant === null) {
      return { numero, brut, ok: false, erreur: `Montant invalide : « ${montantBrut} »` };
    }

    const saisie: SaisieTransaction = {
      entiteId,
      categorieId: null, // catégorisation faite après l'import
      type: montant.type,
      dateTransaction: dateIso,
      libelle,
      montantTtc: centimesVersSaisie(montant.centimes), // "45,00" (relu par le service)
      montantTva: "", // relevé bancaire = TTC seul, TVA inconnue
    };
    return { numero, brut, ok: true, saisie };
  });
}
