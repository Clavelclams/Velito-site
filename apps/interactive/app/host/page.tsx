/**
 * /host — l'écran TV (affichage maître).
 *
 * SHELL des fondations : maquette statique de l'écran de salle d'attente
 * (le "lobby") tel qu'il s'affichera sur la TV avant le lancement d'un jeu :
 * gros titre, zone QR + PIN, liste des joueurs connectés.
 *
 * À venir (pas dans les fondations) : abonnement Realtime au channel de la
 * session, génération du vrai QR, présence des joueurs en direct, machine à
 * états du jeu.
 */
export default function HostScreen() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-8">
      <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-50" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-neon-violet/25 blur-3xl" />

      <div className="relative grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <p className="text-sm uppercase tracking-[0.4em] text-white/50">
            Velito Interactive
          </p>
          <h1 className="neon-title mt-4 text-6xl sm:text-7xl">
            Rejoins
            <br />
            la partie
          </h1>
          <p className="mt-6 text-xl text-white/70">
            Scanne le QR code avec ton téléphone, ou va sur{" "}
            <span className="font-semibold text-tenant">play.velito.fr</span> et
            entre le code.
          </p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-ink-700/70 px-6 py-4">
            <span className="text-sm text-white/50">CODE</span>
            <span className="font-display text-4xl font-black tracking-[0.3em] text-tenant">
              ----
            </span>
          </div>
        </div>

        {/* Placeholder QR */}
        <div className="flex justify-center">
          <div className="card-ink flex aspect-square w-72 items-center justify-center p-6">
            <div className="grid h-full w-full place-items-center rounded-xl border-2 border-dashed border-white/20 text-center text-sm text-white/40">
              QR code
              <br />
              (généré à l'ouverture
              <br />
              d'une session)
            </div>
          </div>
        </div>
      </div>

      {/* Lobby joueurs */}
      <div className="relative mt-14 w-full max-w-6xl">
        <p className="mb-3 text-sm uppercase tracking-widest text-white/40">
          Joueurs connectés
        </p>
        <div className="flex flex-wrap gap-3 text-white/30">
          <span className="rounded-full border border-dashed border-white/15 px-4 py-2 text-sm">
            En attente de joueurs…
          </span>
        </div>
      </div>
    </main>
  );
}
