/**
 * Quiz — banque de questions hardcodées (MVP).
 *
 * Pour le MVP démo, on hardcode 15 questions multi-thèmes (culture G, sport,
 * Amiens, jeux vidéo). Plus tard, on extraira ça dans une table Supabase pour
 * que les animateurs puissent ajouter leurs propres questions.
 *
 * Format : 1 question, 4 réponses (A,B,C,D), une seule correcte.
 *
 * Design :
 *  - On ne révèle PAS la réponse correcte au client tant que le host n'a pas
 *    cliqué "Reveal". Côté joueur, on envoie seulement [question, choices].
 *  - Le scoring tient compte du temps : plus tu réponds vite, plus tu gagnes
 *    de points (max 1000, min 200 si t'as répondu juste à la dernière seconde).
 */

export interface QuizQuestion {
  id: string;
  /** La question elle-même. */
  question: string;
  /** 4 propositions de réponse. */
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  /** La bonne réponse (clé A/B/C/D). */
  correct: "A" | "B" | "C" | "D";
  /** Thème pour le tag visuel (optionnel). */
  theme?: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // ─── CULTURE GÉNÉRALE ───
  {
    id: "cg-1",
    question: "Quelle est la capitale de l'Australie ?",
    choices: { A: "Sydney", B: "Melbourne", C: "Canberra", D: "Perth" },
    correct: "C",
    theme: "Culture G",
  },
  {
    id: "cg-2",
    question: "Combien de planètes compose le système solaire ?",
    choices: { A: "7", B: "8", C: "9", D: "10" },
    correct: "B",
    theme: "Culture G",
  },
  {
    id: "cg-3",
    question: "Quel élément chimique a pour symbole Au ?",
    choices: { A: "Argent", B: "Cuivre", C: "Aluminium", D: "Or" },
    correct: "D",
    theme: "Culture G",
  },

  // ─── AMIENS / HAUTS-DE-FRANCE ───
  {
    id: "amiens-1",
    question: "Quel est le surnom d'Amiens grâce à ses canaux ?",
    choices: {
      A: "La Venise du Nord",
      B: "La Petite Venise",
      C: "L'Île de France",
      D: "La Cité d'Eau",
    },
    correct: "B",
    theme: "Amiens",
  },
  {
    id: "amiens-2",
    question: "Quel grand auteur français est né à Amiens ?",
    choices: { A: "Victor Hugo", B: "Émile Zola", C: "Jules Verne", D: "Marcel Proust" },
    correct: "C",
    theme: "Amiens",
  },
  {
    id: "amiens-3",
    question: "Quelle spécialité culinaire est typique d'Amiens ?",
    choices: { A: "Le Maroilles", B: "Le Macaron", C: "La Carbonade", D: "Le Welsh" },
    correct: "B",
    theme: "Amiens",
  },

  // ─── SPORT ───
  {
    id: "sport-1",
    question: "Quel pays a remporté la Coupe du Monde de foot 2022 ?",
    choices: { A: "France", B: "Argentine", C: "Brésil", D: "Allemagne" },
    correct: "B",
    theme: "Sport",
  },
  {
    id: "sport-2",
    question: "Combien de joueurs dans une équipe de basket sur le terrain ?",
    choices: { A: "4", B: "5", C: "6", D: "7" },
    correct: "B",
    theme: "Sport",
  },
  {
    id: "sport-3",
    question: "Quel club de foot a remporté le plus de Ligue des Champions ?",
    choices: { A: "FC Barcelone", B: "Bayern Munich", C: "Real Madrid", D: "Liverpool" },
    correct: "C",
    theme: "Sport",
  },

  // ─── JEUX VIDÉO / GAMING ───
  {
    id: "gaming-1",
    question: "Quel personnage est le héros de la série The Legend of Zelda ?",
    choices: { A: "Zelda", B: "Link", C: "Ganondorf", D: "Sheik" },
    correct: "B",
    theme: "Gaming",
  },
  {
    id: "gaming-2",
    question: "Quel jeu vidéo a popularisé le battle royale ?",
    choices: { A: "Fortnite", B: "PUBG", C: "Apex Legends", D: "Call of Duty" },
    correct: "B",
    theme: "Gaming",
  },
  {
    id: "gaming-3",
    question: "Quelle entreprise a créé la PlayStation ?",
    choices: { A: "Nintendo", B: "Microsoft", C: "Sega", D: "Sony" },
    correct: "D",
    theme: "Gaming",
  },

  // ─── MUSIQUE / POP CULTURE ───
  {
    id: "music-1",
    question: "Quel groupe a sorti l'album Thriller ?",
    choices: {
      A: "The Jacksons",
      B: "Michael Jackson",
      C: "The Beatles",
      D: "Queen",
    },
    correct: "B",
    theme: "Musique",
  },
  {
    id: "music-2",
    question: "Quel rappeur français a sorti Or Noir ?",
    choices: { A: "Booba", B: "Kaaris", C: "Damso", D: "PNL" },
    correct: "B",
    theme: "Musique",
  },
  {
    id: "music-3",
    question: "Quel chanteur incarne Aladdin dans le film Disney de 1992 ?",
    choices: { A: "Phil Collins", B: "Brad Kane", C: "Robin Williams", D: "Peabo Bryson" },
    correct: "B",
    theme: "Musique",
  },

  // ════════════════════════════════════════════════════════════════
  // PACK COMPLÉMENTAIRE — 10 questions par thème (sprint Moxy 09/06/2026)
  // ════════════════════════════════════════════════════════════════

  // ─── CULTURE GÉNÉRALE (7 de plus → 10 total) ───
  {
    id: "cg-4",
    question: "Quel est le plus long fleuve du monde ?",
    choices: { A: "Le Nil", B: "L'Amazone", C: "Le Yangzi Jiang", D: "Le Mississippi" },
    correct: "B",
    theme: "Culture G",
  },
  {
    id: "cg-5",
    question: "Qui a peint La Joconde ?",
    choices: { A: "Michel-Ange", B: "Raphaël", C: "Léonard de Vinci", D: "Botticelli" },
    correct: "C",
    theme: "Culture G",
  },
  {
    id: "cg-6",
    question: "Combien d'os possède le corps humain adulte ?",
    choices: { A: "186", B: "206", C: "256", D: "306" },
    correct: "B",
    theme: "Culture G",
  },
  {
    id: "cg-7",
    question: "Quelle est la monnaie officielle du Japon ?",
    choices: { A: "Le Won", B: "Le Yuan", C: "Le Yen", D: "Le Baht" },
    correct: "C",
    theme: "Culture G",
  },
  {
    id: "cg-8",
    question: "En quelle année est tombé le mur de Berlin ?",
    choices: { A: "1987", B: "1989", C: "1991", D: "1993" },
    correct: "B",
    theme: "Culture G",
  },
  {
    id: "cg-9",
    question: "Quel est l'élément chimique le plus abondant dans l'univers ?",
    choices: { A: "Oxygène", B: "Carbone", C: "Hydrogène", D: "Hélium" },
    correct: "C",
    theme: "Culture G",
  },
  {
    id: "cg-10",
    question: "Qui a écrit Les Misérables ?",
    choices: { A: "Émile Zola", B: "Victor Hugo", C: "Honoré de Balzac", D: "Gustave Flaubert" },
    correct: "B",
    theme: "Culture G",
  },

  // ─── SPORT (7 de plus → 10 total) ───
  {
    id: "sport-4",
    question: "Combien de joueurs dans une équipe de basket sur le terrain ?",
    choices: { A: "4", B: "5", C: "6", D: "7" },
    correct: "B",
    theme: "Sport",
  },
  {
    id: "sport-5",
    question: "Quel pays a remporté la Coupe du monde de foot 2022 ?",
    choices: { A: "France", B: "Brésil", C: "Argentine", D: "Croatie" },
    correct: "C",
    theme: "Sport",
  },
  {
    id: "sport-6",
    question: "Dans quel sport entend-on l'expression 'love' pour zéro ?",
    choices: { A: "Golf", B: "Tennis", C: "Cricket", D: "Badminton" },
    correct: "B",
    theme: "Sport",
  },
  {
    id: "sport-7",
    question: "Combien dure un match de boxe pro maximum (rounds) ?",
    choices: { A: "10", B: "12", C: "15", D: "20" },
    correct: "B",
    theme: "Sport",
  },
  {
    id: "sport-8",
    question: "Qui détient le record de 7 ballons d'or au foot ?",
    choices: { A: "Cristiano Ronaldo", B: "Lionel Messi", C: "Zinédine Zidane", D: "Pelé" },
    correct: "B",
    theme: "Sport",
  },
  {
    id: "sport-9",
    question: "Dans quel sport utilise-t-on un volant ?",
    choices: { A: "Tennis", B: "Squash", C: "Badminton", D: "Ping-pong" },
    correct: "C",
    theme: "Sport",
  },
  {
    id: "sport-10",
    question: "Combien de joueurs sur un terrain de rugby à XV (par équipe) ?",
    choices: { A: "13", B: "14", C: "15", D: "16" },
    correct: "C",
    theme: "Sport",
  },

  // ─── AMIENS / HAUTS-DE-FRANCE (7 de plus → 10 total) ───
  {
    id: "amiens-4",
    question: "Quelle rivière traverse Amiens ?",
    choices: { A: "La Seine", B: "La Somme", C: "L'Oise", D: "L'Aisne" },
    correct: "B",
    theme: "Amiens",
  },
  {
    id: "amiens-5",
    question: "Comment s'appellent les jardins flottants d'Amiens ?",
    choices: {
      A: "Les Hortillonnages",
      B: "Les Marais",
      C: "Les Jardins de la Somme",
      D: "Le Quartier Saint-Leu",
    },
    correct: "A",
    theme: "Amiens",
  },
  {
    id: "amiens-6",
    question: "Quelle spécialité culinaire est typique d'Amiens ?",
    choices: { A: "Macaron", B: "Carolo", C: "Andouillette", D: "Maroilles" },
    correct: "A",
    theme: "Amiens",
  },
  {
    id: "amiens-7",
    question: "Comment surnomme-t-on la cathédrale d'Amiens ?",
    choices: {
      A: "La Cathédrale du Nord",
      B: "Notre-Dame du Nord",
      C: "La Bible de pierre",
      D: "Sainte-Marie-aux-Cieux",
    },
    correct: "C",
    theme: "Amiens",
  },
  {
    id: "amiens-8",
    question: "Quel club de foot représente Amiens en Ligue 2 / National ?",
    choices: { A: "AS Amiens", B: "Amiens SC", C: "FC Amiens", D: "RC Amiens" },
    correct: "B",
    theme: "Amiens",
  },
  {
    id: "amiens-9",
    question: "Quel département est Amiens chef-lieu ?",
    choices: { A: "Nord", B: "Pas-de-Calais", C: "Somme", D: "Oise" },
    correct: "C",
    theme: "Amiens",
  },
  {
    id: "amiens-10",
    question: "Jules Verne a vécu à Amiens. Quel livre y a-t-il écrit en grande partie ?",
    choices: {
      A: "Vingt mille lieues sous les mers",
      B: "Le Tour du monde en 80 jours",
      C: "Michel Strogoff",
      D: "Voyage au centre de la Terre",
    },
    correct: "B",
    theme: "Amiens",
  },

  // ─── GAMING (7 de plus → 10 total) ───
  {
    id: "gaming-4",
    question: "Quel est le jeu vidéo le plus vendu de tous les temps ?",
    choices: { A: "GTA V", B: "Minecraft", C: "Tetris", D: "Fortnite" },
    correct: "B",
    theme: "Gaming",
  },
  {
    id: "gaming-5",
    question: "Quel studio a créé The Witcher 3 ?",
    choices: { A: "Bethesda", B: "CD Projekt Red", C: "Bioware", D: "Ubisoft" },
    correct: "B",
    theme: "Gaming",
  },
  {
    id: "gaming-6",
    question: "Quelle console Nintendo est sortie en 2017 ?",
    choices: { A: "Wii U", B: "3DS", C: "Switch", D: "Switch 2" },
    correct: "C",
    theme: "Gaming",
  },
  {
    id: "gaming-7",
    question: "Comment s'appelle l'antagoniste principal de la saga Zelda ?",
    choices: { A: "Bowser", B: "Ganondorf", C: "Eggman", D: "Sephiroth" },
    correct: "B",
    theme: "Gaming",
  },
  {
    id: "gaming-8",
    question: "Quel jeu a popularisé le genre Battle Royale ?",
    choices: { A: "Fortnite", B: "PUBG", C: "Apex Legends", D: "Call of Duty" },
    correct: "B",
    theme: "Gaming",
  },
  {
    id: "gaming-9",
    question: "Qui est le créateur de Mario ?",
    choices: { A: "Hideo Kojima", B: "Shigeru Miyamoto", C: "Hironobu Sakaguchi", D: "Yu Suzuki" },
    correct: "B",
    theme: "Gaming",
  },
  {
    id: "gaming-10",
    question: "Dans quel jeu trouve-t-on un personnage nommé Kratos ?",
    choices: { A: "Diablo", B: "Devil May Cry", C: "God of War", D: "Dark Souls" },
    correct: "C",
    theme: "Gaming",
  },

  // ─── MUSIQUE (7 de plus → 10 total) ───
  {
    id: "music-4",
    question: "Quel artiste a sorti l'album 'Mr Morale & The Big Steppers' ?",
    choices: { A: "Drake", B: "J. Cole", C: "Kendrick Lamar", D: "Travis Scott" },
    correct: "C",
    theme: "Musique",
  },
  {
    id: "music-5",
    question: "Quel rappeur français a sorti QALF ?",
    choices: { A: "PNL", B: "Damso", C: "Ninho", D: "Booba" },
    correct: "B",
    theme: "Musique",
  },
  {
    id: "music-6",
    question: "Quel groupe a chanté Bohemian Rhapsody ?",
    choices: { A: "Led Zeppelin", B: "The Rolling Stones", C: "Queen", D: "Pink Floyd" },
    correct: "C",
    theme: "Musique",
  },
  {
    id: "music-7",
    question: "Quel artiste a sorti l'album 'Renaissance' en 2022 ?",
    choices: { A: "Rihanna", B: "Beyoncé", C: "Taylor Swift", D: "Dua Lipa" },
    correct: "B",
    theme: "Musique",
  },
  {
    id: "music-8",
    question: "Quel chanteur français est connu sous le nom de Slimane ?",
    choices: { A: "Slimane Nebchi", B: "Slimane Kassa", C: "Slimane Allache", D: "Slimane Mokadem" },
    correct: "A",
    theme: "Musique",
  },
  {
    id: "music-9",
    question: "Combien de membres composaient le groupe Daft Punk ?",
    choices: { A: "1", B: "2", C: "3", D: "4" },
    correct: "B",
    theme: "Musique",
  },
  {
    id: "music-10",
    question: "Quel rappeur a popularisé le mouvement 'plk' dans le rap français ?",
    choices: { A: "PLK", B: "Maes", C: "Niska", D: "SCH" },
    correct: "A",
    theme: "Musique",
  },

  // ════════════════════════════════════════════════════════════════
  // ─── NOUVEAU THÈME : CINÉMA & SÉRIES (10 questions) ───
  // ════════════════════════════════════════════════════════════════
  {
    id: "cine-1",
    question: "Quel acteur joue Iron Man dans le Marvel Cinematic Universe ?",
    choices: { A: "Chris Evans", B: "Robert Downey Jr.", C: "Mark Ruffalo", D: "Chris Hemsworth" },
    correct: "B",
    theme: "Cinéma",
  },
  {
    id: "cine-2",
    question: "Dans quelle ville se déroule la série Breaking Bad ?",
    choices: { A: "Phoenix", B: "Albuquerque", C: "El Paso", D: "Las Vegas" },
    correct: "B",
    theme: "Cinéma",
  },
  {
    id: "cine-3",
    question: "Quel film a remporté l'Oscar du meilleur film en 2020 ?",
    choices: { A: "1917", B: "Joker", C: "Parasite", D: "Once Upon a Time in Hollywood" },
    correct: "C",
    theme: "Cinéma",
  },
  {
    id: "cine-4",
    question: "Qui a réalisé le film Inception ?",
    choices: {
      A: "Steven Spielberg",
      B: "Christopher Nolan",
      C: "James Cameron",
      D: "Martin Scorsese",
    },
    correct: "B",
    theme: "Cinéma",
  },
  {
    id: "cine-5",
    question: "Dans la série Squid Game, combien de joueurs participent au départ ?",
    choices: { A: "356", B: "456", C: "556", D: "656" },
    correct: "B",
    theme: "Cinéma",
  },
  {
    id: "cine-6",
    question: "Quel acteur joue Jack dans le film Titanic ?",
    choices: { A: "Brad Pitt", B: "Leonardo DiCaprio", C: "Matt Damon", D: "Tom Cruise" },
    correct: "B",
    theme: "Cinéma",
  },
  {
    id: "cine-7",
    question: "Quel est le titre du premier film Harry Potter ?",
    choices: {
      A: "La Chambre des Secrets",
      B: "La Coupe de Feu",
      C: "À l'École des Sorciers",
      D: "Le Prince de Sang-Mêlé",
    },
    correct: "C",
    theme: "Cinéma",
  },
  {
    id: "cine-8",
    question: "Dans Game of Thrones, quelle famille a pour devise 'Winter is coming' ?",
    choices: { A: "Lannister", B: "Targaryen", C: "Stark", D: "Baratheon" },
    correct: "C",
    theme: "Cinéma",
  },
  {
    id: "cine-9",
    question: "Quel est le surnom de l'acteur Vin Diesel dans la saga Fast & Furious ?",
    choices: { A: "Dom", B: "Brian", C: "Hobbs", D: "Letty" },
    correct: "A",
    theme: "Cinéma",
  },
  {
    id: "cine-10",
    question: "Quel film d'animation Pixar parle d'un cuisinier rat ?",
    choices: { A: "Les Indestructibles", B: "Ratatouille", C: "Là-haut", D: "Vice-Versa" },
    correct: "B",
    theme: "Cinéma",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AJOUTS 07/2026 — +48 questions (8/thème) : retour playtest "on fait
  // vite le tour". Combiné au tirage mélangé (questionOrder), la banque
  // passe de 60 à 108 questions. Faits stables et vérifiables uniquement.
  // ═══════════════════════════════════════════════════════════════════════

  // ─── CULTURE GÉNÉRALE (suite) ───
  {
    id: "cg-11",
    question: "Quel est le plus long fleuve entièrement en France ?",
    choices: { A: "La Seine", B: "La Loire", C: "Le Rhône", D: "La Garonne" },
    correct: "B",
    theme: "Culture G",
  },
  {
    id: "cg-12",
    question: "Quelle planète est la plus proche du Soleil ?",
    choices: { A: "Vénus", B: "Mars", C: "Mercure", D: "Jupiter" },
    correct: "C",
    theme: "Culture G",
  },
  {
    id: "cg-13",
    question: "En quelle année le mur de Berlin est-il tombé ?",
    choices: { A: "1985", B: "1989", C: "1991", D: "1993" },
    correct: "B",
    theme: "Culture G",
  },
  {
    id: "cg-14",
    question: "Quel est l'os le plus long du corps humain ?",
    choices: { A: "Le tibia", B: "L'humérus", C: "Le fémur", D: "Le radius" },
    correct: "C",
    theme: "Culture G",
  },
  {
    id: "cg-15",
    question: "Quelle est la capitale du Canada ?",
    choices: { A: "Toronto", B: "Vancouver", C: "Montréal", D: "Ottawa" },
    correct: "D",
    theme: "Culture G",
  },
  {
    id: "cg-16",
    question: "Qui a peint « La Nuit étoilée » ?",
    choices: { A: "Claude Monet", B: "Vincent van Gogh", C: "Pablo Picasso", D: "Salvador Dalí" },
    correct: "B",
    theme: "Culture G",
  },
  {
    id: "cg-17",
    question: "Quel gaz les plantes absorbent-elles pour la photosynthèse ?",
    choices: { A: "L'oxygène", B: "L'azote", C: "Le dioxyde de carbone", D: "L'hydrogène" },
    correct: "C",
    theme: "Culture G",
  },
  {
    id: "cg-18",
    question: "Combien de pays partagent une frontière terrestre avec la France métropolitaine ?",
    choices: { A: "6", B: "8", C: "10", D: "4" },
    correct: "B",
    theme: "Culture G",
  },

  // ─── SPORT (suite) ───
  {
    id: "sport-11",
    question: "Combien de joueurs d'une équipe de basket sont sur le terrain ?",
    choices: { A: "5", B: "6", C: "7", D: "4" },
    correct: "A",
    theme: "Sport",
  },
  {
    id: "sport-12",
    question: "Quel pays a remporté la Coupe du monde de football 2022 ?",
    choices: { A: "La France", B: "Le Brésil", C: "L'Argentine", D: "L'Allemagne" },
    correct: "C",
    theme: "Sport",
  },
  {
    id: "sport-13",
    question: "Quelle est la distance officielle d'un marathon ?",
    choices: { A: "40 km", B: "42,195 km", C: "45,5 km", D: "38,2 km" },
    correct: "B",
    theme: "Sport",
  },
  {
    id: "sport-14",
    question: "Dans quel sport utilise-t-on un volant ?",
    choices: { A: "Le squash", B: "Le padel", C: "Le badminton", D: "La pelote basque" },
    correct: "C",
    theme: "Sport",
  },
  {
    id: "sport-15",
    question: "Combien de points vaut un essai au rugby à XV ?",
    choices: { A: "3", B: "5", C: "7", D: "4" },
    correct: "B",
    theme: "Sport",
  },
  {
    id: "sport-16",
    question: "Quel club Zinédine Zidane a-t-il entraîné ?",
    choices: { A: "Le Real Madrid", B: "La Juventus", C: "L'OM", D: "Le PSG" },
    correct: "A",
    theme: "Sport",
  },
  {
    id: "sport-17",
    question: "Tous les combien d'années ont lieu les Jeux olympiques d'été ?",
    choices: { A: "2 ans", B: "3 ans", C: "4 ans", D: "5 ans" },
    correct: "C",
    theme: "Sport",
  },
  {
    id: "sport-18",
    question: "Au tennis, comment appelle-t-on un score de zéro ?",
    choices: { A: "Nul", B: "Zéro", C: "Blanc", D: "Love" },
    correct: "D",
    theme: "Sport",
  },

  // ─── AMIENS (suite) ───
  {
    id: "amiens-11",
    question: "Quel écrivain célèbre a vécu plus de 30 ans à Amiens ?",
    choices: { A: "Victor Hugo", B: "Jules Verne", C: "Émile Zola", D: "Alexandre Dumas" },
    correct: "B",
    theme: "Amiens",
  },
  {
    id: "amiens-12",
    question: "Comment s'appellent les jardins flottants d'Amiens ?",
    choices: { A: "Les Hortillonnages", B: "Les Floralies", C: "Les Jardinets", D: "Les Marais verts" },
    correct: "A",
    theme: "Amiens",
  },
  {
    id: "amiens-13",
    question: "La cathédrale d'Amiens est la plus … de France.",
    choices: { A: "Ancienne", B: "Haute", C: "Vaste", D: "Visitée" },
    correct: "C",
    theme: "Amiens",
  },
  {
    id: "amiens-14",
    question: "Quelle spécialité sucrée est typique d'Amiens ?",
    choices: { A: "Le macaron", B: "Le calisson", C: "La bêtise", D: "Le canelé" },
    correct: "A",
    theme: "Amiens",
  },
  {
    id: "amiens-15",
    question: "Quel cours d'eau traverse Amiens ?",
    choices: { A: "L'Oise", B: "La Somme", C: "L'Authie", D: "La Bresle" },
    correct: "B",
    theme: "Amiens",
  },
  {
    id: "amiens-16",
    question: "Comment s'appelle le quartier des canaux d'Amiens ?",
    choices: { A: "Saint-Leu", B: "Saint-Pierre", C: "Henriville", D: "Saint-Maurice" },
    correct: "A",
    theme: "Amiens",
  },
  {
    id: "amiens-17",
    question: "Quel spectacle illumine la cathédrale d'Amiens en couleurs ?",
    choices: { A: "Lumina", B: "Chroma", C: "Prisma", D: "Aurora" },
    correct: "B",
    theme: "Amiens",
  },
  {
    id: "amiens-18",
    question: "Dans quel département se trouve Amiens ?",
    choices: { A: "L'Oise (60)", B: "L'Aisne (02)", C: "La Somme (80)", D: "Le Nord (59)" },
    correct: "C",
    theme: "Amiens",
  },

  // ─── GAMING (suite) ───
  {
    id: "gaming-11",
    question: "Quel est le héros de la saga The Legend of Zelda ?",
    choices: { A: "Zelda", B: "Link", C: "Ganon", D: "Epona" },
    correct: "B",
    theme: "Gaming",
  },
  {
    id: "gaming-12",
    question: "Quelle entreprise fabrique la PlayStation ?",
    choices: { A: "Microsoft", B: "Nintendo", C: "Sony", D: "Sega" },
    correct: "C",
    theme: "Gaming",
  },
  {
    id: "gaming-13",
    question: "Quel est le jeu vidéo le plus vendu de l'histoire ?",
    choices: { A: "GTA V", B: "Tetris", C: "Minecraft", D: "Wii Sports" },
    correct: "C",
    theme: "Gaming",
  },
  {
    id: "gaming-14",
    question: "Quel est le métier de Mario chez Nintendo ?",
    choices: { A: "Plombier", B: "Menuisier", C: "Électricien", D: "Cuisinier" },
    correct: "A",
    theme: "Gaming",
  },
  {
    id: "gaming-15",
    question: "Dans quel battle royale saute-t-on d'un bus volant ?",
    choices: { A: "Apex Legends", B: "Warzone", C: "Fortnite", D: "PUBG" },
    correct: "C",
    theme: "Gaming",
  },
  {
    id: "gaming-16",
    question: "Ryu et Chun-Li sont des personnages de…",
    choices: { A: "Tekken", B: "Street Fighter", C: "Mortal Kombat", D: "KOF" },
    correct: "B",
    theme: "Gaming",
  },
  {
    id: "gaming-17",
    question: "Quelle console Nintendo se joue en portable ET sur TV ?",
    choices: { A: "La Wii U", B: "La 3DS", C: "La Switch", D: "La GameCube" },
    correct: "C",
    theme: "Gaming",
  },
  {
    id: "gaming-18",
    question: "Dans Pokémon, comment s'appelle le félin parlant de la Team Rocket ?",
    choices: { A: "Miaouss", B: "Évoli", C: "Rondoudou", D: "Psykokwak" },
    correct: "A",
    theme: "Gaming",
  },

  // ─── MUSIQUE (suite) ───
  {
    id: "music-11",
    question: "Combien de cordes possède une guitare classique ?",
    choices: { A: "4", B: "5", C: "6", D: "7" },
    correct: "C",
    theme: "Musique",
  },
  {
    id: "music-12",
    question: "Qui est surnommé le « King of Pop » ?",
    choices: { A: "Prince", B: "Michael Jackson", C: "Elvis Presley", D: "Stevie Wonder" },
    correct: "B",
    theme: "Musique",
  },
  {
    id: "music-13",
    question: "De quel pays vient le groupe ABBA ?",
    choices: { A: "Norvège", B: "Danemark", C: "Suède", D: "Finlande" },
    correct: "C",
    theme: "Musique",
  },
  {
    id: "music-14",
    question: "Quel DJ français a produit le titre « Titanium » ?",
    choices: { A: "DJ Snake", B: "David Guetta", C: "Martin Solveig", D: "Bob Sinclar" },
    correct: "B",
    theme: "Musique",
  },
  {
    id: "music-15",
    question: "Quel compositeur a continué à créer alors qu'il devenait sourd ?",
    choices: { A: "Mozart", B: "Bach", C: "Chopin", D: "Beethoven" },
    correct: "D",
    theme: "Musique",
  },
  {
    id: "music-16",
    question: "Quel tube a lancé la carrière d'Aya Nakamura ?",
    choices: { A: "Djadja", B: "Copines", C: "Pookie", D: "Jolie Nana" },
    correct: "A",
    theme: "Musique",
  },
  {
    id: "music-17",
    question: "Quel groupe anglais a enregistré « Bohemian Rhapsody » ?",
    choices: { A: "The Beatles", B: "Queen", C: "The Rolling Stones", D: "Pink Floyd" },
    correct: "B",
    theme: "Musique",
  },
  {
    id: "music-18",
    question: "Combien de notes différentes compte la gamme de do majeur ?",
    choices: { A: "5", B: "6", C: "7", D: "8" },
    correct: "C",
    theme: "Musique",
  },

  // ─── CINÉMA (suite) ───
  {
    id: "cine-11",
    question: "Qui a réalisé « Titanic » et « Avatar » ?",
    choices: { A: "Steven Spielberg", B: "James Cameron", C: "Ridley Scott", D: "Christopher Nolan" },
    correct: "B",
    theme: "Cinéma",
  },
  {
    id: "cine-12",
    question: "Quel acteur incarne le capitaine Jack Sparrow ?",
    choices: { A: "Orlando Bloom", B: "Johnny Depp", C: "Brad Pitt", D: "Keanu Reeves" },
    correct: "B",
    theme: "Cinéma",
  },
  {
    id: "cine-13",
    question: "Dans quelle saga croise-t-on Dark Vador ?",
    choices: { A: "Star Trek", B: "Dune", C: "Star Wars", D: "Alien" },
    correct: "C",
    theme: "Cinéma",
  },
  {
    id: "cine-14",
    question: "Quel studio d'animation a créé « Toy Story » ?",
    choices: { A: "DreamWorks", B: "Pixar", C: "Illumination", D: "Ghibli" },
    correct: "B",
    theme: "Cinéma",
  },
  {
    id: "cine-15",
    question: "Quel film détient le record du box-office mondial ?",
    choices: { A: "Avengers: Endgame", B: "Titanic", C: "Avatar", D: "Star Wars VII" },
    correct: "C",
    theme: "Cinéma",
  },
  {
    id: "cine-16",
    question: "Quelle est la récompense suprême du Festival de Cannes ?",
    choices: { A: "Le Lion d'or", B: "L'Ours d'or", C: "La Palme d'or", D: "Le César d'or" },
    correct: "C",
    theme: "Cinéma",
  },
  {
    id: "cine-17",
    question: "Qui joue aux côtés de François Cluzet dans « Intouchables » ?",
    choices: { A: "Omar Sy", B: "Jamel Debbouze", C: "Dany Boon", D: "Kad Merad" },
    correct: "A",
    theme: "Cinéma",
  },
  {
    id: "cine-18",
    question: "Comment s'appelle l'école de sorciers de Harry Potter ?",
    choices: { A: "Durmstrang", B: "Poudlard", C: "Beauxbâtons", D: "Salem" },
    correct: "B",
    theme: "Cinéma",
  },
];

/** Liste des thèmes disponibles (en ordre d'affichage dans le picker). */
export const QUIZ_THEMES = [
  "Mix", // Tous thèmes mélangés (défaut)
  "Culture G",
  "Sport",
  "Amiens",
  "Gaming",
  "Musique",
  "Cinéma",
] as const;
export type QuizTheme = (typeof QUIZ_THEMES)[number];

/**
 * Filtre les questions par thème.
 * "Mix" = toutes les questions. Sinon filtre par theme exact.
 */
export function getQuestionsByTheme(theme: QuizTheme): QuizQuestion[] {
  if (theme === "Mix") return QUIZ_QUESTIONS;
  return QUIZ_QUESTIONS.filter((q) => q.theme === theme);
}

/** Durée par défaut d'une question (en secondes). */
export const QUESTION_TIME_LIMIT_SEC = 20;
/** Durée d'affichage du reveal avant question suivante. */
export const REVEAL_DURATION_SEC = 5;

/** Choix proposés à l'hôte pour la longueur de partie (playtest 07/2026). */
export const QUIZ_NUM_QUESTIONS_CHOICES = [10, 15, 20, 30] as const;
/** Nombre de questions par défaut d'une partie. */
export const QUIZ_DEFAULT_NUM_QUESTIONS = 15;

/**
 * Vue minimale de l'état de session nécessaire pour résoudre une question.
 * Partagée par le SERVEUR (quiz-actions), la TV (HostQuizGame) et les
 * téléphones (PlayQuizGame) — c'était l'origine du bug de désynchronisation
 * playtest 07/2026 : le serveur notait sur la banque FILTRÉE par thème
 * pendant que les écrans lisaient QUIZ_QUESTIONS non filtré. Tout le monde
 * passe désormais par resolveQuestion() : une seule logique, zéro désync.
 */
export interface QuizStateView {
  questionIndex: number;
  theme?: QuizTheme;
  /**
   * Ordre de tirage : indices dans la banque filtrée par thème, mélangés au
   * lancement et TRONQUÉS au nombre de questions choisi. Stocké dans le
   * current_state de la session → tous les écrans jouent le même tirage.
   * Absent sur les vieilles sessions → fallback ordre naturel (rétro-compat).
   */
  questionOrder?: number[];
}

/** La banque de questions applicable à cet état (filtrée par thème). */
function getPool(state: Pick<QuizStateView, "theme">): QuizQuestion[] {
  return state.theme ? getQuestionsByTheme(state.theme) : QUIZ_QUESTIONS;
}

/** LA fonction : quelle question affiche-t-on / note-t-on pour cet état ? */
export function resolveQuestion(state: QuizStateView): QuizQuestion | null {
  const pool = getPool(state);
  const poolIndex = state.questionOrder?.[state.questionIndex] ?? state.questionIndex;
  return pool[poolIndex] ?? null;
}

/** Nombre total de questions de CETTE partie (pour "Question 3 / 15"). */
export function getTotalQuestions(
  state: Pick<QuizStateView, "theme" | "questionOrder">
): number {
  return state.questionOrder?.length ?? getPool(state).length;
}

/**
 * Construit un tirage aléatoire de `numQuestions` indices dans la banque du
 * thème (mélange de Fisher-Yates, le seul shuffle non biaisé — un
 * sort(() => Math.random() - 0.5) produit des permutations inéquitables).
 * Clampe au nombre de questions réellement disponibles pour le thème.
 * Bonus vs avant : chaque partie a un tirage différent — fini "les 15
 * premières questions à chaque fois".
 */
export function buildQuestionOrder(theme: QuizTheme, numQuestions: number): number[] {
  const pool = getQuestionsByTheme(theme);
  const indices = pool.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }
  return indices.slice(0, Math.max(1, Math.min(numQuestions, pool.length)));
}

/**
 * Calcule le score d'une réponse — combine 3 facteurs :
 *  1. Correctness : 0 si faux, sinon base score
 *  2. Vitesse temps : plus tu réponds vite, plus le score est haut (200→800)
 *  3. Ordre d'arrivée : bonus pour le 1er qui répond bien (+200), malus pour le dernier (-100)
 *
 * @param correct       Si la réponse est juste
 * @param elapsedMs     Temps écoulé entre la question et la réponse
 * @param rank          Ordre d'arrivée (1 = premier, totalPlayers = dernier)
 * @param totalPlayers  Nombre total de joueurs ayant répondu juste
 * @param timeLimitSec  Limite de temps (par défaut 20s)
 */
export function calculateScore(
  correct: boolean,
  elapsedMs: number,
  rank: number = 1,
  totalPlayers: number = 1,
  timeLimitSec: number = QUESTION_TIME_LIMIT_SEC
): number {
  if (!correct) return 0;

  // Score de base = 200, score max temps = 800 → fourchette 200→1000
  const timeLimitMs = timeLimitSec * 1000;
  const timeRatio = Math.max(0, Math.min(1, 1 - elapsedMs / timeLimitMs));
  const baseScore = 200 + Math.round(800 * timeRatio);

  // Bonus 1er qui répond juste (+200), malus dernier (-100), interpolation au milieu
  let positionBonus = 0;
  if (totalPlayers >= 2) {
    if (rank === 1) positionBonus = 200;
    else if (rank === totalPlayers) positionBonus = -100;
    else {
      // Interpolation linéaire pour les positions intermédiaires
      const positionRatio = (rank - 1) / (totalPlayers - 1);
      positionBonus = Math.round(200 - positionRatio * 300);
    }
  }

  return Math.max(0, baseScore + positionBonus);
}
