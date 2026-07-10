/**
 * Estim' — Combien ça vaut ? Estimation de prix.
 *
 * Concept : on montre la photo d'un objet / monument / produit et chaque
 * joueur tape une estimation en euros. Le plus proche gagne le plus de points.
 *
 * Mécanique :
 *  - 5 objets par partie
 *  - 30s par objet : le joueur tape son prix (peut le modifier)
 *  - Au reveal : on calcule la diff absolue + diff % du vrai prix
 *  - Scoring basé sur la diff en % du vrai prix
 *
 * Images :
 *  - Stockées dans /public/images/estim/<id>.jpg (à déposer manuellement)
 *  - Si l'image n'existe pas → emoji fallback
 *  - Format conseillé : 800×600 jpg/webp, optimisées (~80 Ko)
 */

export interface EstimQuestion {
  id: string;
  /** Le nom affiché (titre de la question) */
  label: string;
  /** Détail descriptif court ("iPhone 16 Pro Max · 256 Go · neuf"). */
  hint?: string;
  /** Prix RÉEL en euros (HT ou TTC selon ce qui est cohérent côté pub). */
  priceEur: number;
  /** Path image dans /public/images/estim/. Si absent : emoji fallback. */
  image?: string;
  /** Emoji fallback si l'image manque. */
  emoji?: string;
  /** Thème pour catégorisation visuelle. */
  theme?: string;
  /** Source du prix (pour traçabilité, jamais affichée à l'écran). */
  source?: string;
  /**
   * Question "blague" — pas de vrai prix.
   *   - Le reveal affiche "INESTIMABLE" au lieu du chiffre
   *   - Tous les joueurs gagnent 50 pts (pas de scoring diff)
   *   - Pas de bonus rang
   * Utilisé pour la question "Combien vaut Clavel ?" qui revient parfois.
   */
  joke?: boolean;
}

/**
 * Banque V1 — 30 objets variés.
 *
 * Pour ajouter des images, dépose les fichiers dans :
 *   apps/interactive/public/images/estim/<id>.jpg
 *
 * Si pas d'image, on affiche l'emoji.
 */
export const ESTIM_QUESTIONS: EstimQuestion[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // PAS CHERS — anchors bas du barème
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "stylo-bic-cristal",
    label: "Un stylo Bic Cristal (à l'unité)",
    hint: "Le bic bleu classique, en magasin",
    priceEur: 0.55,
    image: "/images/estim/bic-cristal.jpg",
    emoji: "🖊️",
    theme: "Pas cher",
    source: "Cultura 2026",
  },
  {
    id: "timbre-lettre-verte",
    label: "Un timbre Lettre Verte (20g)",
    hint: "Tarif unitaire La Poste 2026",
    priceEur: 1.39,
    emoji: "✉️",
    theme: "Pas cher",
    source: "La Poste 2026",
  },
  {
    id: "baguette-tradition",
    label: "Une baguette tradition à Paris",
    hint: "Boulangerie de quartier 2026",
    priceEur: 1.6,
    image: "/images/estim/baguette.jpg",
    emoji: "🥖",
    theme: "Pas cher",
    source: "Moyenne Paris 2026",
  },
  {
    id: "croissant-paris",
    label: "Un croissant au beurre à Paris",
    hint: "Boulangerie de quartier",
    priceEur: 1.5,
    image: "/images/estim/croissant.jpg",
    emoji: "🥐",
    theme: "Pas cher",
    source: "Moyenne Paris 2026",
  },
  {
    id: "cafe-bar-amiens",
    label: "Un café expresso au bar à Amiens",
    hint: "Au comptoir d'un café classique",
    priceEur: 1.6,
    image: "/images/estim/cafe.jpg",
    emoji: "☕",
    theme: "Pas cher",
    source: "Moyenne Amiens 2026",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TECH ICONIQUES — prix officiels stables
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "iphone-16-pro-max",
    label: "iPhone 16 Pro Max",
    hint: "256 Go · neuf · prix officiel Apple",
    priceEur: 1479,
    image: "/images/estim/iphone-16-pro-max.jpg",
    emoji: "📱",
    theme: "Tech",
    source: "apple.com 2026",
  },
  {
    id: "ps5-pro",
    label: "PlayStation 5 Pro",
    hint: "Console neuve, sans manette supp.",
    priceEur: 799,
    image: "/images/estim/ps5-pro.jpg",
    emoji: "🎮",
    theme: "Tech",
    source: "Sony 2026",
  },
  {
    id: "macbook-pro-m4",
    label: "MacBook Pro M4",
    hint: "14 pouces · 16 Go RAM · 512 Go",
    priceEur: 2249,
    image: "/images/estim/macbook-pro-m4.jpg",
    emoji: "💻",
    theme: "Tech",
    source: "apple.com 2026",
  },
  {
    id: "airpods-pro-2",
    label: "AirPods Pro 2",
    hint: "USB-C · étui MagSafe",
    priceEur: 279,
    image: "/images/estim/airpods-pro-2.jpg",
    emoji: "🎧",
    theme: "Tech",
    source: "apple.com 2026",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // VOITURES — du compact à l'hypercar
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "renault-5-electrique",
    label: "Renault 5 E-Tech 100% électrique",
    hint: "Version Techno · neuve · 2026",
    priceEur: 27900,
    image: "/images/estim/renault-5-electrique.jpg",
    emoji: "🚗",
    theme: "Voiture",
    source: "renault.fr 2026",
  },
  {
    id: "tesla-model-3",
    label: "Tesla Model 3 Long Range",
    hint: "Neuve · 2 moteurs · prix de base",
    priceEur: 49990,
    image: "/images/estim/tesla-model-3.jpg",
    emoji: "🚙",
    theme: "Voiture",
    source: "tesla.com 2026",
  },
  {
    id: "ferrari-296-gtb",
    label: "Ferrari 296 GTB",
    hint: "Neuve · prix de base en France",
    priceEur: 269750,
    image: "/images/estim/ferrari-296-gtb.jpg",
    emoji: "🏎️",
    theme: "Voiture",
    source: "ferrari.com 2026",
  },
  {
    id: "bugatti-tourbillon",
    label: "Bugatti Tourbillon",
    hint: "Neuve · 250 exemplaires uniquement au monde",
    priceEur: 3800000,
    image: "/images/estim/bugatti-tourbillon.jpg",
    emoji: "🏎️",
    theme: "Voiture",
    source: "bugatti.com 2026",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ICONIQUES IDENTIFIABLES — prix officiel constructeur
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "rolex-submariner",
    label: "Rolex Submariner Date",
    hint: "Acier · neuve · prix boutique officiel",
    priceEur: 10350,
    image: "/images/estim/rolex-submariner.jpg",
    emoji: "⌚",
    theme: "Iconique",
    source: "rolex.com 2026",
  },
  {
    id: "air-jordan-1-chicago",
    label: "Air Jordan 1 Retro High OG Chicago",
    hint: "Coloris originel · prix retail",
    priceEur: 200,
    image: "/images/estim/air-jordan-1.jpg",
    emoji: "👟",
    theme: "Iconique",
    source: "nike.com 2026",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MONUMENTS / VALEUR ESTIMÉE — chiffres documentés
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "tour-eiffel-valeur",
    label: "La Tour Eiffel (valeur économique estimée)",
    hint: "Étude CCI Paris Île-de-France 2012",
    priceEur: 434000000000, // 434 milliards
    image: "/images/estim/tour-eiffel.jpg",
    emoji: "🗼",
    theme: "Monument",
    source: "Monitor Group / CCI Paris 2012",
  },
  {
    id: "burj-khalifa-construction",
    label: "Coût de construction du Burj Khalifa (Dubaï)",
    hint: "Tour la plus haute du monde · livrée 2010",
    priceEur: 1300000000, // 1,3 milliard $
    image: "/images/estim/burj-khalifa.jpg",
    emoji: "🏙️",
    theme: "Monument",
    source: "Emaar Properties officiel",
  },
  {
    id: "stade-france-construction",
    label: "Coût de construction du Stade de France",
    hint: "Saint-Denis · ouvert 1998",
    priceEur: 364000000,
    image: "/images/estim/stade-de-france.jpg",
    emoji: "🏟️",
    theme: "Monument",
    source: "Consortium SDF 1998",
  },
  {
    id: "concorde-prix",
    label: "Prix de vente neuf d'un Concorde (Air France)",
    hint: "Prix unitaire à la livraison 1976",
    priceEur: 23000000, // ~150 M FF de l'époque
    image: "/images/estim/concorde.jpg",
    emoji: "✈️",
    theme: "Monument",
    source: "Aérospatiale/BAC 1976",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ART / RECORDS — chiffres de ventes publiques vérifiables
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "joconde-estimation",
    label: "La Joconde (estimation assurance Louvre)",
    hint: "Tableau de Léonard de Vinci · 1503",
    priceEur: 850000000,
    image: "/images/estim/joconde.jpg",
    emoji: "🖼️",
    theme: "Art",
    source: "Estimation Louvre / Forbes",
  },
  {
    id: "monet-nympheas",
    label: "Tableau « Nymphéas » de Monet (record vente)",
    hint: "Adjudication Sotheby's Londres 2018",
    priceEur: 76200000,
    image: "/images/estim/monet-nympheas.jpg",
    emoji: "🎨",
    theme: "Art",
    source: "Sotheby's 2018",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BOUFFE EXCEPTIONNELLE
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "kg-truffe-noire",
    label: "1 kg de truffe noire fraîche du Périgord",
    hint: "Prix grossiste en pleine saison",
    priceEur: 1200,
    image: "/images/estim/truffe-noire.jpg",
    emoji: "🍄",
    theme: "Bouffe rare",
    source: "Marché Périgord 2025",
  },
  {
    id: "kg-caviar-beluga",
    label: "100 g de caviar Beluga sauvage",
    hint: "Grade premium · Maison Nordique 2025",
    priceEur: 1100,
    image: "/images/estim/caviar.jpg",
    emoji: "🥄",
    theme: "Bouffe rare",
    source: "Maisons spécialisées 2025",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ANIMAUX (du quotidien au luxe)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "vache-laitiere",
    label: "Une vache laitière Prim'Holstein (adulte)",
    hint: "Génétique standard · marché agricole français",
    priceEur: 1500,
    image: "/images/estim/vache.jpg",
    emoji: "🐄",
    theme: "Animal",
    source: "Marché agricole FR 2025",
  },
  {
    id: "cheval-trotteur",
    label: "Un cheval de trot prêt à la course",
    hint: "3 ans, génétique correcte, sans palmarès",
    priceEur: 12000,
    image: "/images/estim/cheval-trotteur.jpg",
    emoji: "🐎",
    theme: "Animal",
    source: "Estimation Le Trot 2025",
  },
  {
    id: "chiot-bouledogue",
    label: "Un chiot Bouledogue Français (LOF)",
    hint: "Élevage reconnu · 3 mois",
    priceEur: 2200,
    image: "/images/estim/bouledogue.jpg",
    emoji: "🐶",
    theme: "Animal",
    source: "Sites d'éleveurs 2025",
  },
  {
    id: "chat-bengal",
    label: "Un chaton Bengal (race LOOF)",
    hint: "Élevage agréé · 2 mois",
    priceEur: 1500,
    image: "/images/estim/chat-bengal.jpg",
    emoji: "🐱",
    theme: "Animal",
    source: "Sites d'éleveurs 2025",
  },
  {
    id: "poule-pondeuse",
    label: "Une poule pondeuse adulte",
    hint: "Race rousse · marché de campagne",
    priceEur: 15,
    image: "/images/estim/poule.jpg",
    emoji: "🐔",
    theme: "Animal",
    source: "Coopératives 2025",
  },
  {
    id: "perroquet-gris-gabon",
    label: "Un perroquet gris du Gabon",
    hint: "Jeune adulte · animalerie spécialisée",
    priceEur: 1800,
    image: "/images/estim/perroquet.jpg",
    emoji: "🦜",
    theme: "Animal",
    source: "Animaleries spécialisées",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSPORTS (du vélo au yacht)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "trottinette-electrique-xiaomi",
    label: "Une trottinette électrique Xiaomi Pro 2",
    hint: "Modèle pliable adulte · neuve",
    priceEur: 549,
    image: "/images/estim/trottinette-xiaomi.jpg",
    emoji: "🛴",
    theme: "Transport",
    source: "mi.com 2026",
  },
  {
    id: "scooter-yamaha-tmax",
    label: "Un scooter Yamaha TMAX 560",
    hint: "Neuf · prix de base France",
    priceEur: 13499,
    image: "/images/estim/yamaha-tmax.jpg",
    emoji: "🛵",
    theme: "Transport",
    source: "yamaha-motor.eu 2026",
  },
  {
    id: "voilier-occasion",
    label: "Un voilier de 8m d'occasion (15 ans)",
    hint: "Coque polyester · bon état général",
    priceEur: 28000,
    image: "/images/estim/voilier.jpg",
    emoji: "⛵",
    theme: "Transport",
    source: "Le Bon Coin nautisme 2025",
  },
  {
    id: "yacht-azimut-60",
    label: "Un yacht Azimut 60 neuf",
    hint: "Yacht italien · prix de base",
    priceEur: 1900000,
    image: "/images/estim/yacht-azimut.jpg",
    emoji: "🛥️",
    theme: "Transport",
    source: "azimutyachts.com 2026",
  },
  {
    id: "billet-avion-paris-ny",
    label: "Un billet avion Paris ↔ New York (éco)",
    hint: "Aller-retour · classe éco · réservé 2 mois avant",
    priceEur: 650,
    image: "/images/estim/avion-paris-ny.jpg",
    emoji: "✈️",
    theme: "Transport",
    source: "Skyscanner moyenne 2025",
  },
  {
    id: "croisiere-mediterranee",
    label: "Une croisière 7 jours en Méditerranée (MSC)",
    hint: "Cabine intérieure · 2 adultes · all-in",
    priceEur: 999,
    image: "/images/estim/croisiere-msc.jpg",
    emoji: "🚢",
    theme: "Transport",
    source: "msccroisieres.fr 2026",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MAISON / MOBILIER (vraies vies, vrais prix)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "machine-cafe-nespresso",
    label: "Machine Nespresso Vertuo Pop",
    hint: "Modèle d'entrée · neuf",
    priceEur: 79,
    image: "/images/estim/nespresso-vertuo-pop.jpg",
    emoji: "☕",
    theme: "Maison",
    source: "Nespresso 2026",
  },
  {
    id: "velo-decathlon-electrique",
    label: "Vélo électrique Decathlon Riverside 500E",
    hint: "VTC électrique · neuf",
    priceEur: 1499,
    image: "/images/estim/decathlon-riverside-500e.jpg",
    emoji: "🚲",
    theme: "Maison",
    source: "decathlon.fr 2026",
  },
  {
    id: "tv-lg-oled-55",
    label: "TV LG OLED Evo C4 55 pouces",
    hint: "Modèle 2024 · neuf",
    priceEur: 1499,
    image: "/images/estim/lg-oled-c4.jpg",
    emoji: "📺",
    theme: "Maison",
    source: "lg.com 2026",
  },
  {
    id: "canape-ikea-kivik",
    label: "Canapé IKEA Kivik 3 places (housse compacte)",
    hint: "Neuf · livraison incluse",
    priceEur: 699,
    image: "/images/estim/ikea-kivik.jpg",
    emoji: "🛋️",
    theme: "Maison",
    source: "ikea.fr 2026",
  },
  {
    id: "frigo-americain-samsung",
    label: "Un frigo américain Samsung 4 portes",
    hint: "615 L · neuf · inox",
    priceEur: 1799,
    image: "/images/estim/frigo-samsung.jpg",
    emoji: "🧊",
    theme: "Maison",
    source: "samsung.com 2026",
  },
  {
    id: "matelas-bultex",
    label: "Un matelas Bultex 160×200 cm",
    hint: "Modèle Lyon mémoire de forme · neuf",
    priceEur: 549,
    image: "/images/estim/matelas-bultex.jpg",
    emoji: "🛏️",
    theme: "Maison",
    source: "Conforama 2026",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BOUFFE & BOISSONS (au-delà du quotidien)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "kg-boeuf-charolais",
    label: "1 kg d'entrecôte de bœuf Charolais (boucher)",
    hint: "Boucherie de quartier · 2025",
    priceEur: 32,
    image: "/images/estim/boeuf-charolais.jpg",
    emoji: "🥩",
    theme: "Bouffe",
    source: "Moyenne boucherie FR 2025",
  },
  {
    id: "foie-gras-mi-cuit",
    label: "Un foie gras mi-cuit (200g, conserve)",
    hint: "Marque artisanale française",
    priceEur: 24,
    image: "/images/estim/foie-gras.jpg",
    emoji: "🦆",
    theme: "Bouffe",
    source: "Maisons artisanales 2025",
  },
  {
    id: "bouteille-veuve-clicquot",
    label: "Une bouteille de Veuve Clicquot Brut (75 cl)",
    hint: "En cave · pas en grande surface",
    priceEur: 55,
    image: "/images/estim/veuve-clicquot.jpg",
    emoji: "🍾",
    theme: "Bouffe",
    source: "Cavistes FR 2026",
  },
  {
    id: "petit-dej-hotel-luxe",
    label: "Un petit-déjeuner buffet au Plaza Athénée",
    hint: "Paris · par personne · 2026",
    priceEur: 65,
    image: "/images/estim/petit-dej-plaza.jpg",
    emoji: "🥞",
    theme: "Bouffe",
    source: "dorchestercollection.com 2026",
  },
  {
    id: "menu-mcdo",
    label: "Menu Big Mac complet chez McDo France",
    hint: "Maxi · 2026",
    priceEur: 11.95,
    image: "/images/estim/menu-mcdo.jpg",
    emoji: "🍔",
    theme: "Bouffe",
    source: "mcdonalds.fr 2026",
  },
  {
    id: "kebab-amiens",
    label: "Un menu kebab à Amiens (kebab + frites + boisson)",
    hint: "Restau de quartier · 2026",
    priceEur: 9.5,
    image: "/images/estim/kebab.jpg",
    emoji: "🥙",
    theme: "Bouffe",
    source: "Moyenne Amiens 2026",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SPORT & LOISIRS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "velo-tour-france-pro",
    label: "Un vélo pro de Tour de France (Pinarello F)",
    hint: "Configuration coureur · prix public",
    priceEur: 14500,
    image: "/images/estim/pinarello-f.jpg",
    emoji: "🚴",
    theme: "Sport",
    source: "pinarello.com 2026",
  },
  {
    id: "place-roland-garros",
    label: "Place finale Roland Garros (Philippe Chatrier)",
    hint: "Catégorie 1 · officielle FFT",
    priceEur: 740,
    image: "/images/estim/roland-garros.jpg",
    emoji: "🎾",
    theme: "Sport",
    source: "FFT 2025",
  },
  {
    id: "abonnement-salle-basic-fit",
    label: "Un abonnement Basic-Fit Premium (1 an)",
    hint: "Engagement 12 mois · paiement mensuel",
    priceEur: 360,
    image: "/images/estim/basic-fit.jpg",
    emoji: "💪",
    theme: "Sport",
    source: "basic-fit.com 2026",
  },
  {
    id: "club-golf-callaway",
    label: "Un driver de golf Callaway Paradym",
    hint: "Neuf · prix conseillé",
    priceEur: 599,
    image: "/images/estim/callaway-driver.jpg",
    emoji: "⛳",
    theme: "Sport",
    source: "callawaygolf.com 2026",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BIJOUX / LUXE PRÉCIS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "diamant-1-carat",
    label: "Un diamant taillé de 1 carat (qualité D-VS1)",
    hint: "GIA certifié · prix grossiste",
    priceEur: 11000,
    image: "/images/estim/diamant.jpg",
    emoji: "💎",
    theme: "Luxe",
    source: "Indice Rapaport 2026",
  },
  {
    id: "lingot-or",
    label: "Un lingot d'or de 1 kg (cours du jour)",
    hint: "Or 999 · livraison France 2026",
    priceEur: 87000,
    image: "/images/estim/lingot-or.jpg",
    emoji: "🪙",
    theme: "Luxe",
    source: "Cours LBMA 2026",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // IMMOBILIER (anchors variés)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "loyer-studio-amiens",
    label: "Loyer mensuel d'un studio à Amiens centre",
    hint: "25 m² · charges comprises · 2026",
    priceEur: 520,
    image: "/images/estim/studio-amiens.jpg",
    emoji: "🏠",
    theme: "Immobilier",
    source: "Le Bon Coin Amiens 2026",
  },
  {
    id: "loyer-studio-paris",
    label: "Loyer mensuel d'un studio à Paris (10e)",
    hint: "20 m² · charges comprises · 2026",
    priceEur: 1100,
    image: "/images/estim/studio-paris.jpg",
    emoji: "🏙️",
    theme: "Immobilier",
    source: "SeLoger Paris 2026",
  },
  {
    id: "maison-saint-tropez",
    label: "Une villa de 200 m² à Saint-Tropez (achat)",
    hint: "Avec piscine · vue mer · pas pied dans l'eau",
    priceEur: 4500000,
    image: "/images/estim/villa-saint-tropez.jpg",
    emoji: "🏖️",
    theme: "Immobilier",
    source: "MeilleursAgents 2025",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CULTURE / FUN
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "place-coupe-monde-finale",
    label: "Place finale Coupe du Monde 2022 (Qatar)",
    hint: "Catégorie 1 · officielle FIFA",
    priceEur: 1607,
    image: "/images/estim/cdm-2022.jpg",
    emoji: "🏆",
    theme: "Culture",
    source: "FIFA 2022",
  },
  {
    id: "place-cinema-amiens",
    label: "Une place de ciné au Gaumont Amiens (adulte)",
    hint: "Séance normale · 2026",
    priceEur: 11.5,
    image: "/images/estim/cine-amiens.jpg",
    emoji: "🎬",
    theme: "Culture",
    source: "Gaumont Amiens 2026",
  },
  {
    id: "place-concert-jul",
    label: "Une place fosse au concert de Jul à Bercy",
    hint: "2026 · fosse debout · billet officiel",
    priceEur: 75,
    image: "/images/estim/concert-jul.jpg",
    emoji: "🎤",
    theme: "Culture",
    source: "Live Nation 2026",
  },
  {
    id: "billet-disneyland-paris",
    label: "Un billet 1 jour 1 parc Disneyland Paris (adulte)",
    hint: "Date flexible · 2026 · plein tarif",
    priceEur: 105,
    image: "/images/estim/disneyland-paris.jpg",
    emoji: "🏰",
    theme: "Culture",
    source: "disneylandparis.com 2026",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AJOUTS 07/2026 — variété (retour playtest : "on fait vite le tour")
  // Prix stables, vérifiables, emoji fallback (pas d'image à produire).
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "nintendo-switch-2",
    label: "Une Nintendo Switch 2",
    hint: "Console neuve · prix de lancement officiel",
    priceEur: 470,
    emoji: "🎮",
    theme: "Tech",
    source: "Nintendo 2025",
  },
  {
    id: "smic-mensuel-net",
    label: "Un mois de SMIC (net, temps plein)",
    hint: "France · 35h · montant net avant impôt",
    priceEur: 1426,
    emoji: "💶",
    theme: "Société",
    source: "service-public.fr 2025",
  },
  {
    id: "maillot-equipe-france",
    label: "Le maillot officiel de l'équipe de France de foot",
    hint: "Domicile · boutique officielle · taille adulte",
    priceEur: 100,
    emoji: "🇫🇷",
    theme: "Sport",
    source: "Boutique FFF 2026",
  },
  {
    id: "lego-millennium-falcon",
    label: "Le LEGO Star Wars Millennium Falcon (7 541 pièces)",
    hint: "Ultimate Collector Series · neuf",
    priceEur: 850,
    emoji: "🧱",
    theme: "Culture",
    source: "LEGO.com 2026",
  },
  {
    id: "baby-foot-bonzini",
    label: "Un baby-foot Bonzini B90 (celui des bars)",
    hint: "Neuf · fabrication française · monnayeur",
    priceEur: 1900,
    emoji: "⚽",
    theme: "Objet",
    source: "Bonzini 2026",
  },
  {
    id: "gopro-hero-13",
    label: "Une GoPro HERO13 Black",
    hint: "Neuve · prix officiel",
    priceEur: 450,
    emoji: "📷",
    theme: "Tech",
    source: "GoPro 2024",
  },
  {
    id: "airbus-a320neo",
    label: "Un Airbus A320neo (l'avion entier)",
    hint: "Prix catalogue constructeur · neuf",
    priceEur: 98000000,
    emoji: "✈️",
    theme: "Démesure",
    source: "Prix catalogue Airbus 2018",
  },
  {
    id: "heure-vol-rafale",
    label: "Une heure de vol d'un Rafale (coût complet)",
    hint: "Estimation Cour des comptes · carburant + maintenance",
    priceEur: 25000,
    emoji: "🛩️",
    theme: "Démesure",
    source: "Cour des comptes (ordre de grandeur)",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // JOKES "INESTIMABLE" — servis à 2 % de proba par manche (estim-actions).
  // Format court qui ne casse pas le rythme (leçon du retrait 11/06/2026 :
  // l'ancien joke tombait aussi souvent qu'une vraie question → relou.
  // À 2 %, c'est un easter egg). Tout le monde gagne 50 pts, zéro scoring.
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "joke-sommeil-dev",
    label: "Une nuit complète de sommeil d'un dev avant une deadline",
    hint: "Denrée rarissime · jamais vue en stock",
    priceEur: 0,
    emoji: "💤",
    theme: "???",
    joke: true,
  },
  {
    id: "joke-recette-grand-mere",
    label: "La recette secrète du gâteau de ta grand-mère",
    hint: "Transmission orale uniquement · ingrédient mystère inclus",
    priceEur: 0,
    emoji: "🍰",
    theme: "???",
    joke: true,
  },
  {
    id: "joke-dignite-petit-bac",
    label: "Ta dignité après avoir tapé n'importe quoi au P'tit Bac",
    hint: "État : introuvable depuis la dernière partie",
    priceEur: 0,
    emoji: "🫣",
    theme: "???",
    joke: true,
  },
];

/** Durée d'un round Estim' en secondes. */
export const ESTIM_ROUND_DURATION_SEC = 25;
/** Durée du reveal avant question suivante. */
export const ESTIM_REVEAL_DURATION_SEC = 8;
/** Nombre de rounds par partie. */
export const ESTIM_TOTAL_ROUNDS = 12;

/**
 * Calcule la diff en % du vrai prix.
 *
 * @param guess  L'estimation du joueur
 * @param answer Le vrai prix
 */
export function estimDiffPercent(guess: number, answer: number): number {
  // Prix de référence à 0 € : l'écart relatif n'est pas défini. On borne
  // proprement (0 % si le joueur a aussi mis 0, sinon 100 % = totalement faux)
  // au lieu de l'ancien `guess * 100` qui donnait des écarts de milliers de %
  // et cassait le classement.
  if (answer === 0) return guess === 0 ? 0 : 100;
  return Math.abs((guess - answer) / answer) * 100;
}

export function estimPointsForDiff(diffPercent: number): number {
  if (diffPercent <= 1) return 100;
  if (diffPercent <= 5) return 80;
  if (diffPercent <= 15) return 50;
  if (diffPercent <= 30) return 25;
  return 10;
}

/** État Estim' stocké dans sessions.current_state. */
export interface EstimState {
  phase: "round" | "reveal" | "final";
  round: number;
  totalRounds: number;
  /** ID de la question courante (référence ESTIM_QUESTIONS). */
  questionId: string;
  roundStartedAt?: string;
  roundDurationSec?: number;
  revealStartedAt?: string;
  revealDurationSec?: number;
  /** IDs déjà joués (anti-doublon dans la partie). */
  playedQuestionIds?: string[];
}
