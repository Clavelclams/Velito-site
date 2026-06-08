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
// PRÉNOM GARÇON
// ─────────────────────────────────────────────────────────────────────────────
const PRENOM_GARCON = makeDict([
  // A
  "Alexandre", "Anthony", "Antoine", "Arthur", "Adrien", "Aymeric", "Augustin", "Aaron",
  // B
  "Baptiste", "Benjamin", "Bertrand", "Bastien", "Brian", "Bilel", "Bryan", "Boris",
  // C
  "Charles", "Christophe", "Clément", "Cédric", "Cyril", "Corentin", "Cosme",
  // D
  "David", "Damien", "Dorian", "Donovan", "Denis", "Diego", "Driss",
  // E
  "Etienne", "Eric", "Emmanuel", "Edouard", "Ethan", "Enzo", "Elias", "Eliott",
  // F
  "Florian", "François", "Fabien", "Frédéric", "Félix", "Fabrice",
  // G
  "Gabriel", "Guillaume", "Geoffrey", "Gérard", "Grégoire", "Gaston", "Gilles",
  // H
  "Hugo", "Henri", "Hervé", "Hassan", "Hadrien", "Hicham",
  // I
  "Igor", "Ilyes", "Ibrahim", "Issa",
  // J
  "Julien", "Jérémy", "Jordan", "Jean", "Jules", "Joachim", "Jamel", "Jonas",
  // K
  "Kevin", "Karim", "Karl", "Killian", "Kylian",
  // L
  "Lucas", "Louis", "Léo", "Léon", "Loïc", "Liam", "Logan",
  // M
  "Marc", "Mathieu", "Maxime", "Martin", "Michael", "Marius", "Matheo", "Mehdi", "Mohamed", "Mickael",
  // N
  "Nicolas", "Nathan", "Noé", "Naël", "Noam", "Nasser", "Nordine",
  // O
  "Olivier", "Ousmane", "Oscar", "Owen", "Othman",
  // P
  "Pierre", "Paul", "Patrick", "Philippe", "Pascal", "Pablo",
  // Q
  "Quentin", "Quincy",
  // R
  "Romain", "Robert", "Rémi", "Raphaël", "Rayan", "Ryan", "Robin",
  // S
  "Sébastien", "Stéphane", "Samuel", "Simon", "Sami", "Sacha", "Soufiane",
  // T
  "Thomas", "Théo", "Tristan", "Thierry", "Timéo", "Tony",
  // U
  "Ulysse", "Umar",
  // V
  "Vincent", "Victor", "Valentin", "Vladimir",
  // W
  "William", "Walid",
  // X
  "Xavier",
  // Y
  "Yann", "Yacine", "Yannick", "Youssef", "Yoann",
  // Z
  "Zacharie", "Zinedine",
]);

// ─────────────────────────────────────────────────────────────────────────────
// PRÉNOM FILLE
// ─────────────────────────────────────────────────────────────────────────────
const PRENOM_FILLE = makeDict([
  "Anna", "Aurélie", "Amélie", "Alice", "Alicia", "Ambre", "Aïcha", "Asma", "Andréa",
  "Béatrice", "Brigitte", "Bénédicte", "Bérénice",
  "Caroline", "Camille", "Céline", "Claire", "Chloé", "Charlotte", "Cassandre",
  "Diane", "Delphine", "Dounia", "Dorothée", "Donia",
  "Émilie", "Élodie", "Élise", "Eva", "Emma", "Estelle", "Esther",
  "Fabienne", "Fanny", "Fatima", "Fiona", "Flora",
  "Géraldine", "Gabrielle", "Gwendoline", "Garance",
  "Hélène", "Hawa", "Héloïse", "Hadjar",
  "Inès", "Isabelle", "Iris", "Imane",
  "Julie", "Justine", "Jasmine", "Jade", "Joséphine", "Jeanne",
  "Karima", "Kenza", "Khadija", "Karine",
  "Léa", "Laura", "Lola", "Louise", "Lina", "Lou", "Lucie", "Lilou",
  "Marie", "Mélanie", "Manon", "Margaux", "Maya", "Mélissa", "Mariam", "Maelle",
  "Nina", "Nora", "Nadia", "Naïma", "Nawel", "Nour", "Noor",
  "Océane", "Olivia", "Oumou", "Oriane",
  "Patricia", "Pauline", "Pénélope", "Prune",
  "Quitterie", "Queenie",
  "Rachel", "Rania", "Romane", "Roxane",
  "Sophie", "Sarah", "Sandrine", "Stéphanie", "Salma", "Soraya", "Selma",
  "Thérèse", "Tania", "Tasnim", "Tiphaine",
  "Ursula", "Ulrike",
  "Valérie", "Victoria", "Vanessa", "Violette",
  "Wendy", "Wassila",
  "Xena",
  "Yasmine", "Yvonne", "Yousra",
  "Zélie", "Zoé", "Zahra", "Zineb",
]);

// ─────────────────────────────────────────────────────────────────────────────
// OBJET
// ─────────────────────────────────────────────────────────────────────────────
const OBJET = makeDict([
  "Assiette", "Ampoule", "Aimant", "Aspirateur", "Armoire", "Arrosoir",
  "Bouteille", "Brosse", "Bougie", "Balai", "Baignoire", "Bibliothèque",
  "Chaise", "Couteau", "Clé", "Cuillère", "Casserole", "Carnet", "Crayon", "Ciseaux",
  "Drap", "Dé", "Disque", "Document", "Dossier",
  "Échelle", "Éponge", "Écharpe", "Étagère", "Évier",
  "Fourchette", "Fenêtre", "Fer", "Frigo", "Fauteuil",
  "Gomme", "Guitare", "Gant", "Globe",
  "Horloge", "Haut-parleur", "Harmonica",
  "Imprimante", "Interrupteur", "Iphone",
  "Journal", "Jouet",
  "Klaxon",
  "Lampe", "Livre", "Lit", "Lunettes",
  "Marteau", "Miroir", "Montre", "Machine",
  "Nappe", "Niche",
  "Ordinateur", "Oreiller", "Ouvre-boîte",
  "Pile", "Porte", "Pelle", "Pinceau", "Parapluie", "Plateau",
  "Quad",
  "Radio", "Règle", "Robinet", "Ruban",
  "Stylo", "Sac", "Serviette", "Saladier", "Sèche-cheveux",
  "Table", "Téléphone", "Télé", "Tabouret", "Tournevis",
  "Ukulélé",
  "Vase", "Vélo", "Ventilateur",
  "Wok",
  "Xylophone",
  "Yaourt",
  "Zoom",
]);

// ─────────────────────────────────────────────────────────────────────────────
// MARQUE
// ─────────────────────────────────────────────────────────────────────────────
const MARQUE = makeDict([
  "Adidas", "Apple", "Audi", "Asus", "Aldi", "Auchan", "Armani",
  "BMW", "Burger King", "Bose", "Bic", "Bouygues",
  "Chanel", "Coca-cola", "Citroën", "Carrefour", "Casio", "Converse",
  "Dior", "Dell", "Disney", "Decathlon", "Danone", "Dyson",
  "Etam", "Evian", "Epson", "EasyJet",
  "Ferrari", "Ford", "Fnac", "Free", "Fiat",
  "Gucci", "Google", "Gillette", "Garnier", "Gap",
  "Hermès", "H&M", "Honda", "Hyundai", "Heineken", "HP",
  "Intel", "Ikea", "Instagram",
  "Jeep", "Jordan", "Jaguar",
  "Kit Kat", "Kinder", "Kawasaki", "Kappa",
  "Lacoste", "LVMH", "Lidl", "Levi's", "Lexus", "LG",
  "McDonald's", "Mercedes", "Microsoft", "Mango", "Mavic", "Mango",
  "Nike", "Nintendo", "Nikon", "Nestlé", "Nissan", "Netflix",
  "Orange", "Opel", "Oral-B", "Olympus",
  "Puma", "Peugeot", "Prada", "Pepsi", "Panasonic", "Philips",
  "Quechua", "Quicksilver",
  "Renault", "Rolex", "Reebok", "Red Bull", "Ralph Lauren",
  "Samsung", "Sony", "Seat", "Suzuki", "Snapchat", "Spotify", "Sephora",
  "Toyota", "TikTok", "Tesla", "Tommy Hilfiger", "Total",
  "Uber", "Uniqlo",
  "Volkswagen", "Volvo", "Versace", "Vans",
  "Whatsapp", "Wonder",
  "Xiaomi", "Xbox",
  "Yamaha", "Youtube", "Yves Rocher",
  "Zara", "Zalando",
]);

// ─────────────────────────────────────────────────────────────────────────────
// PAYS / VILLE
// ─────────────────────────────────────────────────────────────────────────────
const PAYS_VILLE = makeDict([
  "Allemagne", "Angleterre", "Argentine", "Algérie", "Amsterdam", "Athènes", "Amiens",
  "Belgique", "Brésil", "Bulgarie", "Berlin", "Barcelone", "Bruxelles", "Bordeaux",
  "Canada", "Chine", "Chili", "Cuba", "Côte d'Ivoire", "Caen", "Cannes", "Cologne",
  "Danemark", "Dakar", "Doha", "Dublin", "Dijon",
  "Égypte", "Espagne", "Équateur", "États-Unis", "Édimbourg", "Erevan",
  "France", "Finlande", "Florence", "Francfort",
  "Grèce", "Guinée", "Gabon", "Genève", "Glasgow",
  "Hongrie", "Haïti", "Hambourg", "Hanoi", "Helsinki",
  "Italie", "Inde", "Iran", "Iraq", "Indonésie", "Istanbul",
  "Japon", "Jordanie", "Jérusalem",
  "Kenya", "Kazakhstan", "Kyoto", "Kingston",
  "Luxembourg", "Liban", "Libye", "Lille", "Lyon", "Lisbonne", "Londres",
  "Maroc", "Mexique", "Mali", "Madagascar", "Madrid", "Marseille", "Moscou", "Milan",
  "Norvège", "Nigéria", "Nantes", "Nice", "New York", "Naples",
  "Oman", "Oslo", "Ouganda",
  "Portugal", "Pologne", "Pakistan", "Paris", "Prague",
  "Qatar", "Québec",
  "Russie", "Roumanie", "Rwanda", "Rome", "Rio",
  "Suisse", "Suède", "Sénégal", "Strasbourg", "Stockholm", "Séoul", "Sydney",
  "Turquie", "Tchad", "Tunisie", "Toulouse", "Tokyo", "Tunis",
  "Ukraine", "Uruguay",
  "Venezuela", "Vietnam", "Vienne", "Varsovie", "Valence",
  "Yémen", "Yaoundé",
  "Zambie", "Zimbabwe", "Zurich",
]);

// ─────────────────────────────────────────────────────────────────────────────
// ANIMAL
// ─────────────────────────────────────────────────────────────────────────────
const ANIMAL = makeDict([
  "Aigle", "Âne", "Antilope", "Araignée", "Ours",
  "Baleine", "Bouc", "Buffle", "Bélier", "Blaireau",
  "Chat", "Chien", "Cheval", "Chèvre", "Cochon", "Crocodile", "Canard", "Castor", "Coq",
  "Dauphin", "Dromadaire", "Dinde",
  "Éléphant", "Écureuil", "Étoile de mer", "Élan",
  "Faucon", "Flamant", "Fennec", "Fourmi",
  "Girafe", "Guépard", "Grenouille", "Grizzly", "Gorille",
  "Hyène", "Hippopotame", "Hibou", "Hérisson",
  "Iguane", "Ibis",
  "Jaguar", "Jument",
  "Kangourou", "Koala",
  "Lion", "Loup", "Lynx", "Lapin", "Lama",
  "Mouton", "Marmotte", "Mouche", "Manchot",
  "Narval", "Nutria",
  "Ours", "Otarie", "Orang-outan", "Orque",
  "Panda", "Pingouin", "Phoque", "Pieuvre", "Poule", "Poisson", "Perroquet",
  "Quokka",
  "Rat", "Renard", "Requin", "Rhinocéros",
  "Singe", "Souris", "Serpent", "Sanglier", "Saumon",
  "Tigre", "Tortue", "Taupe", "Toucan",
  "Urubu",
  "Vautour", "Vache", "Vipère",
  "Wallaby",
  "Yack",
  "Zèbre",
]);

// ─────────────────────────────────────────────────────────────────────────────
// MAPPING catégorie → dictionnaire
// ─────────────────────────────────────────────────────────────────────────────
export const PETIT_BAC_DICTIONARIES: Record<string, Set<string>> = {
  "Prénom garçon": PRENOM_GARCON,
  "Prénom fille": PRENOM_FILLE,
  "Objet": OBJET,
  "Marque": MARQUE,
  "Pays / Ville": PAYS_VILLE,
  "Animal": ANIMAL,
};

/**
 * Vérifie qu'un mot existe dans la banque de sa catégorie.
 *
 * @param word     Le mot tapé par le joueur (déjà trimé)
 * @param category La catégorie courante (clé de PETIT_BAC_DICTIONARIES)
 */
export function wordInDictionary(word: string, category: string): boolean {
  const dict = PETIT_BAC_DICTIONARIES[category];
  if (!dict) return false; // Catégorie inconnue → on rejette (custom catégorie pas gérée)
  const normalized = normalizeWord(word);
  return dict.has(normalized);
}
