/**
 * Tests unitaires du SERVICE DEVIS ET FACTURES (fonctions pures, sans base).
 * Lancer depuis apps/compta :   node scripts/test.mjs lib/services/facturation.test.ts
 */
import {
  ajouterJours,
  avoirsParFacture,
  calculerTotaux,
  candidatesEncaissement,
  categorieVentes,
  centimesVersDecimal,
  controlerEmission,
  controlerTransitionDevis,
  copierLignes,
  derniereDateEmise,
  donneesStructurees,
  encaissementsParFacture,
  factureDepuisDevis,
  filtrerDevis,
  filtrerFactures,
  formaterQuantite,
  formaterTaux,
  genererCsvFactures,
  mentionsManquantes,
  milliemesVersTexte,
  montantLigneHt,
  preparerAvoirTotal,
  preparerClient,
  preparerCorrection,
  preparerDevis,
  preparerEncaissement,
  preparerFacture,
  preparerLigne,
  preparerParametres,
  quantiteVersMilliemes,
  resteAEncaisser,
  statutDevis,
  statutFacture,
  suggestionMentionTva,
  tauxVersCentiemes,
  tvaSurBase,
  MENTION_TVA_FRANCHISE,
  TRANSITIONS_DEVIS,
} from "./facturation.ts";
import type { Facture, LigneDocument, ParametresFacturation } from "@/types/facturation";

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
const egal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const E = "e1";
const ligne = (ht: number, taux: number, extra: Partial<LigneDocument> = {}): LigneDocument => ({
  id: `l${ht}-${taux}-${Math.random()}`,
  entite_id: E,
  position: 0,
  designation: "Prestation",
  quantite: "1.000",
  unite: null,
  prix_unitaire_ht_centimes: ht,
  taux_tva_centiemes: taux,
  montant_ht_centimes: ht,
  cree_le: "",
  modifie_le: "",
  ...extra,
});

// ---------- Saisie des nombres ----------
console.log("\n== Quantités et taux ==");
ok("quantité « 1,5 » = 1500 millièmes", quantiteVersMilliemes("1,5") === 1500);
ok("quantité « 0.333 » = 333", quantiteVersMilliemes("0.333") === 333);
ok("quantité « 12 » = 12000", quantiteVersMilliemes("12") === 12000);
ok("quantité à 4 décimales refusée", quantiteVersMilliemes("1,2345") === null);
ok("quantité nulle refusée", quantiteVersMilliemes("0") === null);
ok("quantité négative refusée", quantiteVersMilliemes("-1") === null);
ok("millièmes → texte base « 1.500 »", milliemesVersTexte(1500) === "1.500");
ok("affichage « 1,5 » et « 12 »", formaterQuantite(1500) === "1,5" && formaterQuantite(12000) === "12");
ok("taux « 20 » = 2000, « 5,5 » = 550, « 2.1 » = 210, « 0 » = 0",
  tauxVersCentiemes("20") === 2000 && tauxVersCentiemes("5,5") === 550 && tauxVersCentiemes("2.1") === 210 && tauxVersCentiemes("0") === 0);
ok("taux > 100 % refusé", tauxVersCentiemes("120") === null);
ok("affichage des taux « 20 % » et « 5,5 % »", formaterTaux(2000) === "20 %" && formaterTaux(550) === "5,5 %");

// ---------- Calculs ----------
console.log("\n== Montants et totaux ==");
ok("1,5 × 100,00 € = 150,00 €", montantLigneHt(1500, 10000) === 15000);
ok("0,333 × 1,00 € = 0,33 € (arrondi au centime)", montantLigneHt(333, 100) === 33);
ok("0,005 × 1,00 € = 0,01 € (demi vers le haut, comme round() de Postgres)", montantLigneHt(5, 100) === 1);
ok("grand produit sans perte (BigInt)", montantLigneHt(999_999_999_999, 100_000) === 99_999_999_999_900);
ok("TVA 20 % de 9,99 € = 2,00 € (1,998 arrondi)", tvaSurBase(999, 2000) === 200);
ok("TVA 5,5 % de 20,00 € = 1,10 €", tvaSurBase(2000, 550) === 110);
{
  // Trois lignes à 3,33 € à 20 % : TVA par taux = 2,00 € ; ligne par ligne = 2,01 €.
  const t = calculerTotaux([ligne(333, 2000), ligne(333, 2000), ligne(333, 2000), ligne(2000, 550)]);
  ok("totaux par taux : HT 29,99 €", t.totalHtCentimes === 2999);
  ok("TVA arrondie UNE fois par taux : 2,00 € + 1,10 € = 3,10 € (et non 3,11 €)", t.totalTvaCentimes === 310);
  ok("TTC = HT + TVA = 33,09 €", t.totalTtcCentimes === 3309);
  ok("détail par taux, du plus fort au plus faible", egal(t.parTaux.map((x) => [x.tauxCentiemes, x.baseHtCentimes, x.tvaCentimes]), [[2000, 999, 200], [550, 2000, 110]]));
}
ok("franchise : tout à 0 %, TVA nulle", calculerTotaux([ligne(50000, 0)]).totalTvaCentimes === 0);
ok("aucune ligne : totaux à 0", calculerTotaux([]).totalTtcCentimes === 0);

// ---------- Paramètres et clients ----------
console.log("\n== Paramètres vendeur et clients ==");
const saisieParam = {
  denomination: "VENA",
  formeJuridique: "SASU",
  capitalSocial: "500",
  adresse: "  1 rue de Test \n\n 80000 Amiens ",
  siren: "123 456 789",
  siret: "123 456 789 00012",
  villeRcs: "Amiens",
  numeroTvaIntra: "",
  regimeTva: "franchise_base",
  mentionTva: MENTION_TVA_FRANCHISE,
  conditionsPaiement: "Paiement à 30 jours",
  penalitesRetard: "Texte saisi par la structure",
  indemniteRecouvrement: "Texte saisi par la structure",
  iban: "FR76 3000 6000 0112 3456 7890 189",
  email: "contact@velito.fr",
};
{
  const r = preparerParametres(E, saisieParam);
  ok("paramètres : SIREN, SIRET et IBAN nettoyés, capital en centimes", r.ok && r.valeur.siren === "123456789" && r.valeur.siret === "12345678900012" && r.valeur.capital_social_centimes === 50000 && r.valeur.iban === "FR7630006000011234567890189");
  ok("paramètres : adresse multiligne nettoyée", r.ok && r.valeur.adresse === "1 rue de Test\n80000 Amiens");
  ok("paramètres : champ vide = NULL, jamais inventé", r.ok && r.valeur.numero_tva_intra === null);
}
ok("SIRET qui ne commence pas par le SIREN refusé", !preparerParametres(E, { ...saisieParam, siret: "99999999900012" }).ok);
ok("SIREN de 8 chiffres refusé", !preparerParametres(E, { ...saisieParam, siren: "12345678", siret: "" }).ok);
ok("capital vide = NULL (inconnu)", (() => { const r = preparerParametres(E, { ...saisieParam, capitalSocial: "" }); return r.ok && r.valeur.capital_social_centimes === null; })());
ok("suggestion de mention : franchise seulement, rien d'inventé ailleurs",
  suggestionMentionTva("franchise_base") === MENTION_TVA_FRANCHISE && suggestionMentionTva("assujetti") === null && suggestionMentionTva("non_assujetti") === null);
{
  const r = preparerClient(E, { typeClient: "professionnel", nom: " Client  Pro ", siren: "987654321", numeroTvaIntra: "", adresseFacturation: "2 av. Paris", adresseLivraison: "2 av. Paris", email: "", commentaire: "" });
  ok("client : nom nettoyé, livraison identique ramenée à NULL", r.ok && r.valeur.nom === "Client Pro" && r.valeur.adresse_livraison === null);
}
ok("client sans type refusé", !preparerClient(E, { typeClient: "", nom: "X", siren: "", numeroTvaIntra: "", adresseFacturation: "", adresseLivraison: "", email: "", commentaire: "" }).ok);

// ---------- Lignes ----------
console.log("\n== Lignes ==");
{
  const r = preparerLigne(E, { designation: "Développement", quantite: "2,5", unite: "jour", prixUnitaire: "400", taux: "20" }, "assujetti", 3);
  ok("ligne : 2,5 jours × 400 € = 1 000 € HT, quantité envoyée en texte", r.ok && r.valeur.montant_ht_centimes === 100000 && r.valeur.quantite === "2.500" && r.valeur.position === 3);
}
ok("franchise : un taux de 20 % est refusé", !preparerLigne(E, { designation: "x", quantite: "1", unite: "", prixUnitaire: "10", taux: "20" }, "franchise_base", 0).ok);
ok("franchise : taux 0 accepté", preparerLigne(E, { designation: "x", quantite: "1", unite: "", prixUnitaire: "10", taux: "0" }, "franchise_base", 0).ok);
ok("prix unitaire vide refusé (jamais 0 par défaut)", !preparerLigne(E, { designation: "x", quantite: "1", unite: "", prixUnitaire: "", taux: "0" }, null, 0).ok);
ok("copie de lignes : positions renumérotées, montants identiques", (() => {
  const c = copierLignes([ligne(100, 0, { position: 5 }), ligne(200, 0, { position: 2 })]);
  return egal(c.map((x) => [x.position, x.montant_ht_centimes, x.quantite]), [[0, 200, "1.000"], [1, 100, "1.000"]]);
})());

// ---------- Devis ----------
console.log("\n== Devis ==");
const clients = [{ id: "c1" }];
ok("devis : durée de 30 jours → fin au 31/03", (() => {
  const r = preparerDevis(E, { clientId: "c1", objet: "", date: "2026-03-01", dateFin: "", dureeJours: "30", notes: "" }, clients);
  return r.ok && r.valeur.date_fin_validite === "2026-03-31";
})());
ok("devis : date de fin saisie prioritaire", (() => {
  const r = preparerDevis(E, { clientId: "c1", objet: "", date: "2026-03-01", dateFin: "2026-04-15", dureeJours: "30", notes: "" }, clients);
  return r.ok && r.valeur.date_fin_validite === "2026-04-15";
})());
ok("devis sans durée ni date de fin refusé", !preparerDevis(E, { clientId: "c1", objet: "", date: "2026-03-01", dateFin: "", dureeJours: "", notes: "" }, clients).ok);
ok("devis d'un client d'une autre structure refusé", !preparerDevis(E, { clientId: "autre", objet: "", date: "2026-03-01", dateFin: "", dureeJours: "30", notes: "" }, clients).ok);
ok("ajouterJours franchit les mois", ajouterJours("2026-01-31", 1) === "2026-02-01");
const dv = { statut: "envoye" as const, date_devis: "2026-03-01", date_fin_validite: "2026-03-31" };
ok("envoyé, fin dépassée : « expiré » (calculé)", statutDevis(dv, "2026-04-01") === "expire");
ok("envoyé, encore valide : « envoyé »", statutDevis(dv, "2026-03-31") === "envoye");
ok("accepté reste accepté après la fin", statutDevis({ ...dv, statut: "accepte" }, "2027-01-01") === "accepte");
ok("transitions : accepté et refusé sont finaux", TRANSITIONS_DEVIS.accepte.length === 0 && TRANSITIONS_DEVIS.refuse.length === 0);
ok("brouillon → accepté refusé", controlerTransitionDevis({ ...dv, statut: "brouillon" }, "accepte", 1, "2026-03-05", "2026-03-05") !== null);
ok("envoi sans ligne refusé", controlerTransitionDevis({ ...dv, statut: "brouillon" }, "envoye", 0, "2026-03-05") !== null);
ok("acceptation sans date refusée", controlerTransitionDevis(dv, "accepte", 1, "2026-03-05") !== null);
ok("acceptation datée après la fin de validité refusée", controlerTransitionDevis(dv, "accepte", 1, "2026-04-10", "2026-04-02") !== null);
ok("acceptation dans le futur refusée", controlerTransitionDevis(dv, "accepte", 1, "2026-03-05", "2026-03-06") !== null);
ok("acceptation valide", controlerTransitionDevis(dv, "accepte", 1, "2026-03-05", "2026-03-05") === null);
{
  const d = { entite_id: E, numero: "DEV-2026-001", client_id: "c1", objet: "Site", statut: "accepte" as const, facture_id: null };
  const r = factureDepuisDevis(d, [ligne(100, 0), ligne(200, 0)]);
  ok("devis accepté → brouillon de facture : lignes copiées, aucune date d'émission",
    r.ok && r.valeur.facture.sens === "facture" && r.valeur.facture.date_emission === null && r.valeur.lignes.length === 2);
  ok("devis déjà transformé : refus", !factureDepuisDevis({ ...d, facture_id: "f1" }, [ligne(100, 0)]).ok);
  ok("devis envoyé : refus (accepté seulement)", !factureDepuisDevis({ ...d, statut: "envoye" }, [ligne(100, 0)]).ok);
}

// ---------- Mentions et émission ----------
console.log("\n== Mentions obligatoires et émission ==");
const vendeur = (() => {
  const r = preparerParametres(E, saisieParam);
  if (!r.ok) throw new Error("jeu de test");
  return r.valeur as ParametresFacturation;
})();
const acheteurPro = { type_client: "professionnel" as const, nom: "Client Pro", siren: "987654321", adresse_facturation: "2 av. Paris" };
const brouillon = {
  statut: "brouillon" as const,
  sens: "facture" as const,
  date_emission: "2026-03-10",
  date_prestation: "2026-03-01",
  date_echeance: "2026-04-09",
  nature_operation: "services" as const,
};
ok("facture complète : aucune mention bloquante manquante", controlerEmission(brouillon, [ligne(100, 0)], vendeur, acheteurPro, "societe", "2026-03-10", null).length === 0);
ok("client professionnel sans SIREN : émission refusée",
  controlerEmission(brouillon, [ligne(100, 0)], vendeur, { ...acheteurPro, siren: null }, "societe", "2026-03-10", null).some((e) => e.includes("SIREN du client")));
ok("client particulier sans SIREN : accepté", controlerEmission(brouillon, [ligne(100, 0)], vendeur, { ...acheteurPro, type_client: "particulier", siren: null }, "societe", "2026-03-10", null).length === 0);
ok("société sans capital ni RCS : refus ; association : pas exigés", (() => {
  const v = { ...vendeur, capital_social_centimes: null, ville_rcs: null };
  return controlerEmission(brouillon, [ligne(100, 0)], v, acheteurPro, "societe", "2026-03-10", null).length === 2 &&
    controlerEmission(brouillon, [ligne(100, 0)], v, acheteurPro, "association", "2026-03-10", null).length === 0;
})());
ok("franchise sans mention de TVA : refus", controlerEmission(brouillon, [ligne(100, 0)], { ...vendeur, mention_tva: null }, acheteurPro, "societe", "2026-03-10", null).length === 1);
ok("franchise avec une ligne à 20 % : refus", controlerEmission(brouillon, [ligne(100, 2000)], vendeur, acheteurPro, "societe", "2026-03-10", null).some((e) => e.includes("Taux de TVA à 0")));
ok("sans date de prestation, nature ni échéance : trois refus", controlerEmission({ ...brouillon, date_prestation: null, nature_operation: null, date_echeance: null }, [ligne(100, 0)], vendeur, acheteurPro, "societe", "2026-03-10", null).length === 3);
ok("avoir : l'échéance n'est pas exigée", controlerEmission({ ...brouillon, sens: "avoir", date_echeance: null }, [ligne(100, 0)], vendeur, acheteurPro, "societe", "2026-03-10", null).length === 0);
ok("sans paramètres vendeur : refus", controlerEmission(brouillon, [ligne(100, 0)], null, acheteurPro, "societe", "2026-03-10", null).length > 0);
ok("date d'émission dans le futur : refus", controlerEmission(brouillon, [ligne(100, 0)], vendeur, acheteurPro, "societe", "2026-03-09", null).length === 1);
ok("chronologie : date antérieure à la dernière émise refusée", controlerEmission(brouillon, [ligne(100, 0)], vendeur, acheteurPro, "societe", "2026-03-10", "2026-03-11").length === 1);
ok("SIRET manquant : signalé mais non bloquant", (() => {
  const m = mentionsManquantes({ type: "facture", ...brouillon }, [ligne(100, 0)], { ...vendeur, siret: null }, acheteurPro, "societe");
  return m.length === 1 && m[0]!.bloquante === false;
})());
ok("devis : pas d'exigence de dates de facture", mentionsManquantes({ type: "devis" }, [ligne(100, 0)], vendeur, acheteurPro, "societe").length === 0);

// ---------- Statuts calculés ----------
console.log("\n== Statuts calculés et reste à encaisser ==");
const emise = { statut: "emise" as const, sens: "facture" as const, total_ttc_centimes: 100000 };
ok("brouillon", statutFacture({ ...emise, statut: "brouillon" }, 0, 0) === "brouillon");
ok("émise sans encaissement", statutFacture(emise, 0, 0) === "emise");
ok("payée partiellement", statutFacture(emise, 40000, 0) === "payee_partiellement");
ok("payée (somme = TTC)", statutFacture(emise, 100000, 0) === "payee");
ok("annulée par avoir total", statutFacture(emise, 0, 100000) === "annulee");
ok("avoir partiel + encaissement du reste : payée", statutFacture(emise, 70000, 30000) === "payee");
ok("reste à encaisser = TTC − avoirs − encaissements", resteAEncaisser(emise, 40000, 10000) === 50000);
ok("reste d'un brouillon = 0 (une facture n'est pas une créance avant émission)", resteAEncaisser({ ...emise, statut: "brouillon" }, 0, 0) === 0);
ok("sommes par facture en une passe", egal([...encaissementsParFacture([{ facture_id: "a", montant_centimes: 1 }, { facture_id: "a", montant_centimes: 2 }])], [["a", 3]]));
ok("avoirs émis seulement", egal([...avoirsParFacture([
  { sens: "avoir", statut: "emise", facture_origine_id: "f", total_ttc_centimes: 10 },
  { sens: "avoir", statut: "brouillon", facture_origine_id: "f", total_ttc_centimes: 99 },
])], [["f", 10]]));

// ---------- Avoir et correction ----------
console.log("\n== Avoir et correction ==");
const fEmise = {
  id: "f1", entite_id: E, sens: "facture" as const, statut: "emise" as const, numero: "FAC-2026-0001", client_id: "c1",
  date_prestation: "2026-03-01", date_echeance: "2026-04-09", nature_operation: "services" as const, objet: "Site", notes: null, tva_sur_debits: false,
  total_ttc_centimes: 400,
};
const aucun = { brouillonEnCours: false, dejaAvoirCentimes: 0 };
{
  const r = preparerAvoirTotal(fEmise, [ligne(333, 2000)], aucun);
  ok("avoir total : sens avoir, origine, montants positifs copiés", r.ok && r.valeur.avoir.sens === "avoir" && r.valeur.avoir.facture_origine_id === "f1" && r.valeur.lignes[0]!.montant_ht_centimes === 333);
  ok("avoir refusé sur un brouillon", !preparerAvoirTotal({ ...fEmise, statut: "brouillon" }, [ligne(1, 0)], aucun).ok);
  ok("avoir refusé si un brouillon d'avoir est en cours", !preparerAvoirTotal(fEmise, [ligne(1, 0)], { brouillonEnCours: true, dejaAvoirCentimes: 0 }).ok);
  ok("avoir refusé si la facture est déjà entièrement annulée", !preparerAvoirTotal(fEmise, [ligne(1, 0)], { brouillonEnCours: false, dejaAvoirCentimes: 400 }).ok);
  ok("second avoir partiel possible : brouillon à ajuster", (() => { const x = preparerAvoirTotal(fEmise, [ligne(1, 0)], { brouillonEnCours: false, dejaAvoirCentimes: 100 }); return x.ok && (x.valeur.avoir.notes ?? "").includes("ajuste"); })());
  ok("correction refusée si un avoir existe déjà", !preparerCorrection(fEmise, [ligne(1, 0)], { brouillonEnCours: false, dejaAvoirCentimes: 100 }).ok);
  const c = preparerCorrection(fEmise, [ligne(333, 2000)], aucun);
  ok("correction : un avoir ET un brouillon lié à l'original (correction_de)", c.ok && c.valeur.avoir.sens === "avoir" && c.valeur.brouillon.sens === "facture" && c.valeur.brouillon.correction_de === "f1" && c.valeur.brouillon.date_emission === null);
}

// ---------- Encaissements ----------
console.log("\n== Encaissements ==");
const fx = { id: "f1", entite_id: E, sens: "facture" as const, statut: "emise" as const, total_ttc_centimes: 100000, numero: "FAC-2026-0001" };
const tx = { id: "t1", entite_id: E, type: "recette" as const, virement_id: null, montant_ttc_centimes: 80000, date_transaction: "2026-04-01" };
ok("montant vide : le plus petit des deux restes (800 €)", (() => { const r = preparerEncaissement(fx, tx, "", 0, 0); return r.ok && r.valeur.montant_centimes === 80000; })());
ok("partiel de 400 € accepté", preparerEncaissement(fx, tx, "400", 0, 0).ok);
ok("dépassement du TTC refusé", !preparerEncaissement(fx, tx, "700", 400_00, 0).ok);
ok("dépassement de l'opération refusé", !preparerEncaissement(fx, tx, "500", 0, 400_00).ok);
ok("une dépense est refusée", !preparerEncaissement(fx, { ...tx, type: "depense" }, "1", 0, 0).ok);
ok("un virement interne est refusé", !preparerEncaissement(fx, { ...tx, virement_id: "v" }, "1", 0, 0).ok);
ok("un brouillon n'est pas encaissé", !preparerEncaissement({ ...fx, statut: "brouillon" }, tx, "1", 0, 0).ok);
ok("un avoir n'est pas encaissé", !preparerEncaissement({ ...fx, sens: "avoir" }, tx, "1", 0, 0).ok);
ok("candidates : recettes avec un reste, celle du bon montant d'abord", (() => {
  const c = candidatesEncaissement(
    [tx, { ...tx, id: "t2", montant_ttc_centimes: 50000, date_transaction: "2026-03-01" }, { ...tx, id: "t3", type: "depense" as const }],
    new Map([["t1", 80000]]),
    50000,
  );
  return egal(c.map((x) => x.id), ["t2"]);
})());
ok("catégorie « Ventes et prestations » proposée si elle existe (recette active)",
  categorieVentes([{ id: "k", nom: "Ventes et  prestations", type: "recette", active: true }]) === "k" &&
    categorieVentes([{ id: "k", nom: "Ventes et prestations", type: "depense", active: true }]) === null);

// ---------- Listes ----------
console.log("\n== Listes et filtres ==");
ok("filtre devis par statut calculé « expiré »", filtrerDevis([{ ...dv, client_id: "c1" }], { statut: "expire" }, "2026-05-01").length === 1);
ok("filtre devis par client", filtrerDevis([{ ...dv, client_id: "c1" }], { clientId: "c2" }, "2026-03-05").length === 0);
ok("filtre factures par exercice (brouillon : date de création)", filtrerFactures(
  [{ date_emission: null, cree_le: "2025-12-31T10:00:00Z", client_id: "c1", statutAffiche: "brouillon" as const }], { exercice: "2025" }).length === 1);
ok("dernière date émise par série", derniereDateEmise([
  { sens: "facture", statut: "emise", date_emission: "2026-03-01" },
  { sens: "facture", statut: "brouillon", date_emission: "2026-12-01" },
  { sens: "avoir", statut: "emise", date_emission: "2026-06-01" },
], "facture") === "2026-03-01");

// ---------- Données structurées ----------
console.log("\n== Données structurées (EN 16931) ==");
{
  const lignes = [ligne(333, 2000, { position: 1, designation: "B" }), ligne(333, 2000, { position: 0, designation: "A", quantite: 1.5 as unknown as string })];
  const f: Pick<Facture, "numero" | "sens" | "statut" | "date_emission" | "date_echeance" | "date_prestation" | "nature_operation" | "tva_sur_debits" | "objet" | "notes" | "total_ht_centimes" | "total_tva_centimes" | "total_ttc_centimes" | "vendeur" | "acheteur"> = {
    numero: "FAC-2026-0001", sens: "facture", statut: "emise", date_emission: "2026-03-10", date_echeance: "2026-04-09",
    date_prestation: "2026-03-01", nature_operation: "services", tva_sur_debits: false, objet: "Site", notes: null,
    total_ht_centimes: 666, total_tva_centimes: 133, total_ttc_centimes: 799,
    vendeur: (({ entite_id: _e, cree_le: _c, modifie_le: _m, ...v }) => v)(vendeur),
    acheteur: { id: "c1", type_client: "professionnel", nom: "Client Pro", siren: "987654321", numero_tva_intra: null, adresse_facturation: "2 av. Paris", adresse_livraison: "Entrepôt", email: null },
  };
  const r = donneesStructurees(f, lignes, null, 300);
  ok("JSON produit pour une facture émise", r.ok);
  if (r.ok) {
    const d = r.valeur;
    ok("type de document 380, devise EUR", d.facture.type_document === "380" && d.facture.devise === "EUR");
    ok("vendeur et acheteur depuis les instantanés (SIREN)", d.vendeur.siren === "123456789" && d.acheteur.siren === "987654321");
    ok("montants en décimal texte, sans flottant", d.totaux.total_ttc === "7.99" && d.totaux.montant_a_payer === "4.99" && d.totaux.deja_paye === "3.00");
    ok("lignes dans l'ordre, quantité « 1.500 »", d.lignes[0]!.designation === "A" && d.lignes[0]!.quantite === "1.500" && d.lignes[1]!.numero === 2);
    ok("TVA par taux : base 6,66 €, TVA 1,33 €, catégorie S", egal(d.tva, [{ taux: "20.00", base_ht: "6.66", montant: "1.33", code_categorie: "S", motif_exoneration: null }]));
    ok("adresse de livraison présente car différente", d.livraison?.adresse === "Entrepôt");
    ok("JSON sérialisable (aller-retour identique)", egal(JSON.parse(JSON.stringify(d)), d));
  }
  ok("avoir : type 381 et référence à la facture d'origine", (() => {
    const a = donneesStructurees({ ...f, sens: "avoir", numero: "AV-2026-0001" }, lignes, { numero: "FAC-2026-0001", date_emission: "2026-03-10" }, 0);
    return a.ok && a.valeur.facture.type_document === "381" && a.valeur.facture.reference_facture_precedente?.numero === "FAC-2026-0001";
  })());
  ok("taux 0 : pas de code de catégorie deviné, motif = mention saisie", (() => {
    const z = donneesStructurees({ ...f, total_ht_centimes: 100, total_tva_centimes: 0, total_ttc_centimes: 100 }, [ligne(100, 0)], null, 0);
    return z.ok && z.valeur.tva[0]!.code_categorie === null && z.valeur.tva[0]!.motif_exoneration === MENTION_TVA_FRANCHISE;
  })());
  ok("brouillon : pas de données structurées", !donneesStructurees({ ...f, statut: "brouillon", numero: null }, lignes, null, 0).ok);
}
ok("centimes → décimal : 5 → « 0.05 », 123456 → « 1234.56 »", centimesVersDecimal(5) === "0.05" && centimesVersDecimal(123456) === "1234.56");

// ---------- CSV ----------
console.log("\n== CSV ==");
{
  const csv = genererCsvFactures([{ numero: "FAC-2026-0001", sens: "facture", dateEmission: "2026-03-10", client: "Client; Pro", statut: "payee_partiellement", htCentimes: 100000, tvaCentimes: 0, ttcCentimes: 100000, encaisseCentimes: 40000, resteCentimes: 60000, echeance: null }]);
  const l = csv.split("\r\n");
  ok("CSV : en-tête, séparateur « ; », CRLF final", l[0]!.startsWith("Numéro;Type;") && csv.endsWith("\r\n"));
  ok("CSV : champ avec « ; » échappé, montants à la virgule", l[1] === 'FAC-2026-0001;Facture;10/03/2026;"Client; Pro";Payée partiellement;1000,00;0,00;1000,00;400,00;600,00;');
}

// ---------- Brouillon ----------
ok("en-tête de brouillon : échéance avant émission refusée", !preparerFacture(E, { clientId: "c1", objet: "", dateEmission: "2026-03-10", datePrestation: "", dateEcheance: "2026-03-01", natureOperation: "", tvaSurDebits: false, notes: "" }, clients).ok);
ok("en-tête de brouillon : tout vide sauf le client accepté (l'émission exigera)", preparerFacture(E, { clientId: "c1", objet: "", dateEmission: "", datePrestation: "", dateEcheance: "", natureOperation: "", tvaSurDebits: false, notes: "" }, clients).ok);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
