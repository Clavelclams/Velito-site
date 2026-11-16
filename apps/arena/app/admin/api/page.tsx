/**
 * /admin/api : les clés de l'API publique de tes organisations (14/11/2026).
 *
 * Une clé permet à un site de club ou à un outil de lire ses tournois ARENA
 * (/api/v1). Elle ne donne aucun droit d'écriture et ne montre rien de plus
 * que les pages publiques. Le staff la crée, la nomme, la révoque.
 * La base ne garde que l'empreinte : la clé complète n'est montrée qu'une
 * fois, à la création (composant CreerCleApi).
 */
import { getContexteStaff } from "@/lib/arena/auth";
import { revoquerCleApi } from "@/lib/arena/actions-api";
import { LIMITE_PAR_MINUTE } from "@/lib/arena/api-cles";
import { getServiceClient } from "@/lib/supabase/service";
import BandeauErreur from "@/components/BandeauErreur";
import CreerCleApi from "./CreerCleApi";

export const dynamic = "force-dynamic";

interface LigneCle {
  id: string;
  organisation_id: string;
  nom: string;
  prefixe: string;
  cree_le: string;
  revoquee_le: string | null;
  dernier_usage_le: string | null;
}

const date = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" })
    : "jamais";

export default async function PageCles({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  const ctx = await getContexteStaff();
  if (!ctx) return null; // le layout /admin a déjà affiché l'écran de connexion

  const { data, error } = await getServiceClient()
    .schema("arena")
    .from("api_cles")
    .select("id, organisation_id, nom, prefixe, cree_le, revoquee_le, dernier_usage_le")
    .in("organisation_id", ctx.organisations.map((o) => o.id))
    .order("cree_le", { ascending: false });
  const cles = (data ?? []) as LigneCle[];
  const nomOrga = new Map(ctx.organisations.map((o) => [o.id, o.name]));

  return (
    <div className="space-y-8">
      <BandeauErreur message={erreur} />
      <div>
        <h1 className="text-2xl font-black">Clés de l&apos;API</h1>
        <p className="mt-1 text-sm text-arena-muted">
          Pour afficher tes tournois et ton classement sur ton propre site ou dans un outil.
          Lecture seule, gratuite, {LIMITE_PAR_MINUTE} requêtes par minute et par clé.{" "}
          <a href="/developpeurs" className="font-semibold text-arena-violet underline-offset-4 hover:underline">
            Documentation
          </a>
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-arena-border bg-arena-surface p-4 text-sm text-arena-muted">
          Les clés ne sont pas encore disponibles : la migration <code>014_arena_api_cles.sql</code> doit
          être passée dans Supabase.
        </p>
      ) : (
        <>
          <section className="rounded-lg border border-arena-border bg-arena-surface p-5 shadow-carte">
            <h2 className="mb-3 font-bold">Nouvelle clé</h2>
            <CreerCleApi organisations={ctx.organisations.map((o) => ({ id: o.id, name: o.name }))} />
          </section>

          <section>
            <h2 className="mb-3 font-bold">Tes clés</h2>
            {cles.length === 0 ? (
              <p className="text-sm text-arena-faint">Aucune clé pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-2">
                {cles.map((c) => (
                  <li
                    key={c.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-arena-border bg-arena-surface p-3 text-sm ${c.revoquee_le ? "opacity-60" : ""}`}
                  >
                    <div>
                      <p className="font-semibold">
                        {c.nom}{" "}
                        <code className="ml-1 font-mono text-xs text-arena-faint">{c.prefixe}…</code>
                      </p>
                      <p className="text-xs text-arena-faint">
                        {ctx.organisations.length > 1 && `${nomOrga.get(c.organisation_id) ?? ""} · `}
                        Créée le {date(c.cree_le)} · dernier usage : {date(c.dernier_usage_le)}
                      </p>
                    </div>
                    {c.revoquee_le ? (
                      <span className="text-xs font-semibold text-arena-red">Révoquée le {date(c.revoquee_le)}</span>
                    ) : (
                      <form action={revoquerCleApi}>
                        <input type="hidden" name="cle_id" value={c.id} />
                        <button
                          className="rounded-lg border border-arena-red/30 px-3 py-1.5 text-xs font-semibold text-arena-red hover:bg-arena-red-pale"
                          title="La clé cesse de marcher immédiatement. Irréversible."
                        >
                          Révoquer
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
