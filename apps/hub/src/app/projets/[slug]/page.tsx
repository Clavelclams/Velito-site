/**
 * /projets/[slug] — Fiche d'un projet (Server Component, 07/11/2026).
 *
 * En haut : statut, liens, pourcentage calculé. Puis la roadmap (par lot),
 * le journal (ce qui a été fait, décisions, bugs), le CDC et les membres.
 * Le rôle de l'utilisateur vient de la base (role_projet) : il décide des
 * boutons affichés ; la RLS refuse de toute façon le reste.
 * Un projet inexistant ou non autorisé donne un 404 neutre.
 */
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { avancement, parLot, LIBELLES_STATUT_PROJET } from "@/lib/projets/avancement";
import { Roadmap, Journal, EditionFiche, Membres, type Etape, type EntreeJournal, type Role } from "./PanneauxProjet";

export const dynamic = "force-dynamic";

/**
 * Rendu du CDC : titres (#), listes (-) et paragraphes, en éléments React.
 * Pas de HTML injecté (pas de dangerouslySetInnerHTML) : un texte saisi ne
 * peut pas exécuter de script.
 */
function RenduCdc({ texte }: { texte: string }) {
  const blocs: React.ReactNode[] = [];
  let liste: string[] = [];
  const viderListe = () => {
    if (liste.length) {
      blocs.push(
        <ul key={`l${blocs.length}`} className="list-disc pl-5 space-y-1 text-sm text-white/75">
          {liste.map((l, i) => <li key={i}>{l}</li>)}
        </ul>,
      );
      liste = [];
    }
  };
  for (const ligne of texte.split(/\r?\n/)) {
    const t = ligne.trim();
    if (/^[-*] /.test(t)) {
      liste.push(t.slice(2));
      continue;
    }
    viderListe();
    if (!t) continue;
    const titre = /^(#{1,3}) (.*)$/.exec(t);
    if (titre) {
      const niveau = titre[1]!.length;
      blocs.push(
        <p key={`t${blocs.length}`} className={niveau === 1 ? "mt-4 text-lg font-semibold" : "mt-3 font-semibold text-white/90"}>
          {titre[2]}
        </p>,
      );
    } else {
      blocs.push(<p key={`p${blocs.length}`} className="text-sm text-white/75">{t}</p>);
    }
  }
  viderListe();
  return <div className="space-y-2">{blocs}</div>;
}

export default async function ProjetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?return=/projets/${slug}`);

  const { data: projet } = await supabase
    .schema("shared")
    .from("projets")
    .select("id, slug, nom, resume, statut, url_prod, depot, stack, cdc, public, resume_public, maj_le")
    .eq("slug", slug)
    .maybeSingle();
  if (!projet) notFound();

  const [{ data: etapes }, { data: journal }, { data: role }, { data: membres }] = await Promise.all([
    supabase.schema("shared").from("projet_etapes")
      .select("id, lot, titre, description, statut, poids, ordre, echeance, fait_le")
      .eq("projet_id", projet.id).order("ordre"),
    supabase.schema("shared").from("projet_journal")
      .select("id, date_entree, type, titre, contenu, auteur")
      .eq("projet_id", projet.id).order("date_entree", { ascending: false }).order("cree_le", { ascending: false }),
    supabase.schema("shared").rpc("role_projet", { p_projet: projet.id }),
    supabase.schema("shared").rpc("membres_projet", { p_projet: projet.id }),
  ]);

  const listeEtapes = (etapes ?? []) as (Etape & { ordre: number })[];
  const av = avancement(listeEtapes);
  const monRole = (role ?? "lecteur") as Role;
  const peutGerer = monRole === "admin" || monRole === "proprietaire";

  return (
    <main className="min-h-screen bg-[#04040e] text-white pt-[110px] pb-20 px-4 md:px-[10%]">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link href="/projets" className="text-sm text-white/50 hover:text-white">← Projets</Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-[Orbitron] text-3xl md:text-4xl font-black">{projet.nom}</h1>
              {projet.resume && <p className="mt-2 text-white/60 text-sm max-w-2xl">{projet.resume}</p>}
            </div>
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
              {LIBELLES_STATUT_PROJET[projet.statut as string] ?? projet.statut}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
            {projet.url_prod && <a href={projet.url_prod} className="text-[#a78bfa] hover:text-white" target="_blank" rel="noreferrer">Voir le site</a>}
            {projet.stack && <span>{projet.stack}</span>}
            {projet.depot && <span>Dépôt : {projet.depot}</span>}
            <span>Ton rôle : {monRole}</span>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-baseline justify-between">
            <span className="font-[Orbitron] text-4xl font-black">{av.pourcentage} %</span>
            <span className="text-xs text-white/50">{av.fait} fait · {av.enCours} en cours · {av.aFaire} à faire</span>
          </div>
          <div className="mt-3 h-3 rounded-full bg-white/10" aria-hidden="true">
            <div className="h-3 rounded-full bg-[#a78bfa]" style={{ width: `${av.pourcentage}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-white/40">Calculé sur les étapes pondérées de la roadmap (les étapes abandonnées ne comptent pas).</p>
        </section>

        {peutGerer && (
          <EditionFiche
            projetId={projet.id}
            slug={projet.slug}
            fiche={{
              nom: projet.nom,
              resume: projet.resume,
              statut: projet.statut,
              url_prod: projet.url_prod,
              depot: projet.depot,
              stack: projet.stack,
              cdc: projet.cdc,
              public: projet.public,
              resume_public: projet.resume_public,
            }}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <h2 className="mb-4 text-sm uppercase tracking-wider text-white/50">Roadmap</h2>
            <Roadmap projetId={projet.id} slug={projet.slug} role={monRole} groupes={parLot(listeEtapes)} />
          </section>
          <section>
            <h2 className="mb-4 text-sm uppercase tracking-wider text-white/50">Journal</h2>
            <Journal projetId={projet.id} slug={projet.slug} role={monRole} userId={user.id} entrees={(journal ?? []) as EntreeJournal[]} />
          </section>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-3 text-sm uppercase tracking-wider text-white/50">Cahier des charges</h2>
          {projet.cdc ? <RenduCdc texte={projet.cdc} /> : <p className="text-sm text-white/60">Pas encore de CDC.</p>}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-3 text-sm uppercase tracking-wider text-white/50">Membres</h2>
          <Membres
            projetId={projet.id}
            slug={projet.slug}
            peutGerer={peutGerer}
            membres={(membres ?? []) as { user_id: string; email: string; role: string }[]}
          />
        </section>
      </div>
    </main>
  );
}
