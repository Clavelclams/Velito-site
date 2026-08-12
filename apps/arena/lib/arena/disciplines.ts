/**
 * Catalogue des DISCIPLINES affichées sur la page d'accueil.
 *
 * Pourquoi ce fichier existe : quelqu'un qui arrive sur arena.velito.fr ne
 * peut pas deviner ce qu'on y fait. Toornament règle ça avec une grille de
 * jaquettes de jeux dès le premier écran. On applique la même idée, mais elle
 * doit aussi montrer le SPORT PHYSIQUE, sinon personne ne saura qu'ARENA gère
 * aussi le padel et le five.
 *
 * Pourquoi des pastilles de couleur et pas des visuels de jeux : les jaquettes
 * de League of Legends ou de Fortnite sont des œuvres protégées. Toornament
 * les affiche parce qu'il a des accords avec les éditeurs (Riot, Ubisoft,
 * Microsoft sont ses clients). Nous n'en avons pas. Reprendre ces images
 * serait une contrefaçon, et pour une association qui demande des subventions
 * publiques c'est un risque disproportionné face au gain esthétique.
 * Donc : typographie forte + couleur propre à chaque discipline. Assumé.
 *
 * `jeu` correspond EXACTEMENT au libellé stocké dans arena.tournois.jeu, ce
 * qui permet de compter les tournois par discipline sans table de
 * correspondance et sans risque de décalage.
 */

export type Verticale = "ESPORT" | "SPORT";

export interface Discipline {
  /** Libellé exact utilisé dans la colonne `jeu`. */
  jeu: string;
  /** Nom court affiché sur la pastille (les titres longs cassent la grille). */
  court: string;
  verticale: Verticale;
  /** Classes Tailwind du fond de pastille. */
  couleur: string;
}

export const DISCIPLINES: Discipline[] = [
  // --- Esport ---
  { jeu: "Rocket League", court: "Rocket League", verticale: "ESPORT", couleur: "from-[#1B3C8C] to-[#2E6BD6]" },
  { jeu: "EA Sports FC 25", court: "EA FC 25", verticale: "ESPORT", couleur: "from-[#0B3B2E] to-[#128A5E]" },
  { jeu: "Street Fighter 6", court: "Street Fighter 6", verticale: "ESPORT", couleur: "from-[#7A1B1B] to-[#D14B2A]" },
  { jeu: "Tekken 8", court: "Tekken 8", verticale: "ESPORT", couleur: "from-[#2B1B4A] to-[#6B3FA0]" },
  { jeu: "Super Smash Bros. Ultimate", court: "Smash Ultimate", verticale: "ESPORT", couleur: "from-[#8A3B00] to-[#E08A2B]" },
  { jeu: "Mario Kart 8 Deluxe", court: "Mario Kart 8", verticale: "ESPORT", couleur: "from-[#A32020] to-[#E85D4A]" },
  { jeu: "Valorant", court: "Valorant", verticale: "ESPORT", couleur: "from-[#6E1526] to-[#C63A4C]" },
  { jeu: "Counter-Strike 2", court: "Counter-Strike 2", verticale: "ESPORT", couleur: "from-[#4A3A12] to-[#B08A2E]" },
  { jeu: "League of Legends", court: "League of Legends", verticale: "ESPORT", couleur: "from-[#0E2A45] to-[#1E6E8C]" },
  { jeu: "Fortnite", court: "Fortnite", verticale: "ESPORT", couleur: "from-[#3B1E7A] to-[#7B4FD6]" },

  // --- Sport physique ---
  { jeu: "Padel", court: "Padel", verticale: "SPORT", couleur: "from-[#0B4A3A] to-[#1E9E72]" },
  { jeu: "Five (football à 5)", court: "Five", verticale: "SPORT", couleur: "from-[#123A1E] to-[#2E8A3E]" },
  { jeu: "Basket 3x3", court: "Basket 3x3", verticale: "SPORT", couleur: "from-[#7A3A0B] to-[#D6772E]" },
  { jeu: "Ping-pong", court: "Ping-pong", verticale: "SPORT", couleur: "from-[#1B2E5C] to-[#3E6BC4]" },
];

export const DISCIPLINES_ESPORT = DISCIPLINES.filter((d) => d.verticale === "ESPORT");
export const DISCIPLINES_SPORT = DISCIPLINES.filter((d) => d.verticale === "SPORT");
