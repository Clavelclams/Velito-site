/**
 * Avatar system — source de vérité des personnages, fonds et accessoires.
 *
 * ─── Pourquoi ce design (à dire au jury CDA) ────────────────────────────────
 *
 * On utilise le service DiceBear (https://dicebear.com) qui génère des avatars
 * SVG uniques à partir d'un "seed" (chaîne déterministe). Avantages :
 *  - Pas besoin de stocker des fichiers PNG côté serveur
 *  - Pas de clé API requise, free tier illimité
 *  - SVG = scalable infiniment (mobile, écran TV 4K…)
 *  - Le seed est reproductible : le même seed → exactement le même avatar
 *
 * Notre stratégie :
 *  - 20 "seeds" pré-choisis = 20 personnages distincts (ANISSA, MARCUS, etc.)
 *  - 4 couleurs de fond modulables (palette Velito néon)
 *  - 3 styles d'accessoires (rond, soleil, aucun)
 *  - On compose tout en une URL et on rend l'image — pas de pipeline complexe
 *
 * ─── Pourquoi pas un set d'images custom dessinées ───────────────────────────
 *
 * Pour le MVP, dessiner 20 personnages à la main est trop chronophage et
 * non-scalable (si on veut ajouter 10 persos plus tard, il faut un illustrateur).
 * DiceBear donne déjà 20 looks distincts en 5 minutes de config. Si plus tard
 * on veut un style 100% Velito custom, on remplacera l'URL DiceBear par
 * notre propre service de rendu — l'interface AvatarConfig reste la même.
 *
 * ─── Format d'une URL DiceBear ──────────────────────────────────────────────
 *
 *   https://api.dicebear.com/9.x/avataaars/svg?seed=Anissa&backgroundColor=8b5cf6&...
 *
 * Style choisi : `avataaars` (look Mii cartoon, le plus reconnaissable).
 */

/** Personnage de base — 40 choix prédéfinis, 20 par tone. */
export interface AvatarBase {
  id: string;
  label: string;
  /** Seed DiceBear (chaîne arbitraire) — détermine le look visuel. */
  seed: string;
  /**
   * Tonalité du perso : "gentil" (ambiance claire/positive) ou "mechant"
   * (ambiance sombre/intense). Pilote à la fois le filtrage de la galerie
   * ET la palette de fonds disponible (Gentil = pastels, Méchant = sombres).
   */
  tone: AvatarTone;
}

/**
 * 40 personnages : 20 féminins + 20 masculins.
 * Mix volontairement international : prénoms français, arabes, africains,
 * asiatiques, hispaniques, anglo-saxons, et surnoms perso de Clavel.
 *
 * Note : le `gender` ici sert seulement à la filtre galerie. DiceBear
 * détermine le visuel via le seed (déterministe mais aléatoire en genre).
 */
export const AVATAR_BASES: AvatarBase[] = [
  // ═══════════ GENTILS (20) ═══════════
  { id: "akayou", label: "Akayou", seed: "Akayou", tone: "gentil" },
  { id: "carambar", label: "Carambar", seed: "Carambar", tone: "gentil" },
  { id: "maeva", label: "Maeva", seed: "Maeva", tone: "gentil" },
  { id: "may", label: "May", seed: "May-V", tone: "gentil" },
  { id: "maya", label: "Maya", seed: "Maya-V", tone: "gentil" },
  { id: "jeanne", label: "Jeanne", seed: "Jeanne", tone: "gentil" },
  { id: "mirice", label: "Mirice", seed: "Mirice", tone: "gentil" },
  { id: "claire", label: "Claire", seed: "Claire", tone: "gentil" },
  { id: "prefy", label: "Prefy", seed: "Prefy", tone: "gentil" },
  { id: "alizee", label: "Alizée", seed: "Alizee", tone: "gentil" },
  { id: "alice", label: "Alice", seed: "Alice-V", tone: "gentil" },
  { id: "tesnime", label: "Tesnime", seed: "Tesnime", tone: "gentil" },
  { id: "thea", label: "Théa", seed: "Thea", tone: "gentil" },
  { id: "yasmina", label: "Yasmina", seed: "Yasmina", tone: "gentil" },
  { id: "judith", label: "Judith", seed: "Judith", tone: "gentil" },
  { id: "kenza", label: "Kenza", seed: "Kenza", tone: "gentil" },
  { id: "lin", label: "Lin", seed: "Lin-V", tone: "gentil" },
  { id: "sofia", label: "Sofia", seed: "Sofia-V", tone: "gentil" },
  { id: "adele", label: "Adèle", seed: "Adele", tone: "gentil" },
  { id: "inaya", label: "Inaya", seed: "Inaya", tone: "gentil" },

  // ═══════════ MÉCHANTS (20) ═══════════
  { id: "albert", label: "Albert", seed: "Albert", tone: "mechant" },
  { id: "will", label: "Will", seed: "Will", tone: "mechant" },
  { id: "nelson", label: "Nelson", seed: "Nelson", tone: "mechant" },
  { id: "sylver", label: "Sylver", seed: "Sylver", tone: "mechant" },
  { id: "gon", label: "Gon", seed: "Gon-Velito", tone: "mechant" },
  { id: "bakary", label: "Bakary", seed: "Bakary", tone: "mechant" },
  { id: "noah", label: "Noah", seed: "Noah-V", tone: "mechant" },
  { id: "elias", label: "Elias", seed: "Elias-V", tone: "mechant" },
  { id: "tony", label: "Tony", seed: "Tony-V", tone: "mechant" },
  { id: "nasso", label: "Nasso", seed: "Nasso", tone: "mechant" },
  { id: "leny", label: "Leny", seed: "Leny", tone: "mechant" },
  { id: "momo", label: "Momo", seed: "Momo-V", tone: "mechant" },
  { id: "paul", label: "Paul", seed: "Paul-V", tone: "mechant" },
  { id: "jean", label: "Jean", seed: "Jean-V", tone: "mechant" },
  { id: "kenji", label: "Kenji", seed: "Kenji", tone: "mechant" },
  { id: "karim", label: "Karim", seed: "Karim", tone: "mechant" },
  { id: "luca", label: "Luca", seed: "Luca-V", tone: "mechant" },
  { id: "yannick", label: "Yannick", seed: "Yannick", tone: "mechant" },
  { id: "diego", label: "Diego", seed: "Diego", tone: "mechant" },
  { id: "eshan", label: "Eshan", seed: "Eshan", tone: "mechant" },
];

/**
 * Tonalité d'un fond — détermine si le perso est "Gentil" (fond clair, pastel)
 * ou "Méchant" (fond sombre, intense).
 */
export type AvatarTone = "gentil" | "mechant";

/** Couleur de fond — palette Velito (alignée avec neon-* + nouveaux pastels). */
export interface AvatarBackground {
  id: string;
  /** Hex sans le `#` (DiceBear l'attend comme ça). */
  hex: string;
  label: string;
  /** Catégorie : "gentil" (clair/pastel) ou "mechant" (sombre/intense). */
  tone: AvatarTone;
}

export const AVATAR_BACKGROUNDS: AvatarBackground[] = [
  // ═══ Gentil (4 couleurs claires/pastels) ═══
  { id: "rose-clair", hex: "fbcfe8", label: "Rose pâle", tone: "gentil" },
  { id: "ciel", hex: "bae6fd", label: "Bleu ciel", tone: "gentil" },
  { id: "mint", hex: "bbf7d0", label: "Mint", tone: "gentil" },
  { id: "peche", hex: "fed7aa", label: "Pêche", tone: "gentil" },

  // ═══ Méchant (4 couleurs sombres/intenses) ═══
  { id: "violet-sombre", hex: "4c1d95", label: "Violet sombre", tone: "mechant" },
  { id: "rouge-sang", hex: "991b1b", label: "Rouge sang", tone: "mechant" },
  { id: "vert-toxique", hex: "14532d", label: "Vert toxique", tone: "mechant" },
  { id: "bleu-nuit", hex: "1e3a8a", label: "Bleu nuit", tone: "mechant" },
];

/** Accessoires sur les yeux. */
export interface AvatarAccessory {
  id: string;
  label: string;
  /** Valeur passée à DiceBear (`accessories=` query). null = aucun. */
  dicebearKey: string | null;
}

export const AVATAR_ACCESSORIES: AvatarAccessory[] = [
  { id: "none", label: "Aucun", dicebearKey: null },
  { id: "round", label: "Rondes", dicebearKey: "round" },
  { id: "sunglasses", label: "Soleil", dicebearKey: "sunglasses" },
];

/**
 * État d'un avatar choisi par un joueur.
 * Sérialisable en JSON → stockable en localStorage, en cookie ou en JSONB Postgres.
 */
export interface AvatarConfig {
  base: string;
  background: string;
  /** ID dans AVATAR_ACCESSORIES ; "none" si aucun. */
  accessory: string;
}

/** Avatar par défaut servi au premier chargement.
 * Base "Akayou" + fond Gentil "rose-clair" → ouvre sur l'onglet "Gentil". */
export const DEFAULT_AVATAR: AvatarConfig = {
  base: "akayou",
  background: "rose-clair",
  accessory: "none",
};

/**
 * Construit l'URL DiceBear correspondant à un AvatarConfig.
 *
 * @param config — état des trois axes (base, fond, accessoire)
 * @param options.size — taille rendue en pixels (optionnel ; DiceBear redimensionne)
 */
export function buildAvatarUrl(
  config: AvatarConfig,
  options?: { size?: number }
): string {
  const base =
    AVATAR_BASES.find((b) => b.id === config.base) ?? AVATAR_BASES[0]!;
  const bg =
    AVATAR_BACKGROUNDS.find((b) => b.id === config.background) ??
    AVATAR_BACKGROUNDS[0]!;
  const acc = AVATAR_ACCESSORIES.find((a) => a.id === config.accessory);

  const params = new URLSearchParams();
  params.set("seed", base.seed);
  params.set("backgroundColor", bg.hex);
  // backgroundType="solid" pour avoir un aplat (sinon DiceBear met un dégradé).
  params.set("backgroundType", "solid");

  // NOTE forçage genre : retiré (mes noms d'options DiceBear étaient invalides,
  // résultat = 400 Bad Request → tous les avatars cassés).
  // Le `gender` reste utilisé pour filtrer la GALERIE côté UI (toggle
  // Filles/Garçons fonctionne), mais le rendu DiceBear lui-même est libre.
  // → Peut donner des incohérences visuelles (Akayou rendu masculin par ex)
  // → À corriger plus tard avec une vraie recherche sur la doc DiceBear v9

  if (acc?.dicebearKey) {
    params.set("accessoriesProbability", "100");
    params.set("accessories", acc.dicebearKey);
  } else {
    params.set("accessoriesProbability", "0");
  }

  if (options?.size) {
    params.set("size", String(options.size));
  }

  return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`;
}

/**
 * Helper pour parser un AvatarConfig depuis un JSON inconnu (cookie, query, DB).
 * Retourne DEFAULT_AVATAR si malformé — pas de crash.
 */
export function parseAvatarConfig(raw: unknown): AvatarConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_AVATAR;
  const obj = raw as Record<string, unknown>;
  return {
    base:
      typeof obj.base === "string" &&
      AVATAR_BASES.some((b) => b.id === obj.base)
        ? obj.base
        : DEFAULT_AVATAR.base,
    background:
      typeof obj.background === "string" &&
      AVATAR_BACKGROUNDS.some((b) => b.id === obj.background)
        ? obj.background
        : DEFAULT_AVATAR.background,
    accessory:
      typeof obj.accessory === "string" &&
      AVATAR_ACCESSORIES.some((a) => a.id === obj.accessory)
        ? obj.accessory
        : DEFAULT_AVATAR.accessory,
  };
}
