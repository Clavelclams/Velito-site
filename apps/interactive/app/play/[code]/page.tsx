/**
 * /play/[code] — la manette mobile.
 *
 * SHELL des fondations : écran d'arrivée d'un joueur qui a scanné le QR
 * (l'URL contient le code de session). Pour l'instant : affiche le code reçu
 * et un champ pseudo (non fonctionnel). Pas de compte requis.
 *
 * À venir : rejoindre le channel Realtime de la session, s'enregistrer comme
 * player, recevoir l'état du jeu et envoyer ses actions (broadcast).
 */
export default async function PlayController({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Velito Interactive
        </p>
        <h1 className="neon-title mt-3 text-4xl">Tu rejoins</h1>
        <p className="mt-2 text-white/60">
          Session{" "}
          <span className="font-display font-black tracking-widest text-tenant">
            {code?.toUpperCase()}
          </span>
        </p>

        <div className="card-ink mt-8 space-y-4 p-6 text-left">
          <label className="block text-xs uppercase tracking-widest text-white/50">
            Ton pseudo
          </label>
          <input
            type="text"
            disabled
            placeholder="Ex : Riza, MamaTeam, K7…"
            className="w-full rounded-xl border border-white/15 bg-ink px-4 py-3 text-white placeholder-white/30 outline-none focus:border-tenant"
          />
          <button disabled className="btn-tenant w-full opacity-60">
            Entrer dans la partie
          </button>
          <p className="text-center text-[11px] italic text-white/40">
            Manette en construction — connexion temps réel à venir.
          </p>
        </div>
      </div>
    </main>
  );
}
