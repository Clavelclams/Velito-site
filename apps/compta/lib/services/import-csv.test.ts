/**
 * Tests unitaires du SERVICE IMPORT CSV (fonctions pures).
 * Lancer :  node scripts/test.mjs lib/services/import-csv.test.ts
 *
 * Le parsing est la partie risquée : guillemets, dates, montants signés.
 */
import {
  decouperCsv,
  detecterSeparateur,
  parseDate,
  parseMontantSigne,
  construireLignesImport,
  type OptionsImport,
} from "./import-csv.ts";

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

// --- decouperCsv ---
ok("découpe simple", (() => {
  const m = decouperCsv("a;b;c\nd;e;f", ";");
  return m.length === 2 && m[0]!.length === 3 && m[1]![2] === "f";
})());
ok("guillemets protègent le séparateur", (() => {
  const m = decouperCsv('"a;b";c', ";");
  return m[0]!.length === 2 && m[0]![0] === "a;b";
})());
ok("guillemets doublés → un guillemet", (() => {
  const m = decouperCsv('"il a dit ""ok""";x', ";");
  return m[0]![0] === 'il a dit "ok"';
})());
ok("saut de ligne dans un champ quoté", (() => {
  const m = decouperCsv('"ligne1\nligne2";x', ";");
  return m.length === 1 && m[0]![0] === "ligne1\nligne2";
})());
ok("lignes vides ignorées", decouperCsv("a;b\n\n\nc;d", ";").length === 2);

// --- detecterSeparateur ---
ok("détecte ; ", detecterSeparateur("a;b;c") === ";");
ok("détecte , ", detecterSeparateur("a,b,c") === ",");

// --- parseDate ---
ok("JJ/MM/AAAA → ISO", parseDate("12/07/2026", "JJ/MM/AAAA") === "2026-07-12");
ok("jour/mois non paddés acceptés", parseDate("2/7/2026", "JJ/MM/AAAA") === "2026-07-02");
ok("AAAA-MM-JJ → ISO", parseDate("2026-07-12", "AAAA-MM-JJ") === "2026-07-12");
ok("date inexistante refusée", parseDate("31/02/2026", "JJ/MM/AAAA") === null);
ok("format cassé refusé", parseDate("juillet", "JJ/MM/AAAA") === null);

// --- parseMontantSigne ---
ok("négatif → dépense", (() => {
  const r = parseMontantSigne("-45,00");
  return r?.type === "depense" && r.centimes === 4500;
})());
ok("positif → recette", (() => {
  const r = parseMontantSigne("1 234,56");
  return r?.type === "recette" && r.centimes === 123456;
})());
ok("zéro refusé", parseMontantSigne("0") === null);
ok("vide refusé", parseMontantSigne("") === null);

// --- construireLignesImport ---
const options: OptionsImport = {
  separateur: ";",
  aEntete: true,
  formatDate: "JJ/MM/AAAA",
  colonneDate: 0,
  colonneLibelle: 1,
  colonneMontant: 2,
};
const matrice = [
  ["Date", "Libellé", "Montant"], // en-tête, ignoré
  ["03/07/2026", "Subvention CAF", "500,00"],
  ["10/07/2026", "Achat Leclerc", "-45,90"],
  ["xx/07/2026", "Ligne cassée", "-10,00"], // date invalide
  ["12/07/2026", "", "-5,00"], // libellé vide
];
const lignes = construireLignesImport(matrice, options, "e1");
ok("en-tête ignoré → 4 lignes de données", lignes.length === 4);
ok("recette bien typée", lignes[0]!.ok && lignes[0]!.saisie!.type === "recette");
ok("montant recette converti en '500,00'", lignes[0]!.saisie!.montantTtc === "500,00");
ok("dépense bien typée", lignes[1]!.ok && lignes[1]!.saisie!.type === "depense");
ok("date ISO dans la saisie", lignes[1]!.saisie!.dateTransaction === "2026-07-10");
ok("ligne date invalide → erreur", !lignes[2]!.ok && lignes[2]!.erreur!.includes("Date"));
ok("ligne libellé vide → erreur", !lignes[3]!.ok && lignes[3]!.erreur!.includes("Libellé"));
ok("catégorie null (à catégoriser après)", lignes[0]!.saisie!.categorieId === null);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
