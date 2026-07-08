/**
 * Tests unitaires du SERVICE TABLEAU DE BORD (fonctions pures).
 * Lancer :  node scripts/test.mjs lib/services/tableau-de-bord.test.ts
 *
 * On vérifie l'exactitude des agrégats financiers (solde, totaux du mois,
 * répartition) — le cœur de la fiabilité attendue au jury (CDC §4).
 */
import {
  totauxParType,
  solde,
  filtrerMois,
  repartitionParCategorie,
} from "./tableau-de-bord.ts";
import type { Transaction } from "../../types/database.ts";

let pass = 0;
let fail = 0;
function ok(label: string, condition: boolean) {
  if (condition) {
    pass++;
    console.log("  PASS  " + label);
  } else {
    fail++;
    console.log("  FAIL  " + label);
  }
}

/** Fabrique une transaction minimale pour les tests. */
function tx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: Math.random().toString(),
    entite_id: "e1",
    categorie_id: null,
    type: "depense",
    statut: "validee",
    date_transaction: "2026-07-07",
    libelle: "test",
    montant_ttc_centimes: 1000,
    montant_tva_centimes: 0,
    montant_ht_centimes: 1000,
    cree_le: "2026-07-07T00:00:00Z",
    modifie_le: "2026-07-07T00:00:00Z",
    ...over,
  };
}

const jeu: Transaction[] = [
  tx({ type: "recette", montant_ttc_centimes: 50000, date_transaction: "2026-07-03", categorie_id: "c-subv" }),
  tx({ type: "depense", montant_ttc_centimes: 12000, date_transaction: "2026-07-10", categorie_id: "c-mat" }),
  tx({ type: "depense", montant_ttc_centimes: 8000, date_transaction: "2026-07-15", categorie_id: "c-mat" }),
  tx({ type: "depense", montant_ttc_centimes: 5000, date_transaction: "2026-06-30", categorie_id: null }),
];

// --- totauxParType ---
const tot = totauxParType(jeu);
ok("recettes = 50000", tot.recettes === 50000);
ok("dépenses = 25000", tot.depenses === 25000);

// --- solde ---
ok("solde = 25000 (50000 - 25000)", solde(jeu) === 25000);
ok("solde peut être négatif", solde([tx({ type: "depense", montant_ttc_centimes: 100 })]) === -100);
ok("solde d'une liste vide = 0", solde([]) === 0);

// --- filtrerMois ---
ok("juillet 2026 → 3 transactions", filtrerMois(jeu, 2026, 7).length === 3);
ok("juin 2026 → 1 transaction", filtrerMois(jeu, 2026, 6).length === 1);
ok("mois sans données → 0", filtrerMois(jeu, 2026, 1).length === 0);
ok("mois < 10 est bien zéro-paddé (pas de faux match)", filtrerMois(jeu, 2026, 5).length === 0);

// --- repartitionParCategorie (dépenses) ---
const noms = { "c-mat": "Matériel", "c-subv": "Subventions" };
const rep = repartitionParCategorie(jeu, "depense", noms);
ok("2 postes de dépense (Matériel + Non catégorisé)", rep.length === 2);
ok("poste le plus lourd en premier (Matériel 20000)", rep[0]!.nom === "Matériel" && rep[0]!.total === 20000);
ok("Matériel = 80% (20000/25000)", rep[0]!.pourcentage === 80);
ok("Non catégorisé présent (5000, 20%)", rep[1]!.nom === "Non catégorisé" && rep[1]!.pourcentage === 20);
ok("somme des pourcentages = 100", rep.reduce((a, l) => a + l.pourcentage, 0) === 100);

// --- répartition d'un type absent ---
ok("répartition recette d'une liste sans recette = []", repartitionParCategorie([tx()], "recette", {}).length === 0);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
