/**
 * Tests unitaires du SERVICE EXPORT (fonctions pures).
 * Lancer :  node scripts/test.mjs lib/services/export.test.ts
 *
 * L'échappement CSV est le point critique : un libellé avec « ; » ou un
 * guillemet ne doit jamais casser les colonnes du fichier remis au comptable.
 */
import {
  filtrerParPeriode,
  transactionVersLigne,
  echapperChampCsv,
  genererCsv,
  nomFichierExport,
  EN_TETES_EXPORT,
} from "./export.ts";
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

function tx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: Math.random().toString(),
    entite_id: "e1",
    categorie_id: null,
    type: "depense",
    statut: "validee",
    date_transaction: "2026-07-07",
    libelle: "Achat",
    montant_ttc_centimes: 1250,
    montant_tva_centimes: 250,
    montant_ht_centimes: 1000,
    cree_le: "2026-07-07T00:00:00Z",
    modifie_le: "2026-07-07T00:00:00Z",
    ...over,
  };
}

// --- échappement CSV ---
ok("champ simple non modifié", echapperChampCsv("Achat") === "Achat");
ok("champ avec ; est entouré de guillemets", echapperChampCsv("a;b") === '"a;b"');
ok('guillemets internes doublés', echapperChampCsv('il a dit "ok"') === '"il a dit ""ok"""');
ok("champ avec saut de ligne échappé", echapperChampCsv("a\nb") === '"a\nb"');

// --- transactionVersLigne ---
const noms = { "c1": "Matériel" };
const ligne = transactionVersLigne(tx({ categorie_id: "c1", type: "recette" }), noms);
ok("date au format FR", ligne[0] === "07/07/2026");
ok("type lisible", ligne[1] === "Recette");
ok("catégorie résolue", ligne[2] === "Matériel");
ok("TTC en euros virgule", ligne[4] === "12,50");
ok("TVA en euros virgule", ligne[5] === "2,50");
ok("HT en euros virgule", ligne[6] === "10,00");

// --- filtrerParPeriode ---
const jeu = [
  tx({ date_transaction: "2026-06-15" }),
  tx({ date_transaction: "2026-07-01" }),
  tx({ date_transaction: "2026-07-31" }),
  tx({ date_transaction: "2026-08-02" }),
];
ok("période juillet (bornes incluses) → 2", filtrerParPeriode(jeu, "2026-07-01", "2026-07-31").length === 2);
ok("sans borne début → tout jusqu'à fin", filtrerParPeriode(jeu, undefined, "2026-07-01").length === 2);
ok("sans borne → tout", filtrerParPeriode(jeu).length === 4);

// --- genererCsv ---
const csv = genererCsv([tx({ libelle: "Loyer; charges" })], {});
const lignes = csv.trimEnd().split("\r\n");
ok("1re ligne = en-têtes", lignes[0] === EN_TETES_EXPORT.join(";"));
ok("libellé avec ; correctement échappé dans le CSV", lignes[1]!.includes('"Loyer; charges"'));
ok("CSV se termine par un CRLF", csv.endsWith("\r\n"));

// --- nomFichierExport ---
ok("nom de fichier assaini (accents/espaces)", /^compta_VEA_\d{4}-\d{2}-\d{2}\.csv$/.test(nomFichierExport("VÉA")));

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
