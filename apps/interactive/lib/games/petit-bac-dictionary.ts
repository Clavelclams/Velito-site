/**
 * Banque de mots validés pour Petit Bac.
 *
 * Stratégie de validation V1 :
 *   - Le mot est valide SI il appartient à la banque de SA catégorie
 *   - ET commence par la bonne lettre du round
 *   - ET fait au moins MIN_WORD_LENGTH caractères
 *
 * Comment enrichir :
 *   - Ajoute des mots dans les Set ci-dessous, normalisés (sans accent, lowercase)
 *   - L'utilisateur peut taper "Brian", "BRIAN", "brian" — on normalise au reveal
 *   - Reste fair-play : pas d'easter eggs ou de mots trop obscurs
 *
 * Limites assumées :
 *   - Pas exhaustif (impossible de lister tous les prénoms du monde)
 *   - Si un mot valide manque, le joueur perd ses points — mauvaise UX mais limite
 *     connue. À itérer avec retours utilisateurs.
 *
 * V2 : remplacer par une banque SQL avec fuzzy matching + admin pour ajouter des mots.
 */

import { normalizeWord } from "./petit-bac";

/**
 * Helper : crée un Set de mots normalisés à partir d'une liste lisible.
 */
function makeDict(words: string[]): Set<string> {
  return new Set(words.map(normalizeWord));
}

// ─────────────────────────────────────────────────────────────────────────────
// PRÉNOM GARÇON (~120 mots — couvre l'usage français + intl courant)
// ─────────────────────────────────────────────────────────────────────────────
const PRENOM_GARCON = makeDict([
  // A
  "Alexandre", "Anthony", "Antoine", "Arthur", "Adrien", "Aymeric", "Augustin", "Aaron",
  "Alain", "Albert", "Alexis", "Alfred", "Allan", "André", "Anatole", "Armand", "Axel", "Achille",
  // B
  "Baptiste", "Benjamin", "Bertrand", "Bastien", "Brian", "Bilel", "Bryan", "Boris",
  "Bernard", "Basile", "Benoît", "Bilal",
  // C
  "Charles", "Christophe", "Clément", "Cédric", "Cyril", "Corentin", "Cosme",
  "Christian", "Côme", "Constantin", "Camille",
  // D
  "David", "Damien", "Dorian", "Donovan", "Denis", "Diego", "Driss",
  "Daniel", "Dimitri", "Dylan", "Dominique",
  // E
  "Étienne", "Éric", "Emmanuel", "Édouard", "Ethan", "Enzo", "Élias", "Éliott",
  "Émile", "Ernest", "Évan", "Ezio",
  // F
  "Florian", "François", "Fabien", "Frédéric", "Félix", "Fabrice",
  "Faouzi", "Ferdinand", "Florent", "Franck",
  // G
  "Gabriel", "Guillaume", "Geoffrey", "Gérard", "Grégoire", "Gaston", "Gilles",
  "Gaétan", "Gaspard", "Georges", "Gustave",
  // H
  "Hugo", "Henri", "Hervé", "Hassan", "Hadrien", "Hicham",
  "Hamza", "Hector", "Hilaire", "Hubert",
  // I
  "Igor", "Ilyes", "Ibrahim", "Issa",
  "Idriss", "Imran", "Ilan", "Isaac", "Iliès", "Ismaël",
  // J
  "Julien", "Jérémy", "Jordan", "Jean", "Jules", "Joachim", "Jamel", "Jonas",
  "Jacques", "Jonathan", "Joseph", "Joël",
  // K
  "Kevin", "Karim", "Karl", "Killian", "Kylian",
  "Kamel", "Khalil", "Kenzo", "Keanu",
  // L
  "Lucas", "Louis", "Léo", "Léon", "Loïc", "Liam", "Logan",
  "Lazare", "Laurent", "Léonard", "Lilian", "Luca",
  // M
  "Marc", "Mathieu", "Maxime", "Martin", "Michael", "Marius", "Matheo", "Mehdi", "Mohamed", "Mickael",
  "Marcel", "Mathis", "Maël", "Marvin", "Maurice", "Matteo",
  // N
  "Nicolas", "Nathan", "Noé", "Naël", "Noam", "Nasser", "Nordine",
  "Naïm", "Néo", "Nelson", "Norbert",
  // O
  "Olivier", "Ousmane", "Oscar", "Owen", "Othman",
  "Octave", "Omar", "Oliver",
  // P
  "Pierre", "Paul", "Patrick", "Philippe", "Pascal", "Pablo",
  "Paolo", "Prosper",
  // Q
  "Quentin", "Quincy", "Quenten",
  // R
  "Romain", "Robert", "Rémi", "Raphaël", "Rayan", "Ryan", "Robin",
  "Raymond", "Renaud", "Roland", "Ronan", "Roméo",
  // S
  "Sébastien", "Stéphane", "Samuel", "Simon", "Sami", "Sacha", "Soufiane",
  "Saïd", "Sébastien", "Sofiane", "Sully", "Souleymane",
  // T
  "Thomas", "Théo", "Tristan", "Thierry", "Timéo", "Tony",
  "Tanguy", "Théodore", "Théophile", "Tiago", "Tobias", "Tom",
  // U
  "Ulysse", "Umar", "Ugo",
  // V
  "Vincent", "Victor", "Valentin", "Vladimir",
  "Vianney", "Virgile",
  // W
  "William", "Walid",
  "Warren", "Wassim", "Wesley",
  // X
  "Xavier", "Xander",
  // Y
  "Yann", "Yacine", "Yannick", "Youssef", "Yoann",
  "Yanis", "Yvan", "Younès", "Yves",
  // Z
  "Zacharie", "Zinedine", "Zakaria", "Zayd",
]);

// ─────────────────────────────────────────────────────────────────────────────
// PRÉNOM FILLE
// ─────────────────────────────────────────────────────────────────────────────
const PRENOM_FILLE = makeDict([
  // A
  "Anna", "Aurélie", "Amélie", "Alice", "Alicia", "Ambre", "Aïcha", "Asma", "Andréa",
  "Aline", "Alma", "Anaïs", "Apolline", "Audrey", "Ava", "Avril",
  // B
  "Béatrice", "Brigitte", "Bénédicte", "Bérénice",
  "Barbara", "Bahia", "Bianca",
  // C
  "Caroline", "Camille", "Céline", "Claire", "Chloé", "Charlotte", "Cassandre",
  "Catherine", "Cécile", "Clémence", "Constance", "Coralie",
  // D
  "Diane", "Delphine", "Dounia", "Dorothée", "Donia",
  "Daphné", "Déborah", "Daniela",
  // E
  "Émilie", "Élodie", "Élise", "Eva", "Emma", "Estelle", "Esther",
  "Édith", "Éléna", "Éléonore", "Élisabeth", "Élora", "Eden",
  // F
  "Fabienne", "Fanny", "Fatima", "Fiona", "Flora",
  "Farida", "Faustine", "Florence", "Florine",
  // G
  "Géraldine", "Gabrielle", "Gwendoline", "Garance",
  "Géraldine", "Ginette", "Giulia",
  // H
  "Hélène", "Hawa", "Héloïse", "Hadjar",
  "Hannah", "Hayet",
  // I
  "Inès", "Isabelle", "Iris", "Imane",
  "Inaya", "Ilona", "Indira", "Ines",
  // J
  "Julie", "Justine", "Jasmine", "Jade", "Joséphine", "Jeanne",
  "Jessica", "Joana", "Jihane", "Joëlle", "Johanne",
  // K
  "Karima", "Kenza", "Khadija", "Karine",
  "Kahina", "Kaltoum",
  // L
  "Léa", "Laura", "Lola", "Louise", "Lina", "Lou", "Lucie", "Lilou",
  "Laetitia", "Lalla", "Lauryn", "Layla", "Léna", "Léonie", "Lilas", "Liv",
  // M
  "Marie", "Mélanie", "Manon", "Margaux", "Maya", "Mélissa", "Mariam", "Maelle",
  "Madeleine", "Magalie", "Maïssa", "Malak", "Marine", "Mathilde", "Maud", "Maéva",
  // N
  "Nina", "Nora", "Nadia", "Naïma", "Nawel", "Nour", "Noor",
  "Nadège", "Naomi", "Naomie", "Nessia",
  // O
  "Océane", "Olivia", "Oumou", "Oriane",
  "Odette", "Ophélie", "Orphée",
  // P
  "Patricia", "Pauline", "Pénélope", "Prune",
  "Paloma", "Perrine", "Pia",
  // Q
  "Quitterie", "Queenie",
  // R
  "Rachel", "Rania", "Romane", "Roxane",
  "Rébecca", "Rita", "Rose", "Roxana", "Ruth",
  // S
  "Sophie", "Sarah", "Sandrine", "Stéphanie", "Salma", "Soraya", "Selma",
  "Sabrina", "Salomé", "Sasha", "Séléna", "Sigrid", "Sofia",
  // T
  "Thérèse", "Tania", "Tasnim", "Tiphaine",
  "Talia", "Tessa", "Théa",
  // U
  "Ursula", "Ulrike",
  // V
  "Valérie", "Victoria", "Vanessa", "Violette",
  "Véronique", "Vinciane",
  // W
  "Wendy", "Wassila",
  // X
  "Xena",
  // Y
  "Yasmine", "Yvonne", "Yousra",
  "Yael", "Yara",
  // Z
  "Zélie", "Zoé", "Zahra", "Zineb",
  "Zaïna", "Zara",
]);

// ─────────────────────────────────────────────────────────────────────────────
// OBJET
// ─────────────────────────────────────────────────────────────────────────────
const OBJET = makeDict([
  // A
  "Assiette", "Ampoule", "Aimant", "Aspirateur", "Armoire", "Arrosoir",
  "Agrafeuse", "Aiguille", "Allumette", "Antenne",
  // B
  "Bouteille", "Brosse", "Bougie", "Balai", "Baignoire", "Bibliothèque",
  "Bague", "Bâton", "Bonnet", "Bureau",
  // C
  "Chaise", "Couteau", "Clé", "Cuillère", "Casserole", "Carnet", "Crayon", "Ciseaux",
  "Cafetière", "Canapé", "Casque", "Ceinture", "Chapeau", "Chaussure", "Cintre",
  // D
  "Drap", "Dé", "Disque", "Document", "Dossier",
  "Dentifrice", "Demi-lune",
  // E
  "Échelle", "Éponge", "Écharpe", "Étagère", "Évier",
  "Élastique", "Enveloppe", "Étiquette",
  // F
  "Fourchette", "Fenêtre", "Fer", "Frigo", "Fauteuil",
  "Filet", "Flacon", "Foulard", "Four",
  // G
  "Gomme", "Guitare", "Gant", "Globe",
  "Gilet", "Goblet",
  // H
  "Horloge", "Haut-parleur", "Harmonica",
  "Hache", "Halogène",
  // I
  "Imprimante", "Interrupteur", "Iphone",
  "Igloo", "Insigne",
  // J
  "Journal", "Jouet",
  "Jeans", "Jacuzzi", "Jarre",
  // K
  "Klaxon", "Kayak", "Kit",
  // L
  "Lampe", "Livre", "Lit", "Lunettes",
  "Lampadaire", "Lame", "Lave-linge", "Lecteur", "Lance",
  // M
  "Marteau", "Miroir", "Montre", "Machine",
  "Maquillage", "Marmite", "Masque", "Micro-ondes",
  // N
  "Nappe", "Niche",
  "Note",
  // O
  "Ordinateur", "Oreiller", "Ouvre-boîte",
  "Ombrelle", "Outil",
  // P
  "Pile", "Porte", "Pelle", "Pinceau", "Parapluie", "Plateau",
  "Pantalon", "Peigne", "Pendule", "Piano", "Pneu", "Poubelle",
  // Q
  "Quad", "Quenotte",
  // R
  "Radio", "Règle", "Robinet", "Ruban",
  "Râteau", "Réveil", "Réfrigérateur", "Rideau",
  // S
  "Stylo", "Sac", "Serviette", "Saladier", "Sèche-cheveux",
  "Savon", "Scie", "Soutien-gorge", "Statue",
  // T
  "Table", "Téléphone", "Télé", "Tabouret", "Tournevis",
  "Tablette", "Tasse", "Tente", "Tiroir", "Trousse",
  // U
  "Ukulélé", "Ustensile",
  // V
  "Vase", "Vélo", "Ventilateur",
  "Valise", "Verre", "Veste",
  // W
  "Wok",
  // X
  "Xylophone",
  // Y
  "Yaourt", "Yo-yo",
  // Z
  "Zoom",
]);

// ─────────────────────────────────────────────────────────────────────────────
// MARQUE
// ─────────────────────────────────────────────────────────────────────────────
const MARQUE = makeDict([
  // A
  "Adidas", "Apple", "Audi", "Asus", "Aldi", "Auchan", "Armani",
  "Acer", "Air France", "Amazon", "Aston Martin", "Aubade",
  // B
  "BMW", "Burger King", "Bose", "Bic", "Bouygues",
  "Balenciaga", "Banania", "Bata", "Bentley", "Bonduelle", "Boursin",
  // C
  "Chanel", "Coca-cola", "Citroën", "Carrefour", "Casio", "Converse",
  "Cadbury", "Calvin Klein", "Canon", "Champion", "Chevrolet", "Chipster",
  // D
  "Dior", "Dell", "Disney", "Decathlon", "Danone", "Dyson",
  "Dacia", "Daewoo", "Dolce Gabbana", "Domino's",
  // E
  "Etam", "Evian", "Epson", "EasyJet",
  "Emporio", "Ericsson", "Escada", "Esso",
  // F
  "Ferrari", "Ford", "Fnac", "Free", "Fiat",
  "Fendi", "Findus", "Fila", "Fujitsu",
  // G
  "Gucci", "Google", "Gillette", "Garnier", "Gap",
  "General Motors", "Givenchy", "Goodyear", "Guess",
  // H
  "Hermès", "Honda", "Hyundai", "Heineken",
  "Harley-Davidson", "Haribo", "Hasbro", "Hilton", "Hollister",
  // I
  "Intel", "Ikea", "Instagram",
  "Iberia", "Infiniti", "Innocent",
  // J
  "Jeep", "Jordan", "Jaguar",
  "Jacobs", "Jeanneret", "Johnnie Walker",
  // K
  "Kinder", "Kawasaki", "Kappa",
  "Kellogg's", "KFC", "Kia", "Kodak",
  // L
  "Lacoste", "Lidl", "Lexus",
  "Lancôme", "Lavazza", "Lego", "Lenovo", "L'Oréal", "Louis Vuitton",
  // M
  "Mercedes", "Microsoft", "Mango",
  "Maserati", "Mazda", "Maybelline", "Maytag", "Milka", "Mitsubishi", "Monoprix",
  // N
  "Nike", "Nintendo", "Nikon", "Nestlé", "Nissan", "Netflix",
  "Nivea", "Nokia", "North Face",
  // O
  "Orange", "Opel", "Oral-B", "Olympus",
  "Oakley", "Old Spice", "Omega",
  // P
  "Puma", "Peugeot", "Prada", "Pepsi", "Panasonic", "Philips",
  "Pantene", "Patek Philippe", "Perrier", "Pirelli", "Pizza Hut", "Pringles",
  // Q
  "Quechua", "Quicksilver", "Quaker",
  // R
  "Renault", "Rolex", "Reebok", "Red Bull",
  "Ray-Ban", "Rimmel", "Roxy", "Royal Canin", "Russell",
  // S
  "Samsung", "Sony", "Seat", "Suzuki", "Snapchat", "Spotify", "Sephora",
  "Saab", "Sanofi", "Schweppes", "Skoda", "Specialized", "Starbucks",
  // T
  "Toyota", "TikTok", "Tesla", "Total",
  "Tag Heuer", "Tic Tac", "Tipiak", "Triumph", "Tupperware",
  // U
  "Uber", "Uniqlo",
  "Ubisoft", "Under Armour",
  // V
  "Volkswagen", "Volvo", "Versace", "Vans",
  "Valentino", "Veuve Clicquot", "Vichy", "Vivendi",
  // W
  "Whatsapp", "Wonder",
  "Walmart", "Whirlpool", "Wrigley", "Wrangler",
  // X
  "Xiaomi", "Xbox",
  "Xerox",
  // Y
  "Yamaha", "Youtube",
  "Yoplait", "Yorkshire",
  // Z
  "Zara", "Zalando",
  "Zoom", "Zoeva",
]);

// ─────────────────────────────────────────────────────────────────────────────
// PAYS / VILLE
// ─────────────────────────────────────────────────────────────────────────────
const PAYS_VILLE = makeDict([
  // A
  "Allemagne", "Angleterre", "Argentine", "Algérie", "Amsterdam", "Athènes", "Amiens",
  "Afrique du Sud", "Albanie", "Andorre", "Angola", "Arabie Saoudite", "Arménie",
  "Atlanta", "Australie", "Autriche", "Avignon",
  // B
  "Belgique", "Brésil", "Bulgarie", "Berlin", "Barcelone", "Bruxelles", "Bordeaux",
  "Bahreïn", "Bali", "Bamako", "Bangkok", "Beijing", "Beyrouth", "Birmingham", "Bogota", "Bombay", "Boston",
  // C
  "Canada", "Chine", "Chili", "Cuba", "Caen", "Cannes", "Cologne",
  "Cambodge", "Cameroun", "Caracas", "Cap-Vert", "Carthage", "Casablanca", "Chicago", "Colombie", "Compiègne", "Constantinople",
  // D
  "Danemark", "Dakar", "Doha", "Dublin", "Dijon",
  "Damas", "Detroit", "Djibouti", "Dortmund", "Dresde", "Dunkerque",
  // E
  "Égypte", "Espagne", "Équateur", "États-Unis", "Édimbourg", "Erevan",
  "Écosse", "Émirats", "Éthiopie",
  // F
  "France", "Finlande", "Florence", "Francfort",
  "Fidji", "Floride", "Formose",
  // G
  "Grèce", "Guinée", "Gabon", "Genève", "Glasgow",
  "Géorgie", "Ghana", "Grenade", "Grenoble", "Guatemala", "Guyane",
  // H
  "Hongrie", "Haïti", "Hambourg", "Hanoi", "Helsinki",
  "Hawaï", "Houston",
  // I
  "Italie", "Inde", "Iran", "Iraq", "Indonésie", "Istanbul",
  "Irlande", "Islande", "Israël",
  // J
  "Japon", "Jordanie", "Jérusalem",
  "Jakarta", "Jamaïque",
  // K
  "Kenya", "Kazakhstan", "Kyoto", "Kingston",
  "Kabul", "Karachi", "Khartoum", "Kiev", "Kosovo", "Koweït",
  // L
  "Luxembourg", "Liban", "Libye", "Lille", "Lyon", "Lisbonne", "Londres",
  "La Havane", "Las Vegas", "Lausanne", "Laos", "Le Caire", "Liège", "Liverpool", "Los Angeles",
  // M
  "Maroc", "Mexique", "Mali", "Madagascar", "Madrid", "Marseille", "Moscou", "Milan",
  "Malaisie", "Malte", "Manille", "Manchester", "Marrakech", "Mauritanie", "Melbourne", "Miami", "Monaco", "Mongolie",
  // N
  "Norvège", "Nigéria", "Nantes", "Nice", "New York", "Naples",
  "Nairobi", "Nepal", "Niamey", "Nicaragua", "Niger", "Nouméa", "Nuremberg",
  // O
  "Oman", "Oslo", "Ouganda",
  "Oran", "Orlando", "Osaka", "Ottawa",
  // P
  "Portugal", "Pologne", "Pakistan", "Paris", "Prague",
  "Palerme", "Panama", "Paraguay", "Pékin", "Pérou", "Philippines", "Phoenix", "Pise", "Pondichéry",
  // Q
  "Qatar", "Québec",
  "Quito",
  // R
  "Russie", "Roumanie", "Rwanda", "Rome", "Rio",
  "Reims", "Rennes", "Reykjavik", "Riyad", "Rotterdam",
  // S
  "Suisse", "Suède", "Sénégal", "Strasbourg", "Stockholm", "Séoul", "Sydney",
  "Salonique", "San Francisco", "Santiago", "Sarajevo", "Singapour", "Sofia", "Somalie", "Soudan",
  // T
  "Turquie", "Tchad", "Tunisie", "Toulouse", "Tokyo", "Tunis",
  "Tahiti", "Tanger", "Tanzanie", "Téhéran", "Tel Aviv", "Thaïlande", "Tibet", "Tirana", "Tripoli",
  // U
  "Ukraine", "Uruguay",
  "Utah", "Ulan-Bator",
  // V
  "Venezuela", "Vietnam", "Vienne", "Varsovie", "Valence",
  "Vancouver", "Vatican", "Vénézuela", "Vérone", "Vilnius",
  // W
  "Washington", "Wellington",
  // X
  "Xian",
  // Y
  "Yémen", "Yaoundé",
  "York",
  // Z
  "Zambie", "Zimbabwe", "Zurich",
  "Zagreb",
]);

// ─────────────────────────────────────────────────────────────────────────────
// ANIMAL
// ─────────────────────────────────────────────────────────────────────────────
const ANIMAL = makeDict([
  // A
  "Aigle", "Âne", "Antilope", "Araignée",
  "Abeille", "Agneau", "Alligator", "Alpaga", "Anaconda", "Anchois", "Autruche",
  // B
  "Baleine", "Bouc", "Buffle", "Bélier", "Blaireau",
  "Babouin", "Belette", "Boa", "Bouledogue", "Bourdon",
  // C
  "Chat", "Chien", "Cheval", "Chèvre", "Cochon", "Crocodile", "Canard", "Castor", "Coq",
  "Cafard", "Caïman", "Carpe", "Chameau", "Chauve-souris", "Chimpanzé", "Cobra", "Coccinelle", "Corbeau", "Crabe",
  // D
  "Dauphin", "Dromadaire", "Dinde",
  "Daim", "Dinosaure", "Dindon", "Dragon",
  // E
  "Éléphant", "Écureuil", "Élan",
  "Émeu", "Épagneul", "Espadon",
  // F
  "Faucon", "Flamant", "Fennec", "Fourmi",
  "Faisan", "Fennec", "Furet",
  // G
  "Girafe", "Guépard", "Grenouille", "Grizzly", "Gorille",
  "Geai", "Gerbille", "Goéland", "Goret",
  // H
  "Hyène", "Hippopotame", "Hibou", "Hérisson",
  "Hamster", "Hareng", "Hippocampe", "Homard",
  // I
  "Iguane", "Ibis",
  "Impala",
  // J
  "Jaguar", "Jument",
  "Jacamar",
  // K
  "Kangourou", "Koala",
  "Kiwi",
  // L
  "Lion", "Loup", "Lynx", "Lapin", "Lama",
  "Lézard", "Libellule", "Limace", "Lionceau", "Loutre",
  // M
  "Mouton", "Marmotte", "Mouche", "Manchot",
  "Maquereau", "Méduse", "Mouflon", "Moustique", "Mulet", "Mulot",
  // N
  "Narval", "Nutria",
  "Naja",
  // O
  "Ours", "Otarie", "Orque",
  "Oie", "Oiseau", "Okapi", "Opossum", "Orang-outan", "Orignal",
  // P
  "Panda", "Pingouin", "Phoque", "Pieuvre", "Poule", "Poisson", "Perroquet",
  "Paon", "Panthère", "Papillon", "Perche", "Pie", "Pinson", "Poney", "Porc", "Poulpe", "Puce", "Python",
  // Q
  "Quokka", "Quetzal",
  // R
  "Rat", "Renard", "Requin", "Rhinocéros",
  "Raton", "Renne", "Rouge-gorge", "Rossignol",
  // S
  "Singe", "Souris", "Serpent", "Sanglier", "Saumon",
  "Salamandre", "Sardine", "Sauterelle", "Scarabée", "Scorpion", "Suricate",
  // T
  "Tigre", "Tortue", "Taupe", "Toucan",
  "Taureau", "Tarentule", "Termite", "Thon", "Tique",
  // U
  "Urubu",
  // V
  "Vautour", "Vache", "Vipère",
  "Veau", "Ver",
  // W
  "Wallaby", "Wapiti",
  // X
  "Xérus",
  // Y
  "Yack",
  "Yorkshire",
  // Z
  "Zèbre",
  "Zébu",
]);

// ─────────────────────────────────────────────────────────────────────────────
// FRUIT / LÉGUME
// ─────────────────────────────────────────────────────────────────────────────
const FRUIT_LEGUME = makeDict([
  // A
  "Abricot", "Ananas", "Artichaut", "Aubergine", "Ail", "Asperge", "Amande", "Avocat",
  // B
  "Banane", "Brocoli", "Betterave", "Blette", "Banane plantain",
  // C
  "Cerise", "Citron", "Carotte", "Courgette", "Choux", "Concombre", "Châtaigne", "Citrouille",
  "Cassis", "Céleri", "Cèpe", "Champignon", "Chou-fleur", "Coing", "Cranberry",
  // D
  "Datte", "Daikon",
  // E
  "Endive", "Échalote", "Épinard",
  // F
  "Fraise", "Framboise", "Fenouil", "Figue", "Fève",
  // G
  "Goyave", "Groseille", "Gingembre", "Grenade",
  // H
  "Haricot",
  // I
  "Igname",
  // J
  "Jaque", "Jujube",
  // K
  "Kiwi", "Kaki",
  // L
  "Laitue", "Litchi", "Lentille",
  // M
  "Mangue", "Melon", "Mandarine", "Mûre", "Myrtille", "Mirabelle", "Maïs",
  // N
  "Nectarine", "Navet", "Noix", "Noisette",
  // O
  "Orange", "Olive", "Oignon",
  // P
  "Pomme", "Poire", "Pêche", "Prune", "Pamplemousse", "Papaye", "Pastèque",
  "Pomme de terre", "Potiron", "Persil", "Petit pois", "Piment", "Poireau", "Poivron",
  // Q
  "Quetsche",
  // R
  "Raisin", "Radis", "Rhubarbe",
  // S
  "Salade", "Salsifis",
  // T
  "Tomate", "Topinambour",
  // V
  "Vanille",
  // Y
  "Yuzu",
]);

// ─────────────────────────────────────────────────────────────────────────────
// CÉLÉBRITÉ (musique, film, sport, tv… toutes industries confondues)
// ─────────────────────────────────────────────────────────────────────────────
const CELEBRITE = makeDict([
  // A
  "Aya Nakamura", "Angèle", "Adèle", "Alain Delon", "Aretha Franklin", "Amel Bent",
  // B
  "Beyoncé", "Brad Pitt", "Booba", "Bob Marley", "Brigitte Bardot", "Britney Spears",
  // C
  "Cristiano Ronaldo", "Céline Dion", "Charlie Chaplin", "Chris Brown", "Cardi B",
  // D
  "Drake", "David Bowie", "Daft Punk", "Dadju", "Damso", "Dua Lipa",
  // E
  "Eminem", "Ed Sheeran", "Eric Cantona", "Emma Watson", "Eddy Murphy",
  // F
  "Freddie Mercury", "Fally Ipupa", "Florent Pagny",
  // G
  "George Clooney", "Gad Elmaleh", "Gims",
  // H
  "Hugh Jackman", "Harry Styles", "Harry Potter", "Hatik",
  // I
  "Ibrahimović", "Ice Cube", "Iam",
  // J
  "Jamie Foxx", "Jay-Z", "Jul", "Justin Bieber", "Jennifer Lopez", "Johnny Hallyday",
  // K
  "Kanye West", "Kim Kardashian", "Kendji Girac", "Karim Benzema", "Kylian Mbappé",
  "Kendrick Lamar", "Kaaris", "Khaled",
  // L
  "Léa Seydoux", "Lady Gaga", "LeBron James", "Lionel Messi", "Lin Manuel", "Lacrim",
  // M
  "Michael Jackson", "Madonna", "Mike Tyson", "Marion Cotillard", "Maes",
  "Maître Gims", "Maluma", "Mariah Carey", "Marvin Gaye", "Mbappé",
  // N
  "Niska", "Naps", "Nekfeu", "Nicole Kidman", "Nicki Minaj", "Naomi Campbell",
  // O
  "Omar Sy", "Orelsan", "Oprah Winfrey",
  // P
  "Patrick Bruel", "Patrick Sébastien", "Pharrell Williams", "Pink", "PNL", "Post Malone",
  // Q
  "Quincy Jones",
  // R
  "Rihanna", "Ronaldo", "Robert De Niro", "Robert Pattinson", "Rohff",
  // S
  "Stromae", "Sia", "Shy'm", "Selena Gomez", "Shakira", "Snoop Dogg",
  "Soprano", "Soolking",
  // T
  "Taylor Swift", "Tom Cruise", "Tom Hanks", "Travis Scott", "Tiakola",
  // U
  "Usain Bolt", "Usher",
  // V
  "Vald", "Vegedream", "Vanessa Paradis",
  // W
  "Will Smith", "Wejdene", "Wesh",
  // Y
  "Youssoupha", "Yara",
  // Z
  "Zinedine Zidane", "Zaho", "Zazie", "ZAZ",
]);

// ─────────────────────────────────────────────────────────────────────────────
// MOT ANGLAIS (courant — pas besoin de niveau Cambridge)
// ─────────────────────────────────────────────────────────────────────────────
const MOT_ANGLAIS = makeDict([
  // A
  "Apple", "Animal", "Always", "Amazing", "August", "August", "About", "After", "Again",
  // B
  "Beautiful", "Birthday", "Book", "Brother", "Bread", "Black", "Blue", "Bag",
  // C
  "Cat", "Car", "Coffee", "Cool", "Computer", "Color", "Chair", "City",
  // D
  "Dog", "Day", "Dance", "Dinner", "Dream", "Door", "Drink",
  // E
  "Eat", "Egg", "Eye", "Easy", "Eight", "English",
  // F
  "Family", "Food", "Friend", "Forever", "Friday", "Football", "Father", "Fire",
  // G
  "Good", "Game", "Girl", "Guitar", "Green", "Goodbye",
  // H
  "Hello", "House", "Happy", "Home", "Hand", "Hot", "Holiday",
  // I
  "Important", "Ice", "Idea", "Internet", "Iron",
  // J
  "Job", "Juice", "Jump", "Jungle",
  // K
  "Kitchen", "Key", "Kid", "King", "Kind",
  // L
  "Love", "Light", "Listen", "Lemon", "Life", "Laugh",
  // M
  "Mother", "Music", "Money", "Monday", "Morning", "Movie", "Milk", "Music",
  // N
  "Name", "Night", "Number", "Nature", "New",
  // O
  "Open", "Orange", "Office", "October",
  // P
  "Party", "People", "Phone", "Pizza", "Please", "Play", "Pink",
  // Q
  "Question", "Queen", "Quick",
  // R
  "Red", "Rain", "Run", "Read", "Right", "Restaurant",
  // S
  "School", "Sun", "Saturday", "Sister", "Sleep", "Sun", "Song", "Sport",
  // T
  "Time", "Table", "Teacher", "Thanks", "Today", "Tomorrow", "Tree", "Tuesday",
  // U
  "Up", "Under", "Use", "Umbrella",
  // V
  "Very", "Video", "Voice",
  // W
  "Water", "Work", "Window", "Welcome", "Wednesday", "Weekend", "White", "Walk",
  // X
  "Xmas",
  // Y
  "Yes", "Year", "Yellow", "Young", "Yesterday",
  // Z
  "Zero", "Zoo",
]);

// ─────────────────────────────────────────────────────────────────────────────
// MAPPING catégorie → dictionnaire
// ─────────────────────────────────────────────────────────────────────────────
export const PETIT_BAC_DICTIONARIES: Record<string, Set<string>> = {
  "Prénom garçon": PRENOM_GARCON,
  "Prénom fille": PRENOM_FILLE,
  "Animal": ANIMAL,
  "Fruit / Légume": FRUIT_LEGUME,
  "Célébrité": CELEBRITE,
  "Mot anglais": MOT_ANGLAIS,
  "Objet": OBJET,
  "Marque": MARQUE,
  "Pays / Ville": PAYS_VILLE,
};

/**
 * Distance de Levenshtein entre 2 chaînes (nombre min d'opérations
 * insertion/suppression/substitution pour passer de a à b).
 *
 * Exemples :
 *   levenshtein("riz", "rit") → 1  (substitution z→t)
 *   levenshtein("riz", "ryh") → 2  (substitution i→y + z→h)
 *   levenshtein("brian", "briannn") → 2 (insertion 'n' x2)
 *
 * Algo : matrice DP classique, O(a.length × b.length).
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const m = a.length;
  const n = b.length;
  // On garde seulement 2 lignes au lieu de la matrice complète (mémoire O(n))
  let prev: number[] = Array(n + 1).fill(0).map((_, i) => i);
  let curr: number[] = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      // Les accès aux indices sont garantis valides (1 ≤ j ≤ n), mais TS strict
      // demande le `!`
      curr[j] = Math.min(
        prev[j]! + 1,        // suppression
        curr[j - 1]! + 1,    // insertion
        prev[j - 1]! + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n]!;
}

/**
 * Vérifie qu'un mot existe dans la banque de sa catégorie.
 *
 * Tolérance fautes d'orthographe :
 *   - Match exact toujours OK
 *   - Pour les mots de 5+ caractères, on autorise 1 erreur (distance Levenshtein ≤ 1)
 *   - Pour les mots courts (3-4 chars), on exige le match exact
 *     (risque de faux positifs sinon : "rat" vs "rit" = distance 1 mais c'est triché)
 *
 * @param word     Le mot tapé par le joueur (déjà trimé)
 * @param category La catégorie courante (clé de PETIT_BAC_DICTIONARIES)
 */
/**
 * Catégories où on n'a PAS de dictionnaire de référence — les prénoms sont
 * infinis et culturellement variés (Younès, Maeloan, Kéziah…). On accepte
 * tout ce qui respecte "commence par la bonne lettre + min 3 chars".
 * Notre dico sert juste d'inspiration pour les joueurs en panne.
 */
const OPEN_CATEGORIES = new Set(["Prénom garçon", "Prénom fille", "Célébrité"]);

export function wordInDictionary(word: string, category: string): boolean {
  // Catégories ouvertes (prénoms) : on accepte tout (la validation lettre/longueur
  // est faite ailleurs dans wordStartsWithLetter)
  if (OPEN_CATEGORIES.has(category)) return true;

  const dict = PETIT_BAC_DICTIONARIES[category];
  if (!dict) return false; // Catégorie inconnue → on rejette
  const normalized = normalizeWord(word);

  // Match exact en priorité (90% des cas)
  if (dict.has(normalized)) return true;

  // Pour les mots courts, on n'autorise pas la tolérance (trop de faux positifs)
  if (normalized.length < 5) return false;

  // Pour les mots 5+ chars : on scanne le dico et on cherche un mot à distance ≤ 1
  // Optim : on skip les mots dont la longueur diffère de plus de 1 (impossible d'être à
  // distance 1 sinon)
  for (const dictWord of dict) {
    if (Math.abs(dictWord.length - normalized.length) > 1) continue;
    if (levenshtein(normalized, dictWord) <= 1) return true;
  }
  return false;
}
