/**
 * Anti-spam du formulaire de devis (13/11/2026). Fonctions PURES, testées.
 *
 * Constat en base le 13/11/2026 : sur 16 demandes jamais traitées, au moins
 * 11 venaient de robots (champ « budget » rempli de lettres au hasard comme
 * « NOzXXluQVXWMITYXGgTQZNTb », ou 5 envois identiques). Le formulaire n'avait
 * aucune protection, et l'accusé de réception partait vers les adresses des
 * robots, ce qui abîme la réputation d'envoi du domaine.
 *
 * Trois filets, sans service tiers ni clé (un captcha aurait demandé un
 * compte hCaptcha ; on garde cette option si ces trois-là ne suffisent pas) :
 *  1. Pot de miel : un champ « site web » invisible pour un humain. Un robot
 *     qui remplit tous les champs le remplit aussi.
 *  2. Délai minimum : un humain met plus de 3 secondes à remplir le
 *     formulaire ; un robot l'envoie dans la foulée de l'affichage.
 *  3. Charabia : un champ qui contient un long mot sans espace, sans
 *     chiffre, avec un mélange de majuscules et minuscules au milieu
 *     (« NOzXXluQVXW… ») n'est pas écrit par une personne.
 *
 * Face à un robot détecté, l'application répond « merci » sans rien
 * enregistrer : lui dire « refusé » lui apprendrait à contourner le filtre.
 */

export const DELAI_MINIMUM_MS = 3000;

/** Un « mot » de 12 lettres ou plus avec au moins 3 majuscules après la 1re lettre. */
export function ressembleACharabia(texte: string | null | undefined): boolean {
  if (!texte) return false;
  for (const mot of texte.split(/\s+/)) {
    if (mot.length < 12) continue;
    if (!/^[A-Za-z]+$/.test(mot)) continue; // un vrai mot long a souvent accents, tirets, chiffres
    const majusculesInternes = (mot.slice(1).match(/[A-Z]/g) ?? []).length;
    const minuscules = (mot.match(/[a-z]/g) ?? []).length;
    if (majusculesInternes >= 3 && minuscules >= 3) return true;
  }
  return false;
}

/**
 * [13/11/2026] Hameçonnage déguisé en demande de devis. Cas réel reçu 5 fois
 * (oct.-nov. 2026) : faux « directeur » d'une vraie société, adresse jetable
 * (`@probox.my.id`), budget en dollars, et un message qui récite l'offre
 * VENA puis renvoie vers un lien personnalisé (`unpartage.online/fr/mkt/velito`,
 * puis `gopartage.online/...` : le domaine change à chaque envoi pour
 * échapper aux listes noires).
 *
 * On ne peut donc pas se fier au domaine du lien. On additionne des indices ;
 * un seul ne suffit pas (un vrai client peut coller le lien de son site, ou
 * écrire depuis l'étranger), deux ensemble, si.
 */
const DOMAINES_JETABLES = ["probox.my.id", "prodmail.online"];
const TLD_SUSPECTS = [".my.id"];

export function indicesHameconnage(args: {
  email: string | null | undefined;
  budget: string | null | undefined;
  message: string | null | undefined;
}): string[] {
  const indices: string[] = [];
  const domaine = (args.email ?? "").toLowerCase().split("@")[1] ?? "";
  if (DOMAINES_JETABLES.includes(domaine) || TLD_SUSPECTS.some((t) => domaine.endsWith(t))) {
    indices.push("adresse_jetable");
  }
  if (/\$|usd|dollar/i.test(args.budget ?? "")) indices.push("budget_en_dollars");
  const liens = (args.message ?? "").match(/https?:\/\/[^\s]+/gi) ?? [];
  const liensExternes = liens.filter((l) => !/^https?:\/\/([a-z0-9-]+\.)*velito\.fr/i.test(l));
  if (liensExternes.length > 0) indices.push("lien_externe");
  // Un site tiers qui met « velito » dans SON adresse : page fabriquée pour nous.
  if (liensExternes.some((l) => /velito/i.test(l))) indices.push("lien_personnalise");
  return indices;
}

export const SEUIL_HAMECONNAGE = 2;

export interface SignauxEnvoi {
  /** Valeur du champ piège (vide pour un humain). */
  potDeMiel: string | null | undefined;
  /** Horodatage (ms) de l'affichage du formulaire, envoyé par le navigateur. */
  afficheA: number | null | undefined;
  /** Horodatage (ms) de réception côté serveur. */
  recuA: number;
  /** Champs libres à inspecter. */
  champs: (string | null | undefined)[];
  /** [13/11/2026] Pour la détection d'hameçonnage (facultatif). */
  email?: string | null;
  budget?: string | null;
  message?: string | null;
}

export type Verdict =
  | { robot: false }
  | { robot: true; raison: "pot_de_miel" | "trop_rapide" | "charabia" | "hameconnage" };

export function detecterRobot(s: SignauxEnvoi): Verdict {
  if (s.potDeMiel && s.potDeMiel.trim() !== "") return { robot: true, raison: "pot_de_miel" };
  // Horodatage absent ou incohérent (dans le futur) : envoi forgé, pas par la page.
  if (typeof s.afficheA !== "number" || !Number.isFinite(s.afficheA) || s.afficheA > s.recuA) {
    return { robot: true, raison: "trop_rapide" };
  }
  if (s.recuA - s.afficheA < DELAI_MINIMUM_MS) return { robot: true, raison: "trop_rapide" };
  if (s.champs.some(ressembleACharabia)) return { robot: true, raison: "charabia" };
  if (indicesHameconnage({ email: s.email, budget: s.budget, message: s.message }).length >= SEUIL_HAMECONNAGE) {
    return { robot: true, raison: "hameconnage" };
  }
  return { robot: false };
}
