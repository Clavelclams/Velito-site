/**
 * /host — l'écran TV (affichage maître).
 *
 * Maquette du lobby tel qu'il s'affichera sur la TV avant le lancement d'un jeu :
 *  - Titre + URL/code à scanner
 *  - QR code (placeholder pour l'instant)
 *  - Liste des joueurs connectés AVEC leur avatar Wii-style
 *
 * Pour la démo / écran de présentation jury, on affiche 6 joueurs mock pour
 * que le visuel raconte une histoire. En vrai (à venir), c'est Realtime qui
 * pousse les arrivées.
 */
import { Avatar } from "@repo/ui/avatar";
import type { AvatarConfig } from "@repo/ui/avatar-data";

/**
 * Joueurs simulés pour la maquette. À remplacer par un useEffect/subscribe
 * sur le channel Realtime quand la session sera branchée.
 */
const MOCK_PLAYERS: Array<{
  pseudo: string;
  avatar: AvatarConfig;
}> = [
  {
    pseudo: "Riza",
    avatar: { base: "thea", background: "violet", accessory: "round" },
  },
  {
    pseudo: "K7",
    avatar: { base: "will", background: "cyan", accessory: "sunglasses" },
  },
  {
    pseudo: "MamaTeam",
    avatar: { base: "lea", background: "pink", accessory: "none" },
  },
  {
    pseudo: "ZeroCool",
    avatar: { base: "tony", background: "lime", accessory: "sunglasses" },
  },
  {
    pseudo: "Bisou",
    avatar: { base: "maeva", background: "pink", accessory: "round" },
  },
  {
    pseudo: "GG",
    avatar: { base: "leny", background: "cyan", accessory: "none" },
  },
];

export default function HostScreen() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-8 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-50" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-neon-violet/25 blur-3xl" />

      {/* ─── Header : titre + QR ─── */}
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

        <div className="flex justify-center">
          <div className="card-ink flex aspect-square w-72 items-center justify-center p-6">
            <div className="grid h-full w-full place-items-center rounded-xl border-2 border-dashed border-white/20 text-center text-sm text-white/40">
              QR code
              <br />
              (généré à l&apos;ouverture
              <br />
              d&apos;une session)
            </div>
          </div>
        </div>
      </div>

      {/* ─── Lobby joueurs avec AVATARS ─── */}
      <div className="relative mt-14 w-full max-w-6xl">
        <div className="mb-4 flex items-baseline justify-between">
          <p className="text-sm uppercase tracking-widest text-white/40">
            Joueurs connectés
          </p>
          <p className="font-display text-2xl font-black text-tenant">
            {MOCK_PLAYERS.length}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {MOCK_PLAYERS.map((p) => (
            <div
              key={p.pseudo}
              className="card-ink flex flex-col items-center gap-3 p-4 transition hover:border-white/25"
            >
              <Avatar config={p.avatar} size="lg" />
              <p className="font-display text-base font-bold tracking-wide text-white">
                {p.pseudo}
              </p>
            </div>
          ))}
          {/* Slot vide pour montrer qu'il reste de la place */}
          <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 p-4 text-center text-white/30">
            <span className="text-3xl font-light">+</span>
            <span className="text-[10px] uppercase tracking-wider">
              En attente
            </span>
          </div>
        </div>
      </div>

      <p className="relative mt-10 text-xs italic text-white/30">
        Maquette — Realtime branché à la session quand l&apos;hôte cliquera
        &laquo;&nbsp;Lancer&nbsp;&raquo;.
      </p>
    </main>
  );
}
