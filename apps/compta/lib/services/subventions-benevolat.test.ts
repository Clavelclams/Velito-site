/**
 * Tests unitaires des services SUBVENTIONS et BÉNÉVOLAT (fonctions pures).
 * Lancer depuis apps/compta :
 *   node scripts/test.mjs lib/services/subventions-benevolat.test.ts
 */
import { preparerSubvention, suiviSubvention, totauxSubventions, type SaisieSubvention } from "./subventions.ts";
import {
  changementStatutRefuse,
  contributionsDepuisVea,
  dureeVersMinutes,
  preparerContribution,
  syntheseContributions,
  valeurHeures,
  type SaisieContribution,
} from "./benevolat.ts";

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

// ============================ SUBVENTIONS ================================
const base: SaisieSubvention = {
  entiteId: "e1", financeur: "FDVA", action: "Fonctionnement", exercice: "2026", statut: "",
  montantDemande: "3000", montantNotifie: "", dateDepot: "", dateNotification: "", echeance: "", commentaire: "",
};
const s1 = preparerSubvention(base);
ok("dossier minimal : à préparer, notifié inconnu = null", s1.ok && s1.valeur.statut === "a_preparer" && s1.valeur.montant_notifie_centimes === null && s1.valeur.montant_demande_centimes === 300000);
ok("demandé vide = inconnu (null), pas 0", (() => { const r = preparerSubvention({ ...base, montantDemande: "" }); return r.ok && r.valeur.montant_demande_centimes === null; })());
ok("notifiée sans montant notifié : refusé", !preparerSubvention({ ...base, statut: "notifiee" }).ok);
ok("notifiée avec montant : accepté", preparerSubvention({ ...base, statut: "notifiee", montantNotifie: "2500" }).ok);
ok("financeur vide refusé", !preparerSubvention({ ...base, financeur: "  " }).ok);
ok("exercice invalide refusé", !preparerSubvention({ ...base, exercice: "26" }).ok);
ok("date impossible refusée", !preparerSubvention({ ...base, echeance: "2026-02-30" }).ok);
ok("montant négatif refusé", !preparerSubvention({ ...base, montantDemande: "-5" }).ok);
ok("statut inconnu refusé", !preparerSubvention({ ...base, statut: "payee" }).ok);

const sub = { id: "s1", montant_demande_centimes: 300000, montant_notifie_centimes: 250000, echeance: "2026-06-30", statut: "notifiee" as const };
const ops = [
  { subvention_id: "s1", type: "recette" as const, montant_ttc_centimes: 150000, virement_id: null },
  { subvention_id: "s1", type: "depense" as const, montant_ttc_centimes: 40000, virement_id: null },
  { subvention_id: "s1", type: "recette" as const, montant_ttc_centimes: 99999, virement_id: "v1" }, // virement : ignoré
  { subvention_id: "s2", type: "recette" as const, montant_ttc_centimes: 7777, virement_id: null }, // autre dossier
];
const suivi = suiviSubvention(sub, ops, "2026-07-15");
ok("encaissé = recettes liées, hors virement", suivi.encaisse === 150000);
ok("employé = dépenses liées", suivi.employe === 40000);
ok("reste à encaisser = notifié − encaissé", suivi.resteAEncaisser === 100000);
ok("échéance dépassée signalée", suivi.echeanceDepassee);
ok("notifié inconnu : reste à encaisser inconnu", suiviSubvention({ ...sub, montant_notifie_centimes: null }, ops, "2026-01-01").resteAEncaisser === null);
ok("dossier soldé : plus d'alerte d'échéance", !suiviSubvention({ ...sub, statut: "soldee" }, ops, "2026-07-15").echeanceDepassee);

const tot = totauxSubventions(
  [
    sub,
    { id: "s2", statut: "refusee", montant_demande_centimes: 500000, montant_notifie_centimes: null, echeance: null },
    { id: "s3", statut: "notifiee", montant_demande_centimes: 100000, montant_notifie_centimes: null, echeance: null },
  ],
  ops,
  "2026-01-01",
);
ok("refusé exclu du demandé", tot.demande === 400000);
ok("notifié inconnu compté à part, pas comme 0", tot.notifie === 250000 && tot.notifieInconnu === 1);

// ============================ BÉNÉVOLAT ==================================
ok("valeur : 10 h à 12 € = 120 €", valeurHeures(600, 1200) === 12000);
ok("valeur : arrondi au centime (7 min à 11,88 €)", valeurHeures(7, 1188) === 139);
ok("durée « 2,5 » = 150 min", dureeVersMinutes("2,5") === 150);
ok("durée « 2h30 » = 150 min", dureeVersMinutes("2h30") === 150);
ok("durée « 3 » = 180 min", dureeVersMinutes("3") === 180);
ok("durée « 2h75 » refusée", dureeVersMinutes("2h75") === null);
ok("durée 0 refusée", dureeVersMinutes("0") === null);

const cb: SaisieContribution = {
  entiteId: "e1", type: "heures_benevoles", date: "2026-03-10", libelle: "Tournoi", duree: "10",
  tauxHoraire: "12", nbPersonnes: "4", valeur: "", dateRenonciation: "", commentaire: "",
};
const h = preparerContribution(cb);
ok("heures : valeur calculée, statut à vérifier", h.ok && h.valeur.valeur_centimes === 12000 && h.valeur.statut === "a_verifier" && h.valeur.nb_personnes === 4);
ok("heures sans taux : refusé (pas de taux inventé)", !preparerContribution({ ...cb, tauxHoraire: "" }).ok);
const don = preparerContribution({ ...cb, type: "don_nature", valeur: "80", duree: "", tauxHoraire: "" });
ok("don en nature : valeur saisie, pas de minutes", don.ok && don.valeur.valeur_centimes === 8000 && don.valeur.minutes === null);
ok("don sans valeur : refusé", !preparerContribution({ ...cb, type: "don_nature", valeur: "" }).ok);
const frais = preparerContribution({ ...cb, type: "frais_abandonnes", valeur: "40", dateRenonciation: "2026-03-20" });
ok("frais abandonnés : date de renonciation gardée", frais.ok && frais.valeur.date_renonciation === "2026-03-20");
ok("vérifier des frais sans renonciation : refusé", changementStatutRefuse({ type: "frais_abandonnes", date_renonciation: null }, "verifie") !== null);
ok("vérifier des frais avec renonciation : permis", changementStatutRefuse({ type: "frais_abandonnes", date_renonciation: "2026-03-20" }, "verifie") === null);

const syn = syntheseContributions(
  [
    { type: "heures_benevoles", statut: "verifie", valeur_centimes: 12000, minutes: 600, date_contribution: "2026-03-10" },
    { type: "heures_benevoles", statut: "a_verifier", valeur_centimes: 5000, minutes: 300, date_contribution: "2026-04-10" },
    { type: "don_nature", statut: "verifie", valeur_centimes: 8000, minutes: null, date_contribution: "2026-05-01" },
    { type: "don_nature", statut: "annule", valeur_centimes: 9999, minutes: null, date_contribution: "2026-05-01" },
    { type: "heures_benevoles", statut: "verifie", valeur_centimes: 1, minutes: 60, date_contribution: "2025-12-31" },
  ],
  2026,
);
ok("synthèse : seules les fiches vérifiées de l'exercice", syn.total === 20000 && syn.parType.heures_benevoles === 12000);
ok("synthèse : heures vérifiées", syn.heures === 10);
ok("synthèse : fiches à vérifier comptées", syn.aVerifier === 1);

const vea = contributionsDepuisVea(
  [
    { event_slug: "tournoi", participant_id: "p1", heures_aide: 3 },
    { event_slug: "tournoi", participant_id: "p2", heures_aide: 2.5 },
    { event_slug: "tournoi", participant_id: "p1", heures_aide: 1 }, // même personne, autre motif ou correction
    { event_slug: "soiree", participant_id: "p3", heures_aide: 0 }, // aucune heure : ignoré
    { event_slug: "ancien", participant_id: "p4", heures_aide: 2 },
  ],
  [
    { event_slug: "tournoi", nom: "Tournoi FC", date: "2026-03-10" },
    { event_slug: "soiree", nom: "Soirée", date: "2026-04-01" },
    { event_slug: "ancien", nom: "Ancien", date: "2025-11-01" }, // autre exercice
  ],
  { entiteId: "e1", exercice: 2026, tauxHoraireCentimes: 1200 },
);
ok("reprise VEA : une fiche par événement de l'exercice ayant des heures", vea.length === 1);
ok("reprise VEA : 6,5 h, 2 bénévoles distincts, valeur 78 €", vea[0]!.minutes === 390 && vea[0]!.nb_personnes === 2 && vea[0]!.valeur_centimes === 7800);
ok("reprise VEA : clé source stable, statut à vérifier", vea[0]!.source_cle === "vea-presences:tournoi" && vea[0]!.statut === "a_verifier");
ok("reprise VEA : aucun identifiant de personne dans la fiche", !JSON.stringify(vea[0]).includes("p1"));

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
