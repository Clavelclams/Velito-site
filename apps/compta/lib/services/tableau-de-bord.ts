/**
 * SERVICE TABLEAU DE BORD — couche logique métier.
 *
 * Agrège une liste de transactions en indicateurs : solde, totaux du mois,
 * répartition par catégorie. Fonctions 100 % PURES (aucun accès base) →
 * testables unitairement (voir tableau-de-bord.test.ts).
 *
 * Tous les calculs restent en CENTIMES ENTIERS. La division par 100 (euros)
 * n'a lieu qu'à l'affichage, via formaterCentimes. Les pourcentages sont les
 * seuls arrondis, et ils ne servent QU'À l'affichage des barres — jamais à un
 * montant stocké. Fiabilité des soldes = argument de jury (CDC §4).
 */
import type { Transaction, TypeFlux } from "@/types/database";

export interface TotauxType {
  recettes: number; // centimes
  depenses: number; // centimes
}

export interface LigneRepartition {
  nom: string;
  total: number; // centimes
  pourcentage: number; // 0..100, arrondi, pour la barre — affichage seulement
}

/** Somme des TTC par sens (recette / dépense) sur l'ensemble fourni. */
export function totauxParType(transactions: Transaction[]): TotauxType {
  let recettes = 0;
  let depenses = 0;
  for (const t of transactions) {
    if (t.type === "recette") recettes += t.montant_ttc_centimes;
    else depenses += t.montant_ttc_centimes;
  }
  return { recettes, depenses };
}

/**
 * Solde = total des recettes − total des dépenses (en centimes).
 * Peut être négatif (trésorerie dans le rouge) — c'est une information valide,
 * on ne la borne pas à 0.
 */
export function solde(transactions: Transaction[]): number {
  const { recettes, depenses } = totauxParType(transactions);
  return recettes - depenses;
}

/**
 * Filtre les transactions d'un mois donné.
 * @param annee ex : 2026   @param mois 1..12
 * Compare sur le préfixe "AAAA-MM" de date_transaction (type date SQL, déjà
 * au format ISO) : aucune manipulation de fuseau, donc aucun décalage de jour.
 */
export function filtrerMois(
  transactions: Transaction[],
  annee: number,
  mois: number,
): Transaction[] {
  const prefixe = `${annee}-${String(mois).padStart(2, "0")}`;
  return transactions.filter((t) => t.date_transaction.startsWith(prefixe));
}

/**
 * Répartition d'un type de flux par catégorie, triée du plus gros au plus
 * petit. Les transactions sans catégorie sont regroupées sous un libellé
 * dédié. Le pourcentage est calculé sur le total du type (pour des barres qui
 * somment à 100 %).
 *
 * @param nomsCategories  table { categorieId → nom } fournie par l'appelant.
 */
export function repartitionParCategorie(
  transactions: Transaction[],
  type: TypeFlux,
  nomsCategories: Record<string, string>,
  libelleSansCategorie = "Non catégorisé",
): LigneRepartition[] {
  const parCategorie = new Map<string, number>();

  for (const t of transactions) {
    if (t.type !== type) continue;
    const cle = t.categorie_id ?? "__aucune__";
    parCategorie.set(cle, (parCategorie.get(cle) ?? 0) + t.montant_ttc_centimes);
  }

  const total = [...parCategorie.values()].reduce((a, b) => a + b, 0);

  const lignes: LigneRepartition[] = [...parCategorie.entries()].map(
    ([cle, montant]) => ({
      nom:
        cle === "__aucune__"
          ? libelleSansCategorie
          : (nomsCategories[cle] ?? "Catégorie supprimée"),
      total: montant,
      // total === 0 impossible ici (chaque entrée a au moins une transaction
      // à montant > 0), mais on protège la division par prudence.
      pourcentage: total === 0 ? 0 : Math.round((montant * 100) / total),
    }),
  );

  // Tri décroissant par montant (le poste le plus lourd en premier).
  return lignes.sort((a, b) => b.total - a.total);
}
