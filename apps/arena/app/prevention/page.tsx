/**
 * Page prévention — contenu STATIQUE (décision du cadrage V1 : pas de module
 * dynamique, un contenu sérieux suffit et c'est un vrai plus pour les dossiers
 * de subvention : ARENA n'est pas juste une plateforme de compétition, c'est
 * un outil d'esport responsable, aligné avec la mission d'inclusion de VEA).
 */
export const metadata = {
  title: "Prévention et esport responsable · ARENA",
  description:
    "Repères pour une pratique saine de l'esport : temps d'écran, signalétique PEGI, santé physique et ressources d'aide.",
};

export default function PagePrevention() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-arena-lilac">
          ARENA · Esport responsable
        </p>
        <h1 className="mt-1 text-3xl font-black">Jouer, progresser, se préserver</h1>
        <p className="mt-3 text-arena-muted">
          L&apos;esport est un vrai terrain de progression : concentration,
          esprit d&apos;équipe, gestion de la pression. Comme tout sport, il se
          pratique avec des repères. Les nôtres sont là.
        </p>
      </header>

      <div className="space-y-8">
        <section className="rounded-lg border border-arena-border bg-arena-surface shadow-carte p-5">
          <h2 className="font-bold text-arena-lilac">⏱️ Le temps de jeu</h2>
          <p className="mt-2 text-sm leading-relaxed text-arena-muted">
            Le problème n&apos;est pas de jouer, c&apos;est de ne faire que ça.
            Un bon repère : des sessions avec une heure de fin décidée{" "}
            <em>avant</em> de lancer le jeu, des vraies pauses toutes les heures,
            et pas d&apos;écran dans l&apos;heure avant de dormir. Le sommeil est le
            premier facteur de performance, en compétition comme en cours.
            Si le jeu passe systématiquement avant le sommeil, les repas ou les
            gens, c&apos;est le signal pour en parler.
          </p>
        </section>

        <section className="rounded-lg border border-arena-border bg-arena-surface shadow-carte p-5">
          <h2 className="font-bold text-arena-lilac">🔞 La signalétique PEGI</h2>
          <p className="mt-2 text-sm leading-relaxed text-arena-muted">
            Les jeux affichent un âge minimum (PEGI 3, 7, 12, 16, 18) et des
            pictogrammes de contenu (violence, langage, achats intégrés…). Ce
            n&apos;est pas une note de difficulté, c&apos;est un repère de
            contenu. Sur les tournois ARENA, les jeux proposés sont choisis en
            cohérence avec l&apos;âge des participants. Pour nous, ce point n&apos;est
            pas négociable.
          </p>
        </section>

        <section className="rounded-lg border border-arena-border bg-arena-surface shadow-carte p-5">
          <h2 className="font-bold text-arena-lilac">💪 Le corps compte</h2>
          <p className="mt-2 text-sm leading-relaxed text-arena-muted">
            Les joueurs pro ont des préparateurs physiques, ce n&apos;est pas un
            hasard. À notre échelle : boire de l&apos;eau (pas que des boissons
            énergisantes), se lever et s&apos;étirer à chaque pause, régler la
            hauteur de l&apos;écran, et reposer ses yeux régulièrement en
            regardant au loin quelques secondes. Des mains et des yeux en bon
            état, c&apos;est aussi ça, la performance.
          </p>
        </section>

        <section className="rounded-lg border border-arena-border bg-arena-surface shadow-carte p-5">
          <h2 className="font-bold text-arena-lilac">🤝 Besoin d&apos;en parler ?</h2>
          <p className="mt-2 text-sm leading-relaxed text-arena-muted">
            Pratique de jeu qui déborde, harcèlement en ligne, mal-être : il existe
            des services gratuits et anonymes en France.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-arena-muted">
            <li className="leading-relaxed">
              <span className="font-semibold text-arena-ink">Joueurs Info Service</span>{" "}
              : questions sur le jeu excessif, pour les joueurs et leurs proches.
              09 74 75 13 13 (appel non surtaxé).
            </li>
            <li className="leading-relaxed">
              <span className="font-semibold text-arena-ink">3018</span> : numéro
              national contre le harcèlement en ligne et les violences
              numériques, pour les jeunes comme pour les parents.
            </li>
            <li className="leading-relaxed">
              <span className="font-semibold text-arena-ink">L&apos;équipe VEA</span>{" "}
              : sur nos événements, un membre du staff est toujours disponible pour
              en discuter, sans jugement.
            </li>
          </ul>
        </section>
      </div>

      <footer className="mt-12 text-center text-xs text-arena-faint">
        <a href="/" className="underline hover:text-arena-muted">
          ← Retour aux tournois
        </a>
      </footer>
    </div>
  );
}
