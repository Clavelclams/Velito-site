/**
 * Règlement type des tournois ARENA — statique, comme la prévention.
 * Un règlement publié = un tournoi sérieux : les décisions d'arbitrage
 * s'appuient sur un texte que tout le monde a pu lire AVANT de jouer.
 */
export const metadata = {
  title: "Règlement des tournois — ARENA",
  description:
    "Règlement type des tournois ARENA : inscriptions, check-in, déroulement des matchs, litiges et fair-play.",
};

export default function PageReglement() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-arena-lilac">
          ARENA · Règlement type
        </p>
        <h1 className="mt-1 text-3xl font-black">Règlement des tournois</h1>
        <p className="mt-3 text-sm text-gray-400">
          Ce règlement s&apos;applique par défaut à tous les tournois ARENA.
          L&apos;organisation peut le compléter par des règles propres au jeu,
          annoncées avant le début du tournoi.
        </p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed text-gray-300">
        <section>
          <h2 className="mb-2 font-bold text-white">1. Inscriptions et check-in</h2>
          <p>
            L&apos;inscription se fait auprès du staff, sous un pseudo unique.
            Le jour du tournoi, chaque joueur doit se présenter au check-in
            avant l&apos;heure limite annoncée. <strong>Un joueur non
            check-in au lancement n&apos;est pas placé dans le bracket</strong> —
            c&apos;est ce qui garantit un tournoi sans forfaits en cascade.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold text-white">2. Format et déroulement</h2>
          <p>
            Les tournois se jouent en élimination directe. Le bracket est généré
            automatiquement par tirage au sort au lancement ; les byes
            (exemptions de premier tour) sont attribués par le tirage lorsque le
            nombre de joueurs n&apos;est pas une puissance de deux. Le format
            des matchs (BO1, BO3…) est annoncé avant le début du tournoi.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold text-white">3. Scores et validation</h2>
          <p>
            À la fin de chaque match, le résultat est annoncé au staff, qui le
            saisit puis le valide — la validation est définitive et fait
            avancer le gagnant. En cas de désaccord sur un score,{" "}
            <strong>le signaler AVANT la validation</strong> : c&apos;est le
            staff qui tranche, en dernier recours l&apos;organisateur principal.
            Toutes les saisies et modifications sont historisées.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold text-white">4. Retards et forfaits</h2>
          <p>
            Un joueur absent à l&apos;appel de son match dispose de 5 minutes
            avant d&apos;être déclaré forfait pour ce match. Le staff peut
            adapter ce délai selon les contraintes de la salle, en
            l&apos;annonçant à tous.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold text-white">5. Fair-play</h2>
          <p>
            Insultes, triche, comportement antisportif envers un joueur, un
            spectateur ou le staff : avertissement, puis disqualification en cas
            de récidive — sans remboursement des frais d&apos;inscription
            éventuels. L&apos;esprit ARENA : on joue dur, on respecte tout le
            monde. Les mineurs sont sous la responsabilité des encadrants
            présents, conformément aux engagements de l&apos;organisation (voir{" "}
            <a href="/prevention" className="text-arena-lilac underline">
              notre page prévention
            </a>
            ).
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold text-white">6. Litiges</h2>
          <p>
            Tout litige non prévu par ce règlement est arbitré par
            l&apos;organisateur principal du tournoi. Ses décisions sont
            définitives pour la durée de l&apos;événement.
          </p>
        </section>
      </div>

      <footer className="mt-12 text-center text-xs text-gray-600">
        <a href="/" className="underline hover:text-gray-400">
          ← Retour aux tournois
        </a>
      </footer>
    </div>
  );
}
