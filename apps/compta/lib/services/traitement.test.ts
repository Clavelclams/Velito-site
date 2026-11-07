/**
 * Tests unitaires du SERVICE « À TRAITER » (fonctions pures, sans base).
 * Lancer depuis apps/compta :   node scripts/test.mjs lib/services/traitement.test.ts
 */
import { lignesATraiter, preparerClassement, preparerConversionVirement } from "./traitement.ts";
import type { Transaction } from "@/types/database";

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
    id: "t1",
    entite_id: "e1",
    categorie_id: null,
    type: "depense",
    statut: "a_classer",
    date_transaction: "2023-08-01",
    libelle: "RETRAIT DAB",
    montant_ttc_centimes: 10000,
    montant_tva_centimes: 0,
    montant_ht_centimes: 10000,
    compte_tresorerie_id: "courant",
    virement_id: null,
    source_fichier: "releve.pdf",
    source_ref: null,
    source_cle: "releve-cm:x",
    commentaire: "Question à trancher.",
    cree_le: "",
    modifie_le: "",
    ...over,
  };
}
const catDep = { id: "c-dep", type: "depense" as const };
const catRec = { id: "c-rec", type: "recette" as const };

// --- liste -------------------------------------------------------------
const liste = lignesATraiter([
  tx({ id: "a", statut: "a_verifier", date_transaction: "2023-01-01" }),
  tx({ id: "b", statut: "validee" }),
  tx({ id: "c", statut: "a_classer", date_transaction: "2023-05-01" }),
  tx({ id: "d", statut: "a_classer", date_transaction: "2023-02-01" }),
  tx({ id: "e", statut: "a_classer", virement_id: "v" }),
]);
ok("validées et virements exclus", liste.length === 3);
ok("« À classer » d'abord, puis par date", liste.map((t) => t.id).join("") === "dca");

// --- classer / valider -------------------------------------------------
const c1 = preparerClassement(tx(), catDep, "classer");
ok("classer avec catégorie → À valider", c1.ok && c1.valeur.statut === "a_verifier" && c1.valeur.categorie_id === "c-dep");
const c2 = preparerClassement(tx({ categorie_id: "c-dep" }), null, "classer");
ok("retirer la catégorie → À classer", c2.ok && c2.valeur.statut === "a_classer" && c2.valeur.categorie_id === null);
const c3 = preparerClassement(tx(), catDep, "valider");
ok("valider avec catégorie → Validé", c3.ok && c3.valeur.statut === "validee");
ok("valider sans catégorie refusé", !preparerClassement(tx(), null, "valider").ok);
ok("catégorie recette sur une dépense refusée", !preparerClassement(tx(), catRec, "classer").ok);
ok("catégorie dépense sur une recette refusée", !preparerClassement(tx({ type: "recette" }), catDep, "classer").ok);
ok("un virement ne se classe pas", !preparerClassement(tx({ virement_id: "v" }), catDep, "classer").ok);
const c4 = preparerClassement(tx(), catDep, "classer");
ok("commentaire non fourni : conservé", c4.ok && c4.valeur.commentaire === "Question à trancher.");
const c5 = preparerClassement(tx(), catDep, "classer", "  Avance du président, à rembourser.  ");
ok("commentaire fourni : remplacé, nettoyé", c5.ok && c5.valeur.commentaire === "Avance du président, à rembourser.");
const c6 = preparerClassement(tx(), catDep, "classer", "   ");
ok("commentaire vidé → null", c6.ok && c6.valeur.commentaire === null);
ok("commentaire trop long refusé", !preparerClassement(tx(), catDep, "classer", "x".repeat(1001)).ok);

// --- virement interne -------------------------------------------------
const v = preparerConversionVirement(tx(), "caisse", "v1");
ok("dépense du courant → virement courant vers caisse", v.ok && v.valeur.contrepartie.type === "recette" && v.valeur.contrepartie.compte_tresorerie_id === "caisse");
if (v.ok) {
  ok("ligne d'origine : jambe validée, sans catégorie ni TVA", v.valeur.majOriginale.statut === "validee" && v.valeur.majOriginale.categorie_id === null && v.valeur.majOriginale.montant_tva_centimes === 0 && v.valeur.majOriginale.virement_id === "v1");
  ok("les deux jambes partagent l'identifiant", v.valeur.contrepartie.virement_id === "v1");
  ok("même date, même montant", v.valeur.contrepartie.date_transaction === "2023-08-01" && v.valeur.contrepartie.montant_ttc_centimes === 10000);
  ok("la contrepartie n'a pas de clé d'import (pas de doublon possible)", v.valeur.contrepartie.source_cle === undefined);
  ok("la conversion est tracée dans le commentaire", v.valeur.majOriginale.commentaire.includes("Question à trancher.") && v.valeur.majOriginale.commentaire.includes("virement interne"));
}
const vr = preparerConversionVirement(tx({ type: "recette" }), "caisse", "v2");
ok("recette sur le courant → la contrepartie sort de la caisse", vr.ok && vr.valeur.contrepartie.type === "depense");
ok("sans compte connu : refusé", !preparerConversionVirement(tx({ compte_tresorerie_id: null }), "caisse", "v").ok);
ok("même compte des deux côtés : refusé", !preparerConversionVirement(tx(), "courant", "v").ok);
ok("déjà un virement : refusé", !preparerConversionVirement(tx({ virement_id: "v0" }), "caisse", "v").ok);
ok("autre compte non choisi : refusé", !preparerConversionVirement(tx(), "", "v").ok);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
