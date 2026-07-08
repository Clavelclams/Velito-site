/**
 * Tests unitaires du SERVICE ÉTATS FINANCIERS (fonctions pures).
 * Lancer :  node scripts/test.mjs lib/services/etats-financiers.test.ts
 *
 * Scénario complet (3 écritures) et vérification de l'INVARIANT clé :
 * bilan équilibré (actif = passif) dès lors que les écritures le sont.
 */
import { compteDeResultat, bilan } from "./etats-financiers.ts";
import type { LigneEcriture, Compte } from "../../types/database.ts";

let pass = 0;
let fail = 0;
function ok(label: string, condition: boolean) {
  if (condition) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label); }
}

const compte = (id: string, numero: string, libelle: string): Compte => ({
  id, entite_id: "e1", numero, libelle, classe: Number(numero[0]), active: true, cree_le: "2026-01-01T00:00:00Z",
});
const comptes: Compte[] = [
  compte("512", "512", "Banque"),
  compte("101", "101", "Capital"),
  compte("706", "706", "Prestations"),
  compte("44571", "44571", "TVA collectée"),
  compte("606", "606", "Achats"),
  compte("44566", "44566", "TVA déductible"),
];

let i = 0;
const L = (compteId: string, debit: number, credit: number): LigneEcriture => ({
  id: `l${i++}`, ecriture_id: "x", entite_id: "e1", compte_id: compteId,
  debit_centimes: debit, credit_centimes: credit,
});

// 1. Apport capital 1000€ ; 2. Vente 240 (dont TVA 40) ; 3. Achat 120 (dont TVA 20).
const lignes: LigneEcriture[] = [
  L("512", 100000, 0), L("101", 0, 100000),
  L("512", 24000, 0), L("706", 0, 20000), L("44571", 0, 4000),
  L("606", 10000, 0), L("44566", 2000, 0), L("512", 0, 12000),
];

// --- compte de résultat ---
const cr = compteDeResultat(lignes, comptes);
ok("produits = 20000", cr.totalProduits === 20000);
ok("charges = 10000", cr.totalCharges === 10000);
ok("résultat = 10000 (bénéfice)", cr.resultat === 10000);
ok("détail : 1 produit, 1 charge", cr.detailProduits.length === 1 && cr.detailCharges.length === 1);

// --- bilan ---
const b = bilan(lignes, comptes);
// Actif : 512 = 124000-12000 = 112000 ; 44566 = 2000 → 114000
ok("total actif = 114000", b.totalActif === 114000);
// Passif : 101 = 100000 ; 44571 = 4000 ; résultat 10000 → 114000
ok("total passif = 114000", b.totalPassif === 114000);
ok("BILAN ÉQUILIBRÉ (actif = passif)", b.equilibre === true);
ok("banque à l'actif 112000", b.actif.some((l) => l.numero === "512" && l.montant === 112000));
ok("capital au passif 100000", b.passif.some((l) => l.numero === "101" && l.montant === 100000));
ok("résultat porté au passif", b.passif.some((l) => l.numero === "120" && l.montant === 10000));

// --- invariant sur un jeu quelconque équilibré (perte) ---
const perte: LigneEcriture[] = [
  L("512", 5000, 0), L("101", 0, 5000), // capital 50
  L("606", 8000, 0), L("512", 0, 8000), // charge 80, banque -80
];
const bp = bilan(perte, comptes);
ok("équilibre tenu même en perte", bp.equilibre === true);
ok("résultat négatif (perte -8000)", bp.resultat === -8000);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
