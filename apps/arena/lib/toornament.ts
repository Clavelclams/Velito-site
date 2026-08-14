/**
 * Client Toornament — Viewer API v2 (developer.toornament.com).
 *
 * POURQUOI TOORNAMENT : positionnement acté le 13/08/2026 — ARENA ne
 * concurrence pas les grandes plateformes, il les COMPLÈTE. Le profil ARENA
 * est un « CV esport » : un résultat obtenu ailleurs doit pouvoir s'y
 * afficher, avec un lien vers la source pour que chacun puisse vérifier.
 *
 * POURQUOI LA VIEWER API : Toornament expose trois APIs. La Viewer API sert
 * les données PUBLIQUES d'un tournoi (infos, classement final) avec une
 * simple clé d'API — pas d'OAuth, pas d'accès aux données privées. C'est
 * exactement notre besoin : lecture seule de ce que tout le monde voit déjà
 * sur toornament.com. Les APIs Organizer/Participant demanderaient des
 * autorisations qu'on n'a aucune raison de détenir.
 *
 * ARCHITECTURE : ce module sépare strictement
 *   - le PARSING d'URL et la mise en forme (fonctions pures, testées),
 *   - les APPELS réseau (fonctions async, non testées unitairement — on ne
 *     teste pas le réseau, on teste ce qu'on fait des réponses).
 */

// ---------------------------------------------------------------------------
// Partie PURE (testée dans toornament.test.ts)
// ---------------------------------------------------------------------------

/**
 * Extrait l'identifiant de tournoi d'une URL toornament.com collée par un
 * humain. Formats réels rencontrés :
 *   https://www.toornament.com/fr/tournaments/386310599608992768/information
 *   https://www.toornament.com/en_US/tournaments/386310599608992768
 *   https://play.toornament.com/fr/tournaments/386310599608992768/...
 *
 * Retourne null (jamais d'exception) si l'URL ne ressemble pas à un tournoi
 * Toornament : l'appelant transforme ce null en message d'erreur clair.
 * On vérifie le DOMAINE et pas seulement le motif du chemin : accepter
 * n'importe-quel-site.com/tournaments/123 ouvrirait la porte à des imports
 * « vérifiables » qui ne pointent pas vers Toornament.
 */
export function extraireIdTournoiToornament(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const domaineOk =
    u.hostname === "toornament.com" || u.hostname.endsWith(".toornament.com");
  if (!domaineOk) return null;
  // L'id Toornament est un entier long (snowflake) : uniquement des chiffres.
  const m = u.pathname.match(/\/tournaments\/(\d{5,30})(\/|$)/);
  return m ? m[1]! : null;
}

/**
 * Compare deux pseudos de façon tolérante : casse, accents et espaces
 * superflus ignorés. « Léa  » et « lea » désignent la même personne — exiger
 * l'égalité stricte ferait échouer la moitié des imports pour des détails
 * de saisie.
 */
export function memePseudo(a: string, b: string): boolean {
  const normaliser = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  return normaliser(a) === normaliser(b) && normaliser(a).length > 0;
}

/** « 3e / 16 » — mise en forme d'un rang pour l'affichage public. */
export function libelleRang(rang: number | null, nbParticipants: number | null): string {
  if (rang === null) return "A participé";
  const suffixe = rang === 1 ? "er" : "e";
  return nbParticipants
    ? `${rang}${suffixe} / ${nbParticipants}`
    : `${rang}${suffixe}`;
}

// ---------------------------------------------------------------------------
// Partie RÉSEAU (Viewer API v2)
// ---------------------------------------------------------------------------

/** Sous-ensemble des champs du tournoi qui nous servent. */
export interface TournoiToornament {
  id: string;
  name: string;
  full_name?: string | null;
  discipline: string;
  size?: number | null;
  scheduled_date_end?: string | null;
}

/** Une ligne du classement final Toornament. */
export interface RangToornament {
  rank: number | null;
  participant: { name: string } | null;
}

const BASE = "https://api.toornament.com/viewer/v2";

function cleApi(): string {
  const cle = process.env.TOORNAMENT_API_KEY;
  if (!cle) {
    // On nomme la variable (jamais sa valeur) : même convention de diagnostic
    // que l'écran « variables manquantes » de /admin.
    throw new Error(
      "Import Toornament non configuré : variable TOORNAMENT_API_KEY absente (clé gratuite sur developer.toornament.com)."
    );
  }
  return cle;
}

/** GET authentifié vers la Viewer API. `range` est l'en-tête de pagination
 *  exigé par Toornament sur les collections (réponses 206 Partial Content). */
async function appelViewer(chemin: string, range?: string): Promise<Response> {
  const reponse = await fetch(`${BASE}${chemin}`, {
    headers: {
      "X-Api-Key": cleApi(),
      ...(range ? { Range: range } : {}),
    },
    // Un import est un acte ponctuel décidé par un humain : on veut la donnée
    // du moment, pas une version en cache de Next.
    cache: "no-store",
  });
  if (reponse.status === 401 || reponse.status === 403) {
    throw new Error("Clé Toornament refusée : vérifie TOORNAMENT_API_KEY.");
  }
  if (reponse.status === 404) {
    throw new Error(
      "Tournoi introuvable sur Toornament : vérifie le lien (le tournoi doit être public)."
    );
  }
  if (!reponse.ok && reponse.status !== 206) {
    throw new Error(`Toornament a répondu ${reponse.status} — réessaie plus tard.`);
  }
  return reponse;
}

/** Fiche publique du tournoi. */
export async function recupererTournoiToornament(
  id: string
): Promise<TournoiToornament> {
  const reponse = await appelViewer(`/tournaments/${id}`);
  return (await reponse.json()) as TournoiToornament;
}

/**
 * Cherche le rang d'un participant dans le classement final.
 *
 * La Viewer API pagine par en-tête Range (50 max par page). On s'arrête à
 * 200 lignes : ARENA vise des tournois locaux — si le joueur est au-delà de
 * la 200e place, l'intérêt CV du résultat est de toute façon discutable, et
 * on borne le nombre d'appels faits à une API tierce.
 */
export async function chercherRangParticipant(
  tournoiId: string,
  nomParticipant: string
): Promise<{ rang: number | null; nomTrouve: string } | null> {
  for (let page = 0; page < 4; page++) {
    const debut = page * 50;
    const reponse = await appelViewer(
      `/tournaments/${tournoiId}/standings`,
      `items=${debut}-${debut + 49}`
    );
    const lignes = (await reponse.json()) as RangToornament[];
    for (const ligne of lignes) {
      const nom = ligne.participant?.name;
      if (nom && memePseudo(nom, nomParticipant)) {
        return { rang: ligne.rank ?? null, nomTrouve: nom };
      }
    }
    // Page incomplète = fin de collection : inutile d'appeler la suivante.
    if (lignes.length < 50) break;
  }
  return null;
}
