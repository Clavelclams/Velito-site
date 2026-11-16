import EnteteSite from "@/components/EnteteSite";
import PiedSite from "@/components/PiedSite";
import { LIMITE_PAR_MINUTE } from "@/lib/arena/api-cles";

/**
 * Documentation de l'API publique (14/11/2026). Page statique.
 * Doctrine de complémentarité : l'accès programmatique est gratuit, et ça
 * doit se voir. Un développeur de club doit pouvoir brancher son site en
 * dix minutes en lisant cette seule page.
 */
export const metadata = {
  title: "API pour les développeurs · ARENA",
  description:
    "API publique et gratuite d'ARENA : tournois, résultats, sets, classement, en JSON. Clé gratuite depuis l'espace organisateur.",
};

const code = "block overflow-x-auto rounded-lg bg-arena-nuit p-4 font-mono text-xs leading-relaxed text-white";
const h2 = "mb-2 mt-10 text-lg font-bold text-arena-ink";

const EXEMPLE_LISTE = `curl https://arena.velito.fr/api/v1/tournois?organisation=moi&statut=EN_COURS \\
  -H "Authorization: Bearer arena_ta_cle"`;

const REPONSE_LISTE = `{
  "tournois": [
    {
      "token": "6f1c…",
      "titre": "Tournoi padel de novembre",
      "jeu": "Padel",
      "discipline": "SPORT",
      "format": "ELIMINATION_SIMPLE",
      "taille_equipe": 2,
      "statut": "EN_COURS",
      "date_debut": "2026-11-21T14:00:00+00:00",
      "lieu": "Amiens",
      "url": "https://arena.velito.fr/t/6f1c…",
      "detail": "/api/v1/tournois/6f1c…"
    }
  ],
  "total": 1, "page": 1, "limite": 50
}`;

const EXEMPLE_JS = `// Côté serveur (Node, PHP, Python…) : la clé ne doit pas finir
// dans le code envoyé au navigateur.
const reponse = await fetch(
  "https://arena.velito.fr/api/v1/tournois/" + token,
  { headers: { Authorization: "Bearer " + process.env.ARENA_API_KEY } }
);
const tournoi = await reponse.json();
for (const match of tournoi.matchs) {
  console.log(match.tour, match.camp1, match.score_camp1, "-", match.score_camp2, match.camp2);
}`;

export default function PageDeveloppeurs() {
  return (
    <>
      <EnteteSite />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-arena-lilac">
            ARENA · Développeurs
          </p>
          <h1 className="mt-1 text-3xl font-black">L&apos;API publique</h1>
          <p className="mt-3 text-sm leading-relaxed text-arena-muted">
            Tes tournois, tes résultats et le classement, en JSON, pour ton site de club, ton
            bot Discord ou ton tableur. <strong>Gratuit, sans abonnement</strong> : les résultats
            appartiennent à ceux qui les jouent et à ceux qui les organisent.
          </p>
        </header>

        <div className="text-sm leading-relaxed text-arena-muted">
          <h2 className={h2}>1. Obtenir une clé</h2>
          <p>
            Dans l&apos;espace organisateur, menu <strong>API</strong> : donne un nom à la clé
            (« Site du club ») et copie-la tout de suite, elle n&apos;est affichée qu&apos;une
            fois. Tu peux la révoquer à tout moment. Pas d&apos;organisation sur ARENA ?
            Écris à <a href="mailto:contact@velito.fr" className="text-arena-violet underline">contact@velito.fr</a>.
          </p>

          <h2 className={h2}>2. S&apos;authentifier</h2>
          <p className="mb-3">
            Envoie la clé dans l&apos;en-tête <code>Authorization: Bearer arena_…</code> (ou{" "}
            <code>X-Api-Key</code>). Jamais dans l&apos;adresse : une URL finit dans les journaux
            des serveurs. Appelle l&apos;API depuis ton serveur plutôt que depuis le navigateur,
            pour que la clé reste privée.
          </p>

          <h2 className={h2}>3. Les routes</h2>
          <ul className="space-y-3">
            <li>
              <code className="font-semibold text-arena-ink">GET /api/v1/tournois</code> : les tournois
              publiés, du plus récent au plus ancien. Filtres : <code>statut</code> (OUVERT,
              EN_COURS, TERMINE, ANNULE), <code>discipline</code> (ESPORT, SPORT), <code>jeu</code>{" "}
              (libellé exact, par exemple « Padel »), <code>organisation=moi</code> (seulement les
              tiens), <code>limite</code> (1 à 100) et <code>page</code>.
            </li>
            <li>
              <code className="font-semibold text-arena-ink">GET /api/v1/tournois/&#123;token&#125;</code> :
              un tournoi complet, participants, équipes, matchs, scores, détail des sets (padel,
              ping-pong) et terrains. Format <code>arena-export-v2</code>, le même que
              l&apos;export JSON de la page du tournoi.
            </li>
            <li>
              <code className="font-semibold text-arena-ink">GET /api/v1/classement</code> : le
              classement par points (champion +3, finaliste +2, demi-finaliste +1). Filtres :{" "}
              <code>discipline</code>, <code>limite</code> (1 à 200).
            </li>
          </ul>

          <p className="mt-4 mb-2 font-semibold text-arena-ink">Exemple</p>
          <pre className={code}>{EXEMPLE_LISTE}</pre>
          <pre className={`${code} mt-2`}>{REPONSE_LISTE}</pre>
          <pre className={`${code} mt-2`}>{EXEMPLE_JS}</pre>

          <h2 className={h2}>4. Limites et erreurs</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              {LIMITE_PAR_MINUTE} requêtes par minute et par clé. Les en-têtes{" "}
              <code>X-RateLimit-Remaining</code> et, en cas de dépassement, <code>Retry-After</code>{" "}
              te disent où tu en es.
            </li>
            <li>
              Les erreurs ont toujours la même forme :{" "}
              <code>{`{"erreur": {"code": "…", "message": "…"}}`}</code>. Codes : 401 <code>cle_absente</code> ou{" "}
              <code>cle_invalide</code>, 404 <code>introuvable</code>, 429{" "}
              <code>trop_de_requetes</code>, 503 <code>indisponible</code>.
            </li>
            <li>Pas de cache côté ARENA : pendant un tournoi, les scores changent à chaque match.</li>
          </ul>

          <h2 className={h2}>5. Ce que l&apos;API ne montrera jamais</h2>
          <p>
            La clé ne donne <strong>aucun droit de plus</strong> qu&apos;un visiteur du site :
            pas de tournoi en brouillon, pas d&apos;année de naissance, pas d&apos;adresse, pas de
            note de niveau. Un joueur mineur en profil restreint n&apos;apparaît dans aucun
            classement, et un joueur qui a demandé l&apos;effacement de ses données apparaît comme
            « Anonyme ». En utilisant l&apos;API, tu t&apos;engages à respecter ces choix : pas de
            recoupement pour retrouver qui se cache derrière un pseudo.
          </p>

          <h2 className={h2}>6. Sans clé</h2>
          <p>
            Pour un usage ponctuel, chaque page de tournoi propose ses résultats en CSV et en JSON,
            sans compte ni clé. Et pour afficher un tableau en direct sur ton site, le widget à
            intégrer se trouve sur la page staff du tournoi.
          </p>
        </div>
      </main>
      <PiedSite />
    </>
  );
}
