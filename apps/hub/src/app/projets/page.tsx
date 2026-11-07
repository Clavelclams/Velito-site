/**
 * /projets — Tous les projets suivis (Server Component, 07/11/2026).
 *
 * Une carte par projet : statut, pourcentage CALCULÉ depuis la roadmap,
 * prochaine étape et dernière entrée du journal. La RLS ne renvoie que les
 * projets auxquels l'utilisateur a accès (admin hub : tous ; sinon ceux dont
 * il est membre). Pensé pour être lu sur téléphone.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  avancement,
  prochaineEtape,
  LIBELLES_STATUT_PROJET,
  type StatutEtape,
} from "@/lib/projets/avancement";

export const dynamic = "force-dynamic";

interface ProjetLigne {
  id: string;
  slug: string;
  nom: string;
  resume: string | null;
  statut: string;
  url_prod: string | null;
  public: boolean;
  ordre: number;
  maj_le: string;
}
interface EtapeLigne {
  projet_id: string;
  statut: StatutEtape;
  poids: number;
  ordre: number;
  titre: string;
  lot: string | null;
}

function dateFr(iso: string): string {
  const [a, m, j] = iso.slice(0, 10).split("-");
  return `${j}/${m}/${a}`;
}

export default async function ProjetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?return=/projets");

  const [{ data: projets }, { data: etapes }, { data: journal }, { data: estAdmin }] = await Promise.all([
    supabase.schema("shared").from("projets").select("id, slug, nom, resume, statut, url_prod, public, ordre, maj_le").order("ordre").order("nom"),
    supabase.schema("shared").from("projet_etapes").select("projet_id, statut, poids, ordre, titre, lot"),
    supabase.schema("shared").from("projet_journal").select("projet_id, date_entree, titre").order("date_entree", { ascending: false }),
    supabase.schema("shared").rpc("est_admin_hub"),
  ]);

  const liste = (projets ?? []) as ProjetLigne[];
  const toutesEtapes = (etapes ?? []) as EtapeLigne[];
  const derniereEntree = new Map<string, { date_entree: string; titre: string }>();
  for (const j of (journal ?? []) as { projet_id: string; date_entree: string; titre: string }[]) {
    if (!derniereEntree.has(j.projet_id)) derniereEntree.set(j.projet_id, j);
  }

  return (
    <main className="min-h-screen bg-[#04040e] text-white pt-[110px] pb-20 px-4 md:px-[10%]">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-[Orbitron] text-3xl md:text-4xl font-black">Projets</h1>
            <p className="text-white/60 text-sm mt-2">
              Ce qui a été fait, ce qui reste, et où en est chaque projet. Le pourcentage vient de la roadmap.
            </p>
          </div>
          {estAdmin === true && (
            <Link
              href="/projets/nouveau"
              className="rounded-full bg-white text-[#04040e] px-4 py-2 text-sm font-medium hover:bg-white/90"
            >
              + Nouveau projet
            </Link>
          )}
        </div>

        {liste.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/60">
            Aucun projet visible pour ton compte. Demande au propriétaire d&apos;un projet de t&apos;y ajouter.
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liste.map((p) => {
              const ses = toutesEtapes.filter((e) => e.projet_id === p.id);
              const av = avancement(ses);
              const suite = prochaineEtape(ses);
              const derniere = derniereEntree.get(p.id);
              return (
                <li key={p.id}>
                  <Link
                    href={`/projets/${p.slug}`}
                    className="block h-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-semibold text-lg">{p.nom}</h2>
                      <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/70">
                        {LIBELLES_STATUT_PROJET[p.statut] ?? p.statut}
                        {p.public ? " · public" : ""}
                      </span>
                    </div>
                    {p.resume && <p className="mt-1 text-sm text-white/60 line-clamp-2">{p.resume}</p>}

                    <div className="mt-4">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-[Orbitron] text-2xl font-black">{av.pourcentage} %</span>
                        <span className="text-xs text-white/50">
                          {av.fait} fait · {av.enCours} en cours · {av.aFaire} à faire
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white/10" aria-hidden="true">
                        <div className="h-2 rounded-full bg-[#a78bfa]" style={{ width: `${av.pourcentage}%` }} />
                      </div>
                    </div>

                    <dl className="mt-4 space-y-1 text-xs text-white/60">
                      <div>
                        <dt className="inline text-white/40">Ensuite : </dt>
                        <dd className="inline">{suite ? suite.titre : "rien de prévu"}</dd>
                      </div>
                      {derniere && (
                        <div>
                          <dt className="inline text-white/40">Dernière entrée : </dt>
                          <dd className="inline">
                            {dateFr(derniere.date_entree)} · {derniere.titre}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
