/**
 * /agenda/[slug] — Page publique du BILAN d'un evenement.
 *
 * Server Component, accessible a TOUS (visiteurs, institutions, clients presta).
 * Lit l'event Supabase par event_slug. Si bilan_public est false (ou event
 * introuvable), on renvoie 404 : tant que l'admin n'a pas publie, rien n'est
 * expose.
 *
 * On n'affiche QUE les metriques cochees "visible" cote admin, plus le texte de
 * recap, plus un ratio de mixite filles/garcons. AUCUN nom de participant n'est
 * jamais affiche ici — uniquement des nombres agreges (RGPD).
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

type BilanEvent = {
  nom: string;
  event_slug: string;
  date: string;
  lieu: string | null;
  type: string | null;
  bilan_public: boolean;
  bilan_recap: string | null;
  bilan_nb_total: number | null;
  bilan_nb_filles: number | null;
  bilan_nb_garcons: number | null;
  bilan_nb_joueurs: number | null;
  bilan_nb_spectateurs: number | null;
  bilan_nb_benevoles: number | null;
  bilan_show_total: boolean;
  bilan_show_genre: boolean;
  bilan_show_joueurs: boolean;
  bilan_show_spectateurs: boolean;
  bilan_show_benevoles: boolean;
};

const SELECT =
  "nom, event_slug, date, lieu, type, bilan_public, bilan_recap, bilan_nb_total, bilan_nb_filles, bilan_nb_garcons, bilan_nb_joueurs, bilan_nb_spectateurs, bilan_nb_benevoles, bilan_show_total, bilan_show_genre, bilan_show_joueurs, bilan_show_spectateurs, bilan_show_benevoles";

async function fetchBilan(slug: string): Promise<BilanEvent | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .schema("vea")
    .from("evenements")
    .select(SELECT)
    .eq("event_slug", slug)
    .maybeSingle();
  const ev = data as BilanEvent | null;
  if (!ev || !ev.bilan_public) return null;
  return ev;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const ev = await fetchBilan(slug);
  if (!ev) return { title: "Bilan — VEA" };
  const desc = ev.bilan_recap?.slice(0, 150) ?? `Bilan de l'evenement ${ev.nom} organise par Velito Esport Amiens.`;
  return {
    title: `Bilan — ${ev.nom} · VEA`,
    description: desc,
    openGraph: { title: `Bilan — ${ev.nom}`, description: desc },
  };
}

export default async function BilanPublicPage({ params }: PageProps) {
  const { slug } = await params;
  const ev = await fetchBilan(slug);
  if (!ev) notFound();

  const dateStr = new Date(ev.date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  // Stats a montrer (uniquement cochees + renseignees). La mixite F/G a son
  // propre bloc (ratio) plus bas, donc filles/garcons ne sont PAS des cards ici.
  const stats: { label: string; value: number }[] = [];
  if (ev.bilan_show_total && ev.bilan_nb_total !== null) {
    stats.push({ label: "Personnes touchees", value: ev.bilan_nb_total });
  }
  if (ev.bilan_show_joueurs && ev.bilan_nb_joueurs !== null) {
    stats.push({ label: "Joueurs", value: ev.bilan_nb_joueurs });
  }
  if (ev.bilan_show_spectateurs && ev.bilan_nb_spectateurs !== null) {
    stats.push({ label: "Spectateurs", value: ev.bilan_nb_spectateurs });
  }
  if (ev.bilan_show_benevoles && ev.bilan_nb_benevoles !== null) {
    stats.push({ label: "Benevoles", value: ev.bilan_nb_benevoles });
  }

  // Mixite filles / garcons (ratio %) — affiche si genre visible et donnees presentes.
  const filles = ev.bilan_show_genre ? (ev.bilan_nb_filles ?? 0) : 0;
  const garcons = ev.bilan_show_genre ? (ev.bilan_nb_garcons ?? 0) : 0;
  const totalGenre = filles + garcons;
  const showMixite =
    ev.bilan_show_genre &&
    (ev.bilan_nb_filles !== null || ev.bilan_nb_garcons !== null) &&
    totalGenre > 0;
  const pctFilles = totalGenre > 0 ? Math.round((filles / totalGenre) * 100) : 0;
  const pctGarcons = 100 - pctFilles;

  return (
    <>
      {/* HERO */}
      <section className="hero-bg pt-28 pb-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="badge-red mb-4">Bilan d&apos;evenement</span>
          <h1 className="text-3xl sm:text-4xl font-black text-vea-text mb-3 mt-4">
            {ev.nom}
          </h1>
          <p className="text-sm text-vea-text-muted">
            {dateStr}
            {ev.lieu ? ` · ${ev.lieu}` : ""}
            {ev.type ? ` · ${ev.type}` : ""}
          </p>
        </div>
      </section>

      <section className="py-12 px-4 bg-vea-bg">
        <div className="max-w-3xl mx-auto">
          {/* Chiffres */}
          {stats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
              {stats.map((s) => (
                <div key={s.label} className="card-clean p-5 text-center">
                  <div className="text-3xl font-black text-vea-accent">{s.value}</div>
                  <p className="text-[11px] uppercase tracking-widest text-vea-text-muted mt-2 font-semibold">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Mixite filles / garcons (ratio) */}
          {showMixite && (
            <div className="card-clean p-6 mb-10">
              <h2 className="text-lg font-bold text-vea-text mb-1">Mixite filles / garcons</h2>
              <p className="text-xs text-vea-text-dim mb-4">
                Sur {totalGenre} participant{totalGenre > 1 ? "s" : ""} dont le genre est renseigne.
              </p>
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-[#EFEFEC]">
                <div className="h-full bg-vea-accent" style={{ width: `${pctFilles}%` }} />
                <div className="h-full bg-[#2D6A9F]" style={{ width: `${pctGarcons}%` }} />
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-sm mt-3">
                <span className="flex items-center gap-2 text-vea-text">
                  <span className="inline-block w-3 h-3 rounded-sm bg-vea-accent" />
                  Filles — {filles} ({pctFilles}%)
                </span>
                <span className="flex items-center gap-2 text-vea-text">
                  <span className="inline-block w-3 h-3 rounded-sm bg-[#2D6A9F]" />
                  Garcons — {garcons} ({pctGarcons}%)
                </span>
              </div>
            </div>
          )}

          {/* Recap editorial */}
          {ev.bilan_recap && (
            <div className="card-clean p-6 mb-10">
              <h2 className="text-lg font-bold text-vea-text mb-3">Le mot de l&apos;equipe</h2>
              <p className="text-vea-text-muted leading-relaxed whitespace-pre-line">
                {ev.bilan_recap}
              </p>
            </div>
          )}

          {/* Etat vide (publie mais rien de coche/renseigne) */}
          {stats.length === 0 && !showMixite && !ev.bilan_recap && (
            <p className="text-center text-vea-text-muted py-10">
              Le bilan de cet evenement sera bientot disponible.
            </p>
          )}

          {/* Retour + CTA */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <Link href="/agenda" className="btn-outline text-sm py-2">
              ← Tous nos evenements
            </Link>
            <Link href="/inscription" className="btn-primary text-sm py-2">
              Rejoindre VEA
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
