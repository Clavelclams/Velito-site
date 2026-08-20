/**
 * Liens sortants vers les sites de stats existants (tracker.gg, op.gg…).
 *
 * Doctrine de complémentarité, volet « accès central » : un joueur qui arrive
 * sur la fiche d'un jeu doit pouvoir retrouver SES stats de jeu — mais on ne
 * reconstruit pas un agrégateur. Décision actée le 15/08 : les APIs des
 * éditeurs sont fermées, payantes ou instables, un agrégateur multi-jeux est
 * intenable pour un dev seul. À la place : un simple formulaire qui REDIRIGE
 * vers le tracker de référence du jeu. Zéro clé API, zéro scraping, zéro
 * maintenance — et zéro concurrence avec ces sites, on leur ENVOIE du monde.
 *
 * Module pur : la construction d'URL est testée, car une URL fausse envoie
 * le joueur sur une 404 chez un tiers et on ne le verrait jamais.
 */

/** Une plateforme sélectionnable dans le formulaire (console, launcher…). */
export interface PlateformeTracker {
  /** Valeur passée dans l'URL du tracker (psn, xbl, steam…). */
  cle: string;
  /** Libellé affiché au joueur (« PlayStation », « Xbox »…). */
  libelle: string;
}

export interface Tracker {
  /** Nom du service, affiché tel quel : le joueur sait où il part. */
  nom: string;
  /** Page d'accueil, montrée même sans pseudo saisi. */
  urlAccueil: string;
  /** Plateformes proposées ; tableau vide = pas de choix (ex. Riot ID). */
  plateformes: PlateformeTracker[];
  /** Aide de saisie affichée sous le champ (« Pseudo#TAG »…). */
  aideSaisie: string;
}

const CONSOLES_ET_PC: PlateformeTracker[] = [
  { cle: "steam", libelle: "Steam" },
  { cle: "epic", libelle: "Epic Games" },
  { cle: "psn", libelle: "PlayStation" },
  { cle: "xbl", libelle: "Xbox" },
];

/**
 * Trackers par slug de discipline. N'y figurent QUE les jeux ayant un site
 * de stats public avec un format d'URL de profil stable. Les autres (Smash,
 * Mario Kart, Street Fighter 6 derrière un login Capcom…) n'ont pas d'entrée :
 * mieux vaut rien qu'un lien qui casse.
 */
export const TRACKERS: Record<string, Tracker> = {
  "rocket-league": {
    nom: "Rocket League Tracker",
    urlAccueil: "https://rocketleague.tracker.network/",
    plateformes: [...CONSOLES_ET_PC, { cle: "switch", libelle: "Switch" }],
    aideSaisie: "Ton pseudo sur la plateforme choisie.",
  },
  valorant: {
    nom: "Tracker.gg (Valorant)",
    urlAccueil: "https://tracker.gg/valorant",
    // Un seul identifiant possible : le Riot ID, quelle que soit la machine.
    plateformes: [],
    aideSaisie: "Ton Riot ID complet, au format Pseudo#TAG.",
  },
  "league-of-legends": {
    nom: "OP.GG",
    urlAccueil: "https://www.op.gg/",
    plateformes: [],
    aideSaisie: "Ton Riot ID complet, au format Pseudo#TAG (serveur EUW).",
  },
  fortnite: {
    nom: "Fortnite Tracker",
    urlAccueil: "https://fortnitetracker.com/",
    // Fortnite Tracker cherche sur toutes les plateformes d'un coup.
    plateformes: [],
    aideSaisie: "Ton pseudo Epic Games.",
  },
};

/**
 * Construit l'URL du profil du joueur sur le tracker du jeu.
 * Renvoie null si le jeu n'a pas de tracker, si le pseudo est vide, ou si la
 * plateforme demandée n'existe pas pour ce tracker — dans ce cas l'appelant
 * renvoie le joueur sur la fiche du jeu plutôt que vers une 404 externe.
 */
export function lienProfilTracker(
  slugJeu: string,
  pseudoBrut: string,
  plateforme?: string
): string | null {
  const tracker = TRACKERS[slugJeu];
  const pseudo = pseudoBrut.trim();
  if (!tracker || pseudo.length === 0) return null;

  switch (slugJeu) {
    case "rocket-league": {
      const p = tracker.plateformes.find((pl) => pl.cle === plateforme);
      if (!p) return null;
      return `https://rocketleague.tracker.network/rocket-league/profile/${p.cle}/${encodeURIComponent(pseudo)}/overview`;
    }
    case "valorant":
      // Le « # » du Riot ID doit être percent-encodé, sinon le navigateur le
      // traite comme une ancre et tracker.gg ne reçoit que la moitié de l'ID.
      return `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(pseudo)}/overview`;
    case "league-of-legends": {
      // OP.GG écrit le Riot ID « Pseudo#TAG » sous la forme « Pseudo-TAG ».
      const riotId = pseudo.replace("#", "-");
      return `https://www.op.gg/summoners/euw/${encodeURIComponent(riotId)}`;
    }
    case "fortnite":
      return `https://fortnitetracker.com/profile/all/${encodeURIComponent(pseudo)}`;
    default:
      return null;
  }
}
