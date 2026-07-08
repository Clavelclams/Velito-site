/**
 * Tests unitaires du SERVICE FEC (fonction pure).
 * Lancer :  node scripts/test.mjs lib/services/fec.test.ts
 *
 * On vérifie la conformité du format : 18 colonnes, dates AAAAMMJJ, montants
 * à la virgule, séparateur tabulation, et neutralisation des caractères qui
 * casseraient la structure.
 */
import { genererFec, nomFichierFec, EN_TETES_FEC } from "./fec.ts";
import type { Ecriture, LigneEcriture, Compte } from "../../types/database.ts";

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

const compte = (id: string, numero: string, libelle: string): Compte => ({
  id, entite_id: "e1", numero, libelle, classe: Number(numero[0]), active: true, cree_le: "2026-01-01T00:00:00Z",
});
const ecr = (id: string, over: Partial<Ecriture> = {}): Ecriture => ({
  id, entite_id: "e1", transaction_id: null, journal: "ACH",
  date_ecriture: "2026-07-07", libelle: "Achat", piece: "F-2026-001",
  cree_le: "2026-07-08T10:00:00Z", ...over,
});
const ligne = (ecritureId: string, compteId: string, debit: number, credit: number): LigneEcriture => ({
  id: Math.random().toString(), ecriture_id: ecritureId, entite_id: "e1",
  compte_id: compteId, debit_centimes: debit, credit_centimes: credit,
});

const comptes = new Map<string, Compte>([
  ["c606", compte("c606", "606", "Achats non stockés")],
  ["c512", compte("c512", "512", "Banque")],
]);

const e1 = ecr("e1");
const lignes = new Map<string, LigneEcriture[]>([
  ["e1", [ligne("e1", "c606", 10000, 0), ligne("e1", "c512", 0, 10000)]],
]);

const fec = genererFec([e1], lignes, comptes);
const rows = fec.trimEnd().split("\r\n");

ok("en-tête = 18 colonnes officielles", rows[0] === EN_TETES_FEC.join("\t"));
ok("18 colonnes par ligne de données", rows[1]!.split("\t").length === 18);
ok("2 lignes de données (une par ligne d'écriture)", rows.length === 3);

const c1 = rows[1]!.split("\t");
ok("JournalCode = ACH", c1[0] === "ACH");
ok("JournalLib résolu = Achats", c1[1] === "Achats");
ok("EcritureNum = 1", c1[2] === "1");
ok("EcritureDate AAAAMMJJ", c1[3] === "20260707");
ok("CompteNum = 606", c1[4] === "606");
ok("CompteLib = Achats non stockés", c1[5] === "Achats non stockés");
ok("PieceRef = F-2026-001", c1[8] === "F-2026-001");
ok("Debit = 100,00", c1[11] === "100,00");
ok("Credit = 0,00", c1[12] === "0,00");
ok("ValidDate = date de création AAAAMMJJ", c1[15] === "20260708");

// La 2e ligne : banque au crédit.
const c2 = rows[2]!.split("\t");
ok("2e ligne : même EcritureNum", c2[2] === "1");
ok("2e ligne : crédit 100,00", c2[12] === "100,00" && c2[11] === "0,00");

// --- neutralisation des caractères dangereux ---
const eTab = ecr("e2", { libelle: "Achat\tavec\ntab" });
const fecTab = genererFec([eTab], new Map([["e2", [ligne("e2", "c606", 100, 0), ligne("e2", "c512", 0, 100)]]]), comptes);
ok("tab/newline dans un libellé neutralisés", !fecTab.split("\r\n")[1]!.includes("Achat\tavec"));

// --- ordre déterministe (dates) ---
const eA = ecr("a", { date_ecriture: "2026-03-01" });
const eB = ecr("b", { date_ecriture: "2026-01-15" });
const lm = new Map([
  ["a", [ligne("a", "c606", 100, 0), ligne("a", "c512", 0, 100)]],
  ["b", [ligne("b", "c606", 200, 0), ligne("b", "c512", 0, 200)]],
]);
const fecOrdre = genererFec([eA, eB], lm, comptes).trimEnd().split("\r\n");
ok("écriture la plus ancienne = EcritureNum 1", fecOrdre[1]!.split("\t")[3] === "20260115");

// --- nom de fichier réglementaire ---
ok("nom FEC = SIREN+FEC+date", nomFichierFec("123456789", "2026-12-31") === "123456789FEC20261231.txt");
ok("SIREN non numérique nettoyé/complété", /^\d{9}FEC\d{8}\.txt$/.test(nomFichierFec("abc", "2026-12-31")));

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
