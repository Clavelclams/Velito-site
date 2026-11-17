/**
 * /admin/defis/{id} : la saisie du staff, sur téléphone (17/11/2026).
 * De haut en bas, dans l'ordre d'une rotation : choisir le groupe, lancer
 * l'essai, lancer la manche comptée, saisir les plats, valider.
 */
import { notFound } from "next/navigation";
import { estStaffDe, getContexteStaff } from "@/lib/arena/auth";
import { chargerDefiParId } from "@/lib/arena/defi-donnees";
import { nomEquipe, recapitulatif } from "@/lib/arena/defi";
import {
  arreterChrono,
  choisirRotation,
  lancerChrono,
  remettreAZero,
  rouvrirRotation,
  validerRotation,
} from "@/lib/arena/actions-defi";
import BandeauErreur from "@/components/BandeauErreur";
import { ChronoStaff, ScoreEquipe } from "./Saisie";

export const dynamic = "force-dynamic";

const ROUGE = "#E5484D";
const BLEU = "#2F7BEF";
const bouton = "min-h-[52px] w-full rounded-xl px-4 text-base font-bold";

export default async function PageSaisieDefi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;
  const ctx = await getContexteStaff();
  if (!ctx) return null;
  const complet = await chargerDefiParId(id);
  if (!complet || !estStaffDe(ctx, complet.defi.organisation_id)) notFound();
  const { defi, rotations, equipes } = complet;

  const courante = rotations.find((r) => r.id === defi.rotation_courante_id) ?? null;
  const eqCourante = courante ? equipes.filter((e) => e.rotation_id === courante.id) : [];
  const recap = recapitulatif(rotations, equipes);
  const dureeMin = defi.duree_manche_s / 60;
  const hidden = (
    <>
      <input type="hidden" name="defi_id" value={defi.id} />
      {courante && <input type="hidden" name="rotation_id" value={courante.id} />}
    </>
  );

  return (
    <div className="mx-auto max-w-md space-y-5">
      <BandeauErreur message={erreur} />
      <div>
        <h1 className="text-xl font-black leading-tight">{defi.titre}</h1>
        <p className="mt-1 flex flex-wrap gap-x-4 text-sm">
          <a href={`/t/${defi.token}/ecran`} target="_blank" rel="noreferrer" className="font-semibold text-arena-violet underline">Ouvrir l&apos;écran</a>
          <a href={`/admin/defis/${defi.id}/recap`} className="font-semibold text-arena-violet underline">Récapitulatif</a>
          <a href={`/admin/defis/${defi.id}/export`} className="font-semibold text-arena-violet underline">CSV</a>
        </p>
        <p className="mt-1 text-xs text-arena-faint">
          {recap.rotationsJouees} rotation(s) jouée(s) · {recap.totalJour} {defi.unite} au total
        </p>
      </div>

      {/* 1. Le groupe en cours */}
      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-arena-faint">Groupe en cours</h2>
        <div className="grid grid-cols-5 gap-2">
          {rotations.map((r) => {
            const actif = r.id === courante?.id;
            const fait = r.statut === "VALIDEE";
            return (
              <form key={r.id} action={choisirRotation}>
                <input type="hidden" name="defi_id" value={defi.id} />
                <input type="hidden" name="rotation_id" value={r.id} />
                <button
                  className={`min-h-[52px] w-full rounded-xl text-sm font-black ${
                    actif ? "bg-arena-violet text-white" : fait ? "bg-arena-green-pale text-arena-green" : "border border-arena-border bg-arena-surface"
                  }`}
                >
                  G{r.numero}
                  <span className="block text-[10px] font-semibold opacity-80">{fait ? "fait" : r.heure?.replace(":", "h")}</span>
                </button>
              </form>
            );
          })}
        </div>
      </section>

      {courante ? (
        <>
          {/* 2. Le chrono */}
          <section className="space-y-2 rounded-xl border border-arena-border bg-arena-surface p-3">
            <h2 className="text-center text-lg font-black">G{courante.numero}{courante.statut === "VALIDEE" && " · validé"}</h2>
            <ChronoStaff key={courante.chrono_fin ?? "aucun"} chronoFin={courante.chrono_fin} phase={courante.phase} serveurMs={Date.now()} />
            <form action={lancerChrono} className="space-y-2">
              {hidden}
              <label className="flex items-center justify-center gap-2 text-sm text-arena-muted">
                Durée
                <input name="duree_minutes" type="number" min={0.5} max={30} step={0.5} defaultValue={dureeMin} className="w-20 rounded-lg border border-arena-border bg-arena-bg py-2 text-center" />
                min
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button name="phase" value="ESSAI" className={`${bouton} border-2 border-arena-violet text-arena-violet`}>Lancer la découverte</button>
                <button name="phase" value="COMPTEE" className={`${bouton} bg-arena-violet text-white`}>Manche comptée</button>
              </div>
            </form>
            <form action={arreterChrono}>
              {hidden}
              <button className="w-full py-2 text-sm text-arena-faint underline">Arrêter le chrono</button>
            </form>
          </section>

          {/* 3. Les scores */}
          <section className="grid grid-cols-1 gap-3">
            {eqCourante
              .sort((a, b) => (a.couleur === b.couleur ? 0 : a.couleur === "ROUGE" ? -1 : 1))
              .map((e) => (
                <ScoreEquipe
                  key={`${e.id}-${e.score}`}
                  equipeId={e.id}
                  nom={nomEquipe(courante.numero, e.couleur)}
                  couleur={e.couleur === "ROUGE" ? ROUGE : BLEU}
                  initial={e.score}
                />
              ))}
          </section>

          {/* 4. Valider */}
          {courante.statut === "VALIDEE" ? (
            <form action={rouvrirRotation}>
              {hidden}
              <p className="mb-2 text-center text-sm text-arena-green">
                Rotation validée : elle compte dans le classement. Tu peux encore corriger les scores ci-dessus.
              </p>
              <button className={`${bouton} border border-arena-border text-arena-muted`}>Rouvrir la rotation</button>
            </form>
          ) : (
            <form action={validerRotation}>
              {hidden}
              <button className={`${bouton} bg-arena-green text-white`}>Valider G{courante.numero} (entre au classement)</button>
            </form>
          )}
        </>
      ) : (
        <p className="rounded-xl border border-arena-border bg-arena-surface p-4 text-center text-sm text-arena-muted">
          Touche le groupe qui arrive (G1, G2…) pour commencer.
        </p>
      )}

      {/* Remise à zéro, après l'essai de mise en place */}
      <details className="rounded-xl border border-arena-border p-3 text-sm">
        <summary className="cursor-pointer text-arena-faint">Remettre tout à zéro</summary>
        <form action={remettreAZero} className="mt-3 space-y-2">
          <input type="hidden" name="defi_id" value={defi.id} />
          <p className="text-arena-muted">Tous les scores repassent à 0 et toutes les rotations « à venir ». Tape ZERO pour confirmer.</p>
          <input name="confirmation" autoComplete="off" className="w-full rounded-lg border border-arena-border bg-arena-bg px-3 py-2" />
          <button className={`${bouton} border border-arena-red/40 text-arena-red`}>Remettre à zéro</button>
        </form>
      </details>
    </div>
  );
}
