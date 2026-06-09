/**
 * Blind Test — Reconnais le morceau le plus vite (multi-choice).
 *
 * Source des extraits : iTunes Search API (gratuit, pas de clé requise).
 *   https://itunes.apple.com/search?term=despacito&limit=1&entity=song
 *
 * Réponse JSON contient :
 *   - previewUrl  : MP3 30s diffusable
 *   - artworkUrl100 (qu'on remplace par 600x600bb pour du HD)
 *   - trackName + artistName : pour le reveal
 *
 * Mécanique :
 *   - 12 morceaux par partie
 *   - 20s par morceau : on joue la preview, 4 boutons A/B/C/D
 *   - Mécanique cocher/changeable comme Quiz (1er clic timestamp figé)
 *   - Scoring vitesse + bonus 1er rang
 */

export interface BlindTrack {
  /** ID interne pour debug. */
  id: string;
  /** Query iTunes Search ("artiste + titre" donne les meilleurs résultats). */
  query: string;
  /** Bonne réponse affichée au reveal — titre lisible. */
  correctLabel: string;
  /** 3 leurres affichés à côté du bon. */
  decoys: [string, string, string];
  /** Thème (pour groupage visuel). */
  theme?: string;
}

/**
 * Banque V1 — 20 morceaux ULTRA reconnaissables (international + français).
 * Si une query iTunes ne renvoie pas de previewUrl (rare), le serveur la skip
 * et pioche une autre. Faut donc avoir plus de 12 morceaux dans la banque.
 */
export const BLIND_TRACKS: BlindTrack[] = [
  // ─── Hits internationaux ─────────────────────────────────────────────────
  {
    id: "despacito",
    query: "Luis Fonsi Despacito",
    correctLabel: "Despacito — Luis Fonsi",
    decoys: [
      "Bailando — Enrique Iglesias",
      "Mi Gente — J Balvin",
      "Échame La Culpa — Luis Fonsi",
    ],
    theme: "Latino",
  },
  {
    id: "blinding-lights",
    query: "The Weeknd Blinding Lights",
    correctLabel: "Blinding Lights — The Weeknd",
    decoys: [
      "Levitating — Dua Lipa",
      "Save Your Tears — The Weeknd",
      "Dance Monkey — Tones and I",
    ],
    theme: "Pop",
  },
  {
    id: "shape-of-you",
    query: "Ed Sheeran Shape of You",
    correctLabel: "Shape of You — Ed Sheeran",
    decoys: [
      "Perfect — Ed Sheeran",
      "Senorita — Shawn Mendes",
      "Closer — Chainsmokers",
    ],
    theme: "Pop",
  },
  {
    id: "bad-guy",
    query: "Billie Eilish Bad Guy",
    correctLabel: "Bad Guy — Billie Eilish",
    decoys: [
      "Ocean Eyes — Billie Eilish",
      "Driver's License — Olivia Rodrigo",
      "Royals — Lorde",
    ],
    theme: "Pop",
  },
  {
    id: "old-town-road",
    query: "Lil Nas X Old Town Road",
    correctLabel: "Old Town Road — Lil Nas X",
    decoys: [
      "Industry Baby — Lil Nas X",
      "Sicko Mode — Travis Scott",
      "Lucid Dreams — Juice WRLD",
    ],
    theme: "Hip-Hop",
  },
  {
    id: "dance-monkey",
    query: "Tones and I Dance Monkey",
    correctLabel: "Dance Monkey — Tones and I",
    decoys: [
      "Lovely — Billie Eilish",
      "Watermelon Sugar — Harry Styles",
      "Memories — Maroon 5",
    ],
    theme: "Pop",
  },

  // ─── Classiques rock / variété ──────────────────────────────────────────
  {
    id: "bohemian-rhapsody",
    query: "Queen Bohemian Rhapsody",
    correctLabel: "Bohemian Rhapsody — Queen",
    decoys: [
      "Stairway to Heaven — Led Zeppelin",
      "Hotel California — Eagles",
      "Sweet Child O' Mine — Guns N' Roses",
    ],
    theme: "Classique rock",
  },
  {
    id: "billie-jean",
    query: "Michael Jackson Billie Jean",
    correctLabel: "Billie Jean — Michael Jackson",
    decoys: [
      "Beat It — Michael Jackson",
      "Smooth Criminal — Michael Jackson",
      "Bad — Michael Jackson",
    ],
    theme: "Classique pop",
  },
  {
    id: "wonderwall",
    query: "Oasis Wonderwall",
    correctLabel: "Wonderwall — Oasis",
    decoys: [
      "Don't Look Back in Anger — Oasis",
      "Champagne Supernova — Oasis",
      "Creep — Radiohead",
    ],
    theme: "Classique rock",
  },
  {
    id: "smells-like-teen-spirit",
    query: "Nirvana Smells Like Teen Spirit",
    correctLabel: "Smells Like Teen Spirit — Nirvana",
    decoys: [
      "Come As You Are — Nirvana",
      "In Bloom — Nirvana",
      "Black Hole Sun — Soundgarden",
    ],
    theme: "Classique rock",
  },

  // ─── Rap / Hip-Hop FR ───────────────────────────────────────────────────
  {
    id: "jul-bande-organisee",
    query: "Bande Organisée 13 Organisé",
    correctLabel: "Bande Organisée — 13 Organisé",
    decoys: [
      "Boumboum — Jul",
      "DZ Mafia — Hooss",
      "Tchikita — Jul",
    ],
    theme: "Rap FR",
  },
  {
    id: "soolking-liberte",
    query: "Soolking Liberté",
    correctLabel: "Liberté — Soolking",
    decoys: [
      "Dalida — Soolking",
      "Suavemente — Soolking",
      "Guerilla — Soolking",
    ],
    theme: "Rap FR",
  },
  {
    id: "orelsan-basique",
    query: "Orelsan Basique",
    correctLabel: "Basique — Orelsan",
    decoys: [
      "La terre est ronde — Orelsan",
      "Suicide social — Orelsan",
      "Tout va bien — Orelsan",
    ],
    theme: "Rap FR",
  },
  {
    id: "ninho-mariposa",
    query: "Ninho Mariposa",
    correctLabel: "Mariposa — Ninho",
    decoys: [
      "Lettre à une femme — Ninho",
      "Maman ne le sait pas — Ninho",
      "Sorbet citron — Ninho",
    ],
    theme: "Rap FR",
  },
  {
    id: "maes-madrina",
    query: "Maes Madrina",
    correctLabel: "Madrina — Maes",
    decoys: [
      "DESPRI — Maes",
      "Blanche — Maes",
      "Pyrex — Maes",
    ],
    theme: "Rap FR",
  },

  // ─── Variété FR / pop FR ────────────────────────────────────────────────
  {
    id: "stromae-alors-on-danse",
    query: "Stromae Alors on danse",
    correctLabel: "Alors on danse — Stromae",
    decoys: [
      "Papaoutai — Stromae",
      "Formidable — Stromae",
      "Tous les mêmes — Stromae",
    ],
    theme: "Variété FR",
  },
  {
    id: "aya-nakamura-djadja",
    query: "Aya Nakamura Djadja",
    correctLabel: "Djadja — Aya Nakamura",
    decoys: [
      "Pookie — Aya Nakamura",
      "Copines — Aya Nakamura",
      "Comportement — Aya Nakamura",
    ],
    theme: "Variété FR",
  },
  {
    id: "angele-balance-ton-quoi",
    query: "Angèle Balance Ton Quoi",
    correctLabel: "Balance ton quoi — Angèle",
    decoys: [
      "Bruxelles je t'aime — Angèle",
      "La loi de Murphy — Angèle",
      "Tout oublier — Angèle",
    ],
    theme: "Variété FR",
  },

  // ─── Anciens classiques toujours sing-along ─────────────────────────────
  {
    id: "abba-dancing-queen",
    query: "ABBA Dancing Queen",
    correctLabel: "Dancing Queen — ABBA",
    decoys: ["Waterloo — ABBA", "Mamma Mia — ABBA", "Take a Chance on Me — ABBA"],
    theme: "Disco",
  },
  {
    id: "africa-toto",
    query: "Toto Africa",
    correctLabel: "Africa — Toto",
    decoys: ["Sweet Dreams — Eurythmics", "Take On Me — A-ha", "Don't Stop Believin' — Journey"],
    theme: "80s",
  },

  // ─── 80s INTERNATIONAL ──────────────────────────────────────────────────
  {
    id: "thriller-mj",
    query: "Michael Jackson Thriller",
    correctLabel: "Thriller — Michael Jackson",
    decoys: ["Beat It — Michael Jackson", "Bad — Michael Jackson", "Don't Stop Til You Get Enough — Michael Jackson"],
    theme: "80s",
  },
  {
    id: "take-on-me",
    query: "A-ha Take On Me",
    correctLabel: "Take On Me — A-ha",
    decoys: ["Sweet Dreams — Eurythmics", "Tainted Love — Soft Cell", "Eye of the Tiger — Survivor"],
    theme: "80s",
  },
  {
    id: "every-breath",
    query: "The Police Every Breath You Take",
    correctLabel: "Every Breath You Take — The Police",
    decoys: ["Roxanne — The Police", "With or Without You — U2", "Wonderful Tonight — Eric Clapton"],
    theme: "80s",
  },
  {
    id: "like-a-virgin",
    query: "Madonna Like a Virgin",
    correctLabel: "Like a Virgin — Madonna",
    decoys: ["Material Girl — Madonna", "Vogue — Madonna", "Holiday — Madonna"],
    theme: "80s",
  },
  {
    id: "purple-rain",
    query: "Prince Purple Rain",
    correctLabel: "Purple Rain — Prince",
    decoys: ["Kiss — Prince", "When Doves Cry — Prince", "1999 — Prince"],
    theme: "80s",
  },
  {
    id: "livin-on-a-prayer",
    query: "Bon Jovi Livin on a Prayer",
    correctLabel: "Livin' on a Prayer — Bon Jovi",
    decoys: ["You Give Love a Bad Name — Bon Jovi", "Wanted Dead or Alive — Bon Jovi", "It's My Life — Bon Jovi"],
    theme: "80s",
  },

  // ─── 90s INTERNATIONAL ──────────────────────────────────────────────────
  {
    id: "no-scrubs",
    query: "TLC No Scrubs",
    correctLabel: "No Scrubs — TLC",
    decoys: ["Waterfalls — TLC", "Wannabe — Spice Girls", "Baby One More Time — Britney Spears"],
    theme: "90s",
  },
  {
    id: "baby-one-more",
    query: "Britney Spears Baby One More Time",
    correctLabel: "...Baby One More Time — Britney Spears",
    decoys: ["Oops!... I Did It Again — Britney Spears", "Toxic — Britney Spears", "Genie in a Bottle — Christina Aguilera"],
    theme: "90s",
  },
  {
    id: "wonderwall-oasis-dupe",
    query: "Spice Girls Wannabe",
    correctLabel: "Wannabe — Spice Girls",
    decoys: ["Say You'll Be There — Spice Girls", "MMMBop — Hanson", "Believe — Cher"],
    theme: "90s",
  },
  {
    id: "gangsta-paradise",
    query: "Coolio Gangsta's Paradise",
    correctLabel: "Gangsta's Paradise — Coolio",
    decoys: ["California Love — 2Pac", "Mo Money Mo Problems — Notorious BIG", "Killing Me Softly — Fugees"],
    theme: "90s",
  },
  {
    id: "macarena",
    query: "Los del Rio Macarena",
    correctLabel: "Macarena — Los del Río",
    decoys: ["La Bamba — Ritchie Valens", "Bamboleo — Gipsy Kings", "La Camisa Negra — Juanes"],
    theme: "90s",
  },
  {
    id: "i-want-it-that-way",
    query: "Backstreet Boys I Want It That Way",
    correctLabel: "I Want It That Way — Backstreet Boys",
    decoys: ["Bye Bye Bye — NSYNC", "Everybody — Backstreet Boys", "Tearin' Up My Heart — NSYNC"],
    theme: "90s",
  },

  // ─── 2000s INTERNATIONAL ────────────────────────────────────────────────
  {
    id: "in-da-club",
    query: "50 Cent In Da Club",
    correctLabel: "In Da Club — 50 Cent",
    decoys: ["Candy Shop — 50 Cent", "Hot in Herre — Nelly", "Get Low — Lil Jon"],
    theme: "2000s",
  },
  {
    id: "umbrella",
    query: "Rihanna Umbrella",
    correctLabel: "Umbrella — Rihanna",
    decoys: ["Don't Stop the Music — Rihanna", "Disturbia — Rihanna", "We Belong Together — Mariah Carey"],
    theme: "2000s",
  },
  {
    id: "crazy-in-love",
    query: "Beyonce Crazy in Love",
    correctLabel: "Crazy in Love — Beyoncé",
    decoys: ["Single Ladies — Beyoncé", "Halo — Beyoncé", "Irreplaceable — Beyoncé"],
    theme: "2000s",
  },
  {
    id: "viva-la-vida",
    query: "Coldplay Viva la Vida",
    correctLabel: "Viva la Vida — Coldplay",
    decoys: ["Yellow — Coldplay", "Fix You — Coldplay", "The Scientist — Coldplay"],
    theme: "2000s",
  },
  {
    id: "lose-yourself",
    query: "Eminem Lose Yourself",
    correctLabel: "Lose Yourself — Eminem",
    decoys: ["Without Me — Eminem", "The Real Slim Shady — Eminem", "Stan — Eminem"],
    theme: "2000s",
  },
  {
    id: "mr-brightside",
    query: "The Killers Mr Brightside",
    correctLabel: "Mr. Brightside — The Killers",
    decoys: ["Somebody Told Me — The Killers", "Use Somebody — Kings of Leon", "Seven Nation Army — White Stripes"],
    theme: "2000s",
  },

  // ─── 2010s INTERNATIONAL ────────────────────────────────────────────────
  {
    id: "rolling-deep",
    query: "Adele Rolling in the Deep",
    correctLabel: "Rolling in the Deep — Adele",
    decoys: ["Someone Like You — Adele", "Hello — Adele", "Skyfall — Adele"],
    theme: "2010s",
  },
  {
    id: "happy-pharrell",
    query: "Pharrell Williams Happy",
    correctLabel: "Happy — Pharrell Williams",
    decoys: ["Get Lucky — Daft Punk", "Uptown Funk — Mark Ronson", "Blurred Lines — Robin Thicke"],
    theme: "2010s",
  },
  {
    id: "uptown-funk",
    query: "Mark Ronson Uptown Funk Bruno Mars",
    correctLabel: "Uptown Funk — Mark Ronson ft. Bruno Mars",
    decoys: ["24K Magic — Bruno Mars", "Treasure — Bruno Mars", "Locked Out of Heaven — Bruno Mars"],
    theme: "2010s",
  },
  {
    id: "see-you-again",
    query: "Wiz Khalifa See You Again Charlie Puth",
    correctLabel: "See You Again — Wiz Khalifa ft. Charlie Puth",
    decoys: ["Counting Stars — OneRepublic", "Stitches — Shawn Mendes", "Let Her Go — Passenger"],
    theme: "2010s",
  },
  {
    id: "havana",
    query: "Camila Cabello Havana",
    correctLabel: "Havana — Camila Cabello",
    decoys: ["Senorita — Shawn Mendes", "Bad Habits — Ed Sheeran", "Don't Start Now — Dua Lipa"],
    theme: "2010s",
  },

  // ─── 2020s INTERNATIONAL ────────────────────────────────────────────────
  {
    id: "levitating",
    query: "Dua Lipa Levitating",
    correctLabel: "Levitating — Dua Lipa",
    decoys: ["Don't Start Now — Dua Lipa", "Physical — Dua Lipa", "New Rules — Dua Lipa"],
    theme: "2020s",
  },
  {
    id: "drivers-license",
    query: "Olivia Rodrigo Drivers License",
    correctLabel: "Drivers License — Olivia Rodrigo",
    decoys: ["Good 4 U — Olivia Rodrigo", "Deja Vu — Olivia Rodrigo", "Vampire — Olivia Rodrigo"],
    theme: "2020s",
  },
  {
    id: "as-it-was",
    query: "Harry Styles As It Was",
    correctLabel: "As It Was — Harry Styles",
    decoys: ["Watermelon Sugar — Harry Styles", "Adore You — Harry Styles", "Anti-Hero — Taylor Swift"],
    theme: "2020s",
  },
  {
    id: "flowers-miley",
    query: "Miley Cyrus Flowers",
    correctLabel: "Flowers — Miley Cyrus",
    decoys: ["Wrecking Ball — Miley Cyrus", "Cruel Summer — Taylor Swift", "Espresso — Sabrina Carpenter"],
    theme: "2020s",
  },

  // ─── FRANÇAIS — années 90/2000 ──────────────────────────────────────────
  {
    id: "encore-un-soir",
    query: "Céline Dion Pour que tu m'aimes encore",
    correctLabel: "Pour que tu m'aimes encore — Céline Dion",
    decoys: ["Je sais pas — Céline Dion", "S'il suffisait d'aimer — Céline Dion", "Tous les hommes — Pascal Obispo"],
    theme: "Variété FR",
  },
  {
    id: "alors-on-danse-dupe",
    query: "Indochine J'ai demandé à la lune",
    correctLabel: "J'ai demandé à la lune — Indochine",
    decoys: ["L'aventurier — Indochine", "Trois nuits par semaine — Indochine", "Tata Yoyo — Annie Cordy"],
    theme: "Variété FR",
  },
  {
    id: "jean-jacques-goldman",
    query: "Jean-Jacques Goldman Quand la musique est bonne",
    correctLabel: "Quand la musique est bonne — Jean-Jacques Goldman",
    decoys: ["Famille — Jean-Jacques Goldman", "On ira — Jean-Jacques Goldman", "Encore un matin — Jean-Jacques Goldman"],
    theme: "Variété FR",
  },
  {
    id: "manu-chao",
    query: "Manu Chao Bongo Bong",
    correctLabel: "Bongo Bong — Manu Chao",
    decoys: ["Clandestino — Manu Chao", "Me Gustas Tu — Manu Chao", "Welcome to Tijuana — Manu Chao"],
    theme: "Variété FR",
  },
  {
    id: "jenifer-au-soleil",
    query: "Jenifer Au soleil",
    correctLabel: "Au soleil — Jenifer",
    decoys: ["Donne-moi le temps — Jenifer", "Comme un hic — Jenifer", "Tourner la page — Jenifer"],
    theme: "Variété FR",
  },

  // ─── RAP FR — 2000s / 2010s / 2020s additionnels ───────────────────────
  {
    id: "iam-petit-frere",
    query: "IAM Petit Frère",
    correctLabel: "Petit Frère — IAM",
    decoys: ["L'École du micro d'argent — IAM", "Demain c'est loin — IAM", "Nés sous la même étoile — IAM"],
    theme: "Rap FR",
  },
  {
    id: "ntm-laisse-pas-trainer",
    query: "NTM Laisse Pas Trainer Ton Fils",
    correctLabel: "Laisse pas traîner ton fils — NTM",
    decoys: ["Pose Ton Gun — NTM", "Ma Benz — NTM", "Police — NTM"],
    theme: "Rap FR",
  },
  {
    id: "diam-jeune-demoiselle",
    query: "Diam's Jeune demoiselle",
    correctLabel: "Jeune Demoiselle — Diam's",
    decoys: ["La boulette — Diam's", "Confessions Nocturnes — Diam's", "Marine — Diam's"],
    theme: "Rap FR",
  },
  {
    id: "booba-orphelin",
    query: "Booba Orphelin",
    correctLabel: "Validé — Booba",
    decoys: ["DKR — Booba", "Pinocchio — Booba", "Ratpi World — Booba"],
    theme: "Rap FR",
  },
  {
    id: "pnl-au-ddt",
    query: "PNL Au DD",
    correctLabel: "Au DD — PNL",
    decoys: ["Bené — PNL", "Onizuka — PNL", "À l'ammoniaque — PNL"],
    theme: "Rap FR",
  },
  {
    id: "damso-julien",
    query: "Damso Julien",
    correctLabel: "Julien — Damso",
    decoys: ["Macarena — Damso", "Smatchaaa — Damso", "Bruxelles vie — Damso"],
    theme: "Rap FR",
  },
  {
    id: "sch-mort-de-rire",
    query: "SCH Mort de Rire",
    correctLabel: "Mort de Rire — SCH",
    decoys: ["A7 — SCH", "Cartine cartouche — SCH", "Jvbjr — SCH"],
    theme: "Rap FR",
  },
  {
    id: "jul-tchikita",
    query: "Jul Tchikita",
    correctLabel: "Tchikita — Jul",
    decoys: ["Coup de Pression — Jul", "Mon Bijou — Jul", "Wesh Alors — Jul"],
    theme: "Rap FR",
  },
  {
    id: "lacrim-corleone",
    query: "Lacrim Corleone",
    correctLabel: "Corleone — Lacrim",
    decoys: ["AWA — Lacrim", "R.I.P.R.O — Lacrim", "Force et Honneur — Lacrim"],
    theme: "Rap FR",
  },
  {
    id: "naps-best-life",
    query: "Naps La Best Life",
    correctLabel: "La Best Life — Naps",
    decoys: ["Pochon bleu — Naps", "Sale Affaire — Naps", "Si je l'avais su — Naps"],
    theme: "Rap FR",
  },
  {
    id: "vald-lucy",
    query: "Vald Lucy",
    correctLabel: "Désaccordé — Vald",
    decoys: ["Megadose — Vald", "Le sale — Vald", "Eurotrap — Vald"],
    theme: "Rap FR",
  },
  {
    id: "tiakola-meuda",
    query: "Tiakola Meuda",
    correctLabel: "Meuda — Tiakola",
    decoys: ["Dis-moi — Tiakola", "Vraie Vie — Tiakola", "Bling Bling — Tiakola"],
    theme: "Rap FR",
  },

  // ─── CULTES / GÉNÉRIQUES / BIZARRES ────────────────────────────────────
  {
    id: "we-will-rock-you",
    query: "Queen We Will Rock You",
    correctLabel: "We Will Rock You — Queen",
    decoys: ["We Are the Champions — Queen", "Don't Stop Me Now — Queen", "Another One Bites the Dust — Queen"],
    theme: "Culte",
  },
  {
    id: "eye-of-the-tiger",
    query: "Survivor Eye of the Tiger",
    correctLabel: "Eye of the Tiger — Survivor",
    decoys: ["Final Countdown — Europe", "We Are the Champions — Queen", "I Need a Hero — Bonnie Tyler"],
    theme: "Culte",
  },
  {
    id: "macho-man",
    query: "Village People YMCA",
    correctLabel: "Y.M.C.A. — Village People",
    decoys: ["In the Navy — Village People", "Macho Man — Village People", "Go West — Village People"],
    theme: "Culte",
  },
  {
    id: "barbie-girl",
    query: "Aqua Barbie Girl",
    correctLabel: "Barbie Girl — Aqua",
    decoys: ["Cotton Eye Joe — Rednex", "Mambo No. 5 — Lou Bega", "Saturday Night — Whigfield"],
    theme: "Culte",
  },
  {
    id: "gangnam-style",
    query: "PSY Gangnam Style",
    correctLabel: "Gangnam Style — PSY",
    decoys: ["Harlem Shake — Baauer", "What Does the Fox Say — Ylvis", "Kung Fu Fighting — Carl Douglas"],
    theme: "Culte",
  },
  {
    id: "what-is-love",
    query: "Haddaway What Is Love",
    correctLabel: "What Is Love — Haddaway",
    decoys: ["Rhythm Is a Dancer — Snap!", "Be My Lover — La Bouche", "Mr. Vain — Culture Beat"],
    theme: "Culte 90s",
  },

  // ─── REGGAE / LATIN / FUNK ──────────────────────────────────────────────
  {
    id: "no-woman-no-cry",
    query: "Bob Marley No Woman No Cry",
    correctLabel: "No Woman, No Cry — Bob Marley",
    decoys: ["Three Little Birds — Bob Marley", "Buffalo Soldier — Bob Marley", "Could You Be Loved — Bob Marley"],
    theme: "Reggae",
  },
  {
    id: "mi-gente",
    query: "J Balvin Mi Gente",
    correctLabel: "Mi Gente — J Balvin",
    decoys: ["Despacito — Luis Fonsi", "Bailando — Enrique Iglesias", "Taki Taki — DJ Snake"],
    theme: "Latino",
  },
  {
    id: "la-camisa-negra",
    query: "Juanes La Camisa Negra",
    correctLabel: "La Camisa Negra — Juanes",
    decoys: ["Hips Don't Lie — Shakira", "Waka Waka — Shakira", "Bailamos — Enrique Iglesias"],
    theme: "Latino",
  },
  {
    id: "i-feel-good",
    query: "James Brown I Got You I Feel Good",
    correctLabel: "I Got You (I Feel Good) — James Brown",
    decoys: ["Get Up — James Brown", "Superstition — Stevie Wonder", "September — Earth Wind & Fire"],
    theme: "Funk classique",
  },
  {
    id: "september-ewf",
    query: "Earth Wind Fire September",
    correctLabel: "September — Earth, Wind & Fire",
    decoys: ["Boogie Wonderland — Earth Wind & Fire", "Le Freak — Chic", "Good Times — Chic"],
    theme: "Funk classique",
  },
];

/** Durée d'un round (en secondes). */
export const BLINDTEST_QUESTION_TIME_LIMIT_SEC = 20;
/** Durée du reveal avant question suivante. */
export const BLINDTEST_REVEAL_DURATION_SEC = 6;
/** Nombre de rounds par partie. */
export const BLINDTEST_TOTAL_ROUNDS = 12;

/**
 * Métadonnées iTunes enrichies (récupérées au lancement).
 */
export interface BlindTrackEnriched {
  id: string;
  query: string;
  correctLabel: string;
  decoys: [string, string, string];
  theme?: string;
  /** URL MP3 30s. */
  previewUrl: string;
  /** URL JPG cover album (600x600). */
  artworkUrl: string;
}

/**
 * Round d'une partie : on stocke la métadonnée enrichie + l'ordre des boutons
 * (mélange bon + leurres) avec l'index de la bonne réponse.
 */
export interface BlindTestRound {
  track: BlindTrackEnriched;
  /** 4 labels affichés sur les boutons A/B/C/D (ordre mélangé). */
  options: [string, string, string, string];
  /** Index dans options de la bonne réponse (0-3). */
  correctIndex: number;
}

/** État Blind Test stocké dans sessions.current_state. */
export interface BlindTestState {
  phase: "question" | "reveal" | "final";
  roundIndex: number;
  totalRounds: number;
  /** Tous les rounds pré-calculés au start (avec previewUrl + artwork). */
  rounds: BlindTestRound[];
  questionStartedAt?: string;
  revealStartedAt?: string;
  timeLimitSec?: number;
  revealDurationSec?: number;
}

/**
 * Fetch iTunes Search API pour une query, retourne previewUrl + artwork.
 * Si pas de preview → returns null.
 */
export async function fetchITunesTrack(
  query: string
): Promise<{
  previewUrl: string;
  artworkUrl: string;
  /** Vrai titre retourné par iTunes (pour s'assurer que l'affichage match l'audio). */
  realTrackName: string;
  realArtistName: string;
} | null> {
  try {
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("term", query);
    url.searchParams.set("entity", "song");
    url.searchParams.set("limit", "5");
    url.searchParams.set("country", "FR");

    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results: Array<{
        previewUrl?: string;
        artworkUrl100?: string;
        trackName?: string;
        artistName?: string;
      }>;
    };

    for (const r of data.results ?? []) {
      if (r.previewUrl && r.trackName && r.artistName) {
        const artworkUrl =
          r.artworkUrl100?.replace("100x100bb", "600x600bb") ??
          r.artworkUrl100 ??
          "";
        return {
          previewUrl: r.previewUrl,
          artworkUrl,
          realTrackName: r.trackName,
          realArtistName: r.artistName,
        };
      }
    }
    return null;
  } catch (e) {
    console.warn("[fetchITunesTrack] error:", e);
    return null;
  }
}

/**
 * Calcule le score d'une bonne réponse — comme Quiz : vitesse + bonus rang.
 */
export function calculateBlindTestScore(
  correct: boolean,
  elapsedMs: number,
  rank: number = 1,
  totalPlayers: number = 1,
  timeLimitSec: number = BLINDTEST_QUESTION_TIME_LIMIT_SEC
): number {
  if (!correct) return 0;
  const timeLimitMs = timeLimitSec * 1000;
  const timeRatio = Math.max(0, Math.min(1, 1 - elapsedMs / timeLimitMs));
  const baseScore = 200 + Math.round(800 * timeRatio);

  let positionBonus = 0;
  if (totalPlayers >= 2) {
    if (rank === 1) positionBonus = 200;
    else if (rank === totalPlayers) positionBonus = -100;
    else {
      const positionRatio = (rank - 1) / (totalPlayers - 1);
      positionBonus = Math.round(200 - positionRatio * 300);
    }
  }
  return Math.max(0, baseScore + positionBonus);
}

/**
 * Mélange un tableau (Fisher-Yates). Utilisé pour randomiser l'ordre des
 * 4 boutons à chaque question.
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
