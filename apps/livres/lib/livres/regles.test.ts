/**
 * Tests des règles (fonctions pures).
 * Lancer depuis apps/livres :  node --experimental-strip-types lib/livres/regles.test.ts
 */
import {
  coordonneesPlausibles,
  depuis,
  distanceMetres,
  estTypeSignalement,
  etatApresSignalement,
  formaterDistance,
  nettoyerMessage,
  signalementAccepte,
  slugifier,
  SIGNALEMENTS_MAX_PAR_HEURE,
} from "./regles.ts";

let pass = 0;
let fail = 0;
function ok(label: string, c: boolean) {
  if (c) pass++;
  else fail++;
  console.log(`  ${c ? "PASS" : "FAIL"}  ${label}`);
}

// États
ok("vide → à remplir", etatApresSignalement("bon", "vide") === "a_remplir");
ok("dépôt → bien remplie", etatApresSignalement("a_remplir", "depot") === "bon");
ok("prise : ne change rien", etatApresSignalement("bon", "prise") === "bon");
ok("abîmée l'emporte", etatApresSignalement("bon", "abimee") === "abimee");
ok("un dépôt ne répare pas une boîte abîmée", etatApresSignalement("abimee", "depot") === "abimee");
ok("inconnu + dépôt → bien remplie", etatApresSignalement("inconnu", "depot") === "bon");
ok("type inconnu refusé", !estTypeSignalement("hack") && estTypeSignalement("vide"));

// Message
ok("message vide → null", nettoyerMessage("   ") === null);
ok("message tronqué à 300", (nettoyerMessage("x".repeat(500)) ?? "").length === 300);
ok("caractères de contrôle retirés", nettoyerMessage("porte\u0007 cassée") === "porte cassée");
ok("retours à la ligne gardés", nettoyerMessage("ligne 1\nligne 2") === "ligne 1\nligne 2");

// Slug
ok("slug sans accents", slugifier("Parc Saint-Pierre (côté étang)") === "parc-saint-pierre-cote-etang");

// Distance : cathédrale d'Amiens → gare d'Amiens, environ 700 à 900 m
const cathedrale = { lat: 49.8945, lng: 2.3022 };
const gare = { lat: 49.8907, lng: 2.3083 };
const d = distanceMetres(cathedrale, gare);
ok(`distance cathédrale-gare plausible (${Math.round(d)} m)`, d > 500 && d < 1000);
ok("format mètres", formaterDistance(347) === "350 m");
ok("format km", formaterDistance(2340) === "2,3 km");

// Dates
const maintenant = new Date("2026-11-13T12:00:00Z");
ok("aujourd'hui", depuis("2026-11-13T08:00:00Z", maintenant) === "aujourd'hui");
ok("hier", depuis("2026-11-12T08:00:00Z", maintenant) === "hier");
ok("il y a 5 jours", depuis("2026-11-08T08:00:00Z", maintenant) === "il y a 5 jours");
ok("il y a 3 mois", depuis("2026-08-10T08:00:00Z", maintenant) === "il y a 3 mois");
ok("jamais", depuis(null, maintenant) === "jamais");

// Garde-fous
ok("Amiens plausible", coordonneesPlausibles(49.89, 2.30));
ok("Paris refusé", !coordonneesPlausibles(48.85, 2.35));
ok("limite par heure", signalementAccepte(SIGNALEMENTS_MAX_PAR_HEURE - 1) && !signalementAccepte(SIGNALEMENTS_MAX_PAR_HEURE));

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
