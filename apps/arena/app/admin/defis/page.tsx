/**
 * /admin/defis : les « défis au score » de tes organisations (17/11/2026).
 * Ateliers à rotations (deux équipes éphémères par rotation, score saisi par
 * le staff). Non listés sur le site public, sans joueur ni profil.
 */
import { getContexteStaff } from "@/lib/arena/auth";
import { creerDefi } from "@/lib/arena/actions-defi";
import { getServiceClient } from "@/lib/supabase/service";
import BandeauErreur from "@/components/BandeauErreur";

export const dynamic = "force-dynamic";

const champ =
  "min-h-[44px] w-full rounded-lg border border-arena-border bg-arena-bg px-3 py-2 text-sm focus:border-arena-violet focus:outline-none";
const bouton =
  "min-h-[44px] rounded-lg bg-arena-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-arena-violet-fonce";

const PROGRAMME_EXEMPLE = ["G1 9h30", "G2 9h45", "G3 10h00", "G4 10h15", "G5 10h30", "G6 11h00", "G7 11h15", "G8 11h30", "G9 11h45"].join("\n");

export default async function PageDefis({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  const ctx = await getContexteStaff();
  if (!ctx) return null;

  const { data, error } = await getServiceClient().schema("arena").from("defis")
    .select("id, titre, created_at, organisation_id")
    .in("organisation_id", ctx.organisations.map((o) => o.id))
    .order("created_at", { ascending: false });
  const defis = (data ?? []) as { id: string; titre: string; created_at: string; organisation_id: string }[];

  return (
    <div className="space-y-8">
      <BandeauErreur message={erreur} />
      <div>
        <h1 className="text-2xl font-black">Défis au score</h1>
        <p className="mt-1 text-sm text-arena-muted">
          Atelier à rotations : deux équipes par groupe (Rouge, Bleu), aucun nom, score saisi par le staff,
          écran géant pour le public. Jamais affiché sur le site ni dans le classement.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-arena-border bg-arena-surface p-4 text-sm text-arena-muted">
          La migration <code>015_arena_defis.sql</code> doit être passée dans Supabase.
        </p>
      ) : (
        <>
          {defis.length > 0 && (
            <ul className="space-y-2">
              {defis.map((d) => (
                <li key={d.id}>
                  <a href={`/admin/defis/${d.id}`} className="block rounded-lg border border-arena-border bg-arena-surface p-4 font-semibold shadow-carte hover:border-arena-violet/50">
                    {d.titre}
                    <span className="block text-xs font-normal text-arena-faint">
                      Créé le {new Date(d.created_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <section className="rounded-lg border border-arena-border bg-arena-surface p-5 shadow-carte">
            <h2 className="mb-3 font-bold">Nouveau défi</h2>
            <form action={creerDefi} className="space-y-3">
              {ctx.organisations.length > 1 ? (
                <select name="organisation_id" className={champ} defaultValue={ctx.organisations.find((o) => o.slug === "vea")?.id}>
                  {ctx.organisations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              ) : (
                <input type="hidden" name="organisation_id" value={ctx.organisations[0]?.id ?? ""} />
              )}
              <input name="titre" required maxLength={120} defaultValue="Stade vers l'Emploi · Atelier Overcooked" className={champ} aria-label="Titre" />
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-arena-muted">
                  Durée d&apos;une manche (min)
                  <input name="duree_minutes" type="number" min={0.5} max={30} step={0.5} defaultValue={4} className={champ} />
                </label>
                <label className="text-sm text-arena-muted">
                  Unité du score
                  <input name="unite" maxLength={20} defaultValue="plats" className={champ} />
                </label>
              </div>
              <label className="block text-sm text-arena-muted">
                Programme (une rotation par ligne)
                <textarea name="programme" rows={9} defaultValue={PROGRAMME_EXEMPLE} className={`${champ} font-mono`} />
              </label>
              <button className={bouton}>Créer le défi</button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
