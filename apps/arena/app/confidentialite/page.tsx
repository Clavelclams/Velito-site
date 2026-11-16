import EnteteSite from "@/components/EnteteSite";
import PiedSite from "@/components/PiedSite";

/**
 * Politique de confidentialité (14/11/2026), écrite à partir de ce que le
 * code fait VRAIMENT (schéma sql/001 à 014, lib/arena/age.ts, actions) :
 * une politique qui promet autre chose que le code est pire que pas de
 * politique. Toute nouvelle donnée collectée doit être ajoutée ici.
 */
export const metadata = {
  title: "Tes données · ARENA",
  description:
    "Ce qu'ARENA enregistre, pourquoi, combien de temps, et comment faire effacer tes données.",
};

const h2 = "mb-2 font-bold text-arena-ink";

export default function PageConfidentialite() {
  return (
    <>
      <EnteteSite />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-arena-lilac">ARENA</p>
          <h1 className="mt-1 text-3xl font-black">Tes données</h1>
          <p className="mt-3 text-sm text-arena-muted">
            Version courte : un pseudo, ton année de naissance, tes résultats. Pas de publicité,
            pas de revente, pas de traceur.
          </p>
        </header>

        <div className="space-y-8 text-sm leading-relaxed text-arena-muted">
          <section>
            <h2 className={h2}>Qui est responsable</h2>
            <p>
              La <strong>structure qui organise le tournoi</strong> (indiquée sur la page du tournoi)
              décide d&apos;inscrire les joueurs et de publier les résultats : elle est responsable
              de ces données. VENA (voir les{" "}
              <a href="/mentions-legales" className="text-arena-violet underline">mentions légales</a>)
              héberge l&apos;outil et les traite pour son compte. Pour ton compte Velito et ton
              espace joueur, VENA est responsable.
            </p>
          </section>

          <section>
            <h2 className={h2}>Ce qui est enregistré</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Ton pseudo</strong>, choisi par toi ou par le staff. Pas de nom, pas de
                photo, pas d&apos;adresse.
              </li>
              <li>
                <strong>Ton année de naissance</strong>, seulement l&apos;année, jamais la date
                complète. Elle sert à une seule chose : savoir si tu es mineur, pour te protéger.
                Elle n&apos;est jamais affichée.
              </li>
              <li>
                <strong>Tes participations et tes résultats</strong> : tournois, matchs, scores,
                présence le jour J.
              </li>
              <li>
                <strong>Une note de niveau interne</strong> (type ELO), calculée à partir des
                résultats. Elle sert uniquement au staff pour faire des poules équilibrées. Elle
                n&apos;est jamais publiée, ni sur le site, ni dans l&apos;API.
              </li>
              <li>
                Si tu te connectes : le lien entre ton pseudo et ton <strong>compte Velito</strong>{" "}
                (adresse e-mail gérée par le hub Velito). Ton adresse n&apos;est montrée qu&apos;au
                staff qui valide une demande de rattachement.
              </li>
              <li>
                Un <strong>journal</strong> des actions du staff (score saisi, validé, modifié) pour
                pouvoir trancher un litige.
              </li>
            </ul>
          </section>

          <section>
            <h2 className={h2}>Les mineurs</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Un joueur mineur passe automatiquement en <strong>profil restreint</strong> : il
                n&apos;apparaît dans aucun classement public, ni dans l&apos;API.
              </li>
              <li>
                Sous 15 ans, l&apos;accord d&apos;un parent est nécessaire (loi Informatique et
                Libertés, art. 45). Le staff ne peut pas pointer le joueur avant de l&apos;avoir
                reçu.
              </li>
              <li>
                Dans le doute sur l&apos;âge (on ne connaît que l&apos;année), ARENA protège : un
                joueur est considéré mineur jusqu&apos;à l&apos;année où il a 18 ans à coup sûr.
              </li>
            </ul>
          </section>

          <section>
            <h2 className={h2}>Ce qui est public</h2>
            <p>
              La page d&apos;un tournoi publié (pseudos, matchs, scores), le classement et les
              profils des joueurs majeurs. Ces informations sont aussi disponibles en export et
              par l&apos;API publique, avec les mêmes protections.
            </p>
          </section>

          <section>
            <h2 className={h2}>Cookies</h2>
            <p>
              Un seul cookie, et seulement si tu te connectes : la session de ton compte Velito,
              nécessaire pour rester connecté. Aucun cookie de mesure d&apos;audience, aucun
              traceur publicitaire, donc aucun bandeau à accepter.
            </p>
          </section>

          <section>
            <h2 className={h2}>Combien de temps</h2>
            <p>
              Les résultats d&apos;un tournoi forment son histoire : ils sont gardés tant
              qu&apos;ARENA existe, sauf si tu demandes l&apos;effacement. Le journal du staff est
              gardé pour pouvoir trancher un litige ; il ne contient aucune donnée sur toi en
              dehors du résultat.
            </p>
          </section>

          <section>
            <h2 className={h2}>Tes droits</h2>
            <p>
              Tu peux demander à voir tes données, à les corriger ou à les{" "}
              <strong>effacer</strong>. L&apos;effacement remplace ton pseudo par un identifiant
              neutre et retire ton année de naissance et ton compte : tes matchs restent dans les
              tableaux (sinon le tournoi n&apos;aurait plus de sens), mais personne ne peut plus
              savoir que c&apos;était toi. Écris au staff du tournoi ou à{" "}
              <a href="mailto:contact@velito.fr" className="text-arena-violet underline">
                contact@velito.fr
              </a>
              . Réponse sous un mois au plus. Si tu n&apos;es pas satisfait, tu peux saisir la CNIL
              (cnil.fr).
            </p>
          </section>
        </div>
      </main>
      <PiedSite />
    </>
  );
}
