import EnteteSite from "@/components/EnteteSite";
import PiedSite from "@/components/PiedSite";

/**
 * Mentions légales (14/11/2026). Obligation LCEN art. 6 III : éditeur,
 * directeur de la publication, hébergeur. Bloquant avant l'ouverture
 * publique (CDC ARENA, « Avant ouverture »).
 * Coordonnées de VENA reprises de velito.fr/mentions-legales (même source,
 * mêmes valeurs que le Kbis).
 */
export const metadata = {
  title: "Mentions légales · ARENA",
  description: "Éditeur, hébergeur et responsabilités du site ARENA.",
};

const h2 = "mb-2 font-bold text-arena-ink";

export default function PageMentionsLegales() {
  return (
    <>
      <EnteteSite />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-arena-lilac">ARENA</p>
          <h1 className="mt-1 text-3xl font-black">Mentions légales</h1>
        </header>

        <div className="space-y-8 text-sm leading-relaxed text-arena-muted">
          <section>
            <h2 className={h2}>Éditeur</h2>
            <p>
              <strong className="text-arena-ink">VELITO EXPERTISE NUMERIQUE AMIENS</strong> (VENA),
              SASU au capital de 500 €
              <br />
              Siège social : 60 rue François Ier, 75008 Paris. Activité exercée à Amiens.
              <br />
              SIREN 935 334 672, RCS Paris 935 334 672
              <br />
              Directeur de la publication : Clavel NDEMA MOUSSA, président
              <br />
              Contact :{" "}
              <a href="mailto:contact@velito.fr" className="text-arena-violet underline">
                contact@velito.fr
              </a>
            </p>
          </section>

          <section>
            <h2 className={h2}>Hébergement</h2>
            <p>
              Site : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.
              <br />
              Base de données : Supabase, serveurs situés dans l&apos;Union européenne.
            </p>
          </section>

          <section>
            <h2 className={h2}>Qui fait quoi</h2>
            <p>
              ARENA est un outil gratuit mis à disposition des associations, clubs et structures
              qui organisent des tournois. <strong>Chaque tournoi est organisé par la structure
              indiquée sur sa page</strong> (« Organisé par ») : c&apos;est elle qui inscrit les
              joueurs, saisit et valide les scores, tranche les litiges et répond de son
              événement. VENA fournit et fait fonctionner l&apos;outil.
            </p>
          </section>

          <section>
            <h2 className={h2}>Contenus et marques</h2>
            <p>
              Les noms de jeux cités (Rocket League, EA Sports FC…) appartiennent à leurs éditeurs.
              ARENA n&apos;utilise aucune de leurs images : les illustrations du site sont
              originales. ARENA n&apos;est ni affilié, ni soutenu par ces éditeurs, ni par une
              fédération sportive.
            </p>
          </section>

          <section>
            <h2 className={h2}>Données personnelles</h2>
            <p>
              Tout est expliqué sur la page{" "}
              <a href="/confidentialite" className="text-arena-violet underline">
                Tes données
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <PiedSite />
    </>
  );
}
