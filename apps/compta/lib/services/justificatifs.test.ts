/**
 * Tests unitaires du SERVICE JUSTIFICATIFS (fonctions pures).
 * Lancer :  node scripts/test.mjs lib/services/justificatifs.test.ts
 */
import {
  estTypeMimeAutorise,
  estTailleValide,
  assainirNomFichier,
  construireCheminStockage,
  validerFichier,
  transactionsSansJustificatif,
  TAILLE_MAX_OCTETS,
} from "./justificatifs.ts";
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

// --- type MIME ---
ok("jpeg autorisé", estTypeMimeAutorise("image/jpeg"));
ok("pdf autorisé", estTypeMimeAutorise("application/pdf"));
ok("exe refusé", !estTypeMimeAutorise("application/x-msdownload"));
ok("svg refusé (peut contenir du script)", !estTypeMimeAutorise("image/svg+xml"));

// --- taille ---
ok("taille normale ok", estTailleValide(2_000_000));
ok("taille 0 refusée", !estTailleValide(0));
ok("au-delà du max refusé", !estTailleValide(TAILLE_MAX_OCTETS + 1));

// --- assainirNomFichier ---
ok("accents retirés", assainirNomFichier("reçu café.jpg") === "recu_cafe.jpg");
ok("traversal neutralisé", !assainirNomFichier("../../etc/passwd").includes("../"));
ok("point de tête retiré", !assainirNomFichier("...secret").startsWith("."));
ok("nom vide → fallback", assainirNomFichier("***") === "fichier");

// --- construireCheminStockage ---
const chemin = construireCheminStockage("ent-1", "tx-9", "Ticket Leclerc.pdf");
ok("chemin commence par l'entité", chemin.startsWith("ent-1/tx-9/"));
ok("chemin contient le nom assaini", chemin.includes("Ticket_Leclerc.pdf"));

// --- validerFichier ---
ok("fichier valide accepté", validerFichier({ type: "image/png", taille: 1000 }).ok === true);
ok("mauvais type rejeté", validerFichier({ type: "text/html", taille: 1000 }).ok === false);
ok("trop gros rejeté", validerFichier({ type: "image/png", taille: TAILLE_MAX_OCTETS + 1 }).ok === false);

// --- transactionsSansJustificatif ---
function tx(id: string): Transaction {
  return {
    id, entite_id: "e1", categorie_id: null, type: "depense", statut: "validee",
    date_transaction: "2026-07-07", libelle: "x", montant_ttc_centimes: 100,
    montant_tva_centimes: 0, montant_ht_centimes: 100,
    cree_le: "2026-07-07T00:00:00Z", modifie_le: "2026-07-07T00:00:00Z",
  };
}
const txs = [tx("a"), tx("b"), tx("c")];
const avec = new Set(["b"]);
const sans = transactionsSansJustificatif(txs, avec);
ok("2 transactions sans justificatif", sans.length === 2);
ok("celle avec pièce est exclue", !sans.some((t) => t.id === "b"));
ok("aucune pièce → toutes manquantes", transactionsSansJustificatif(txs, new Set()).length === 3);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
