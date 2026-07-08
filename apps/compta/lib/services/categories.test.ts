/**
 * Tests unitaires du SERVICE CATÉGORIES (fonctions pures, sans base).
 *
 * Lancer depuis apps/compta :   node lib/services/categories.test.ts
 * (Node 22 exécute le TypeScript par "type stripping" ; les `import type`
 *  du service sont effacés au runtime, donc rien à compiler.)
 *
 * Matériau direct pour le plan de tests CDA (Bloc 3) : on prouve que la
 * validation métier refuse ce qui doit l'être AVANT tout accès base.
 */
import {
  nettoyerNom,
  preparerNouvelleCategorie,
  preparerRenommage,
  NOM_CATEGORIE_MAX,
} from "./categories.ts";

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

// ---- nettoyerNom -----------------------------------------------------------
ok("nettoyerNom enlève les espaces de bord", nettoyerNom("  Achats ") === "Achats");
ok(
  "nettoyerNom écrase les espaces internes multiples",
  nettoyerNom("Achats   matériel") === "Achats matériel",
);
ok("nettoyerNom sur chaîne vide donne vide", nettoyerNom("   ") === "");

// ---- preparerNouvelleCategorie : cas valides -------------------------------
const r1 = preparerNouvelleCategorie({ entiteId: "e1", nom: "Dons", type: "recette" });
ok("catégorie recette valide acceptée", r1.ok === true);
ok(
  "entite_id repris du contexte, pas du formulaire",
  r1.ok === true && r1.valeur.entite_id === "e1",
);
ok("nom nettoyé dans le DTO", (() => {
  const r = preparerNouvelleCategorie({ entiteId: "e1", nom: "  Frais  bancaires ", type: "depense" });
  return r.ok === true && r.valeur.nom === "Frais bancaires";
})());

// ---- preparerNouvelleCategorie : cas refusés -------------------------------
ok("nom vide refusé", preparerNouvelleCategorie({ entiteId: "e1", nom: "   ", type: "recette" }).ok === false);
ok(
  "nom trop long refusé",
  preparerNouvelleCategorie({ entiteId: "e1", nom: "x".repeat(NOM_CATEGORIE_MAX + 1), type: "recette" }).ok === false,
);
ok(
  "type invalide refusé",
  preparerNouvelleCategorie({ entiteId: "e1", nom: "Test", type: "investissement" }).ok === false,
);
ok("nom à la longueur max accepté", preparerNouvelleCategorie({ entiteId: "e1", nom: "x".repeat(NOM_CATEGORIE_MAX), type: "recette" }).ok === true);

// ---- preparerRenommage -----------------------------------------------------
ok("renommage valide accepté", preparerRenommage("Nouveau nom").ok === true);
ok("renommage vide refusé", preparerRenommage("  ").ok === false);

// ---- bilan -----------------------------------------------------------------
console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
