/**
 * Liste fixe des jeux pour la section "Etre appele pour les competitions".
 *
 * Pourquoi une liste fermee : pour que le filtre admin "qui joue a X ?" soit
 * FIABLE (sinon "valo" != "Valorant"). Les joueurs en choisissent jusqu'a 5
 * (cf. JEUX_MAX). Liste orientee scene esport + jeux populaires en quartier
 * (fighting games, sport, party). Ordre = ordre d'affichage. "Autre" en dernier.
 *
 * Pour ajouter/retirer un jeu : edite simplement ce tableau.
 */
export const JEUX_MAX = 5;

export const JEUX: string[] = [
  // FPS / Tactique / Battle Royale
  "Valorant",
  "Counter-Strike 2",
  "Rainbow Six Siege",
  "Call of Duty",
  "Apex Legends",
  "Overwatch 2",
  "Fortnite",
  "PUBG",

  // MOBA
  "League of Legends",
  "Dota 2",

  // Combat (FGC)
  "Street Fighter 6",
  "Tekken 8",
  "Mortal Kombat 1",
  "Dragon Ball FighterZ",
  "Dragon Ball Sparking Zero",
  "Naruto Storm Connections",
  "Super Smash Bros Ultimate",
  "Guilty Gear Strive",
  "Brawlhalla",
  "EA Sports UFC",

  // Sport
  "EA Sports FC (FIFA)",
  "eFootball",
  "NBA 2K",
  "Madden NFL",
  "Rocket League",

  // Course / Racing
  "Mario Kart",
  "Sim Racing (GT / F1 / Forza)",
  "Trackmania",

  // Party / fete / mobile
  "Brawl Stars",
  "Clash Royale",
  "Fall Guys",
  "Just Dance",
  "Wii Sports",

  // Cartes / auto-battler
  "Hearthstone",
  "Teamfight Tactics",

  "Autre",
];
