/**
 * DOMAINES DES PARCOURS — constantes SANS fs (importables côté client).
 *
 * Seize parcours en vrac ne se lisent plus. On les regroupe en cinq domaines
 * qui racontent un chemin : les bases → ton backend → ton frontend → le
 * métier de dev → les jeux. L'ordre des domaines est l'ordre conseillé ;
 * l'ordre des parcours dans un domaine est celui de `ordre` dans
 * _parcours.json. Un parcours sans domaine reconnu tombe dans « autres ».
 */
export type Domaine = "bases" | "backend" | "frontend" | "metier" | "jeux" | "autres";

export interface InfosDomaine {
  cle: Domaine;
  titre: string;
  sousTitre: string;
  icone: string;
}

export const DOMAINES: InfosDomaine[] = [
  {
    cle: "bases",
    titre: "Les bases",
    sousTitre: "Ce que tout le reste suppose acquis. Commence ici si tu pars de zéro.",
    icone: "🧱",
  },
  {
    cle: "backend",
    titre: "Ton backend",
    sousTitre: "Symfony pour Venaball, Supabase pour Velito-site, et l'API qui relie le mobile au serveur.",
    icone: "⚙️",
  },
  {
    cle: "frontend",
    titre: "Ton frontend",
    sousTitre: "Next.js pour les sites, React Native pour l'app. Ce que tu vibe-codes le plus.",
    icone: "🖥️",
  },
  {
    cle: "metier",
    titre: "Le métier de dev",
    sousTitre: "Git, tests, sécurité, déploiement : ce qui distingue un projet qui marche d'un projet qu'on peut défendre.",
    icone: "🛠️",
  },
  {
    cle: "jeux",
    titre: "Jeux",
    sousTitre: "Roblox et Luau : une app client-serveur temps réel, avec les mêmes règles que ton web.",
    icone: "🎮",
  },
  {
    cle: "autres",
    titre: "Autres parcours",
    sousTitre: "",
    icone: "📚",
  },
];

/** Normalise une valeur venue d'un _parcours.json vers un domaine connu. */
export function domaineValide(valeur: unknown): Domaine {
  const connus: Domaine[] = ["bases", "backend", "frontend", "metier", "jeux"];
  return typeof valeur === "string" && (connus as string[]).includes(valeur)
    ? (valeur as Domaine)
    : "autres";
}
