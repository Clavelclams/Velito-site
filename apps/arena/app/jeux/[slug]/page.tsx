/**
 * Fiche JEU publique — /jeux/[slug]. La pastille de l'accueil mène ici.
 *
 * Rôle : « accès central » de la doctrine de complémentarité. Sur une seule
 * page, un joueur trouve tout ce qui concerne SA discipline :
 *  - les tournois ARENA à venir et passés (nos données, client anonyme → RLS) ;
 *  - un renvoi vers le tracker de stats DE RÉFÉRENCE du jeu quand il existe
 *    (tracker.gg, op.gg…), via un simple formulaire qui redirige — on
 *    n'agrège rien, on ne scrape rien, on ENVOIE du monde chez eux.
 *
 * Le formulaire est un <form method="get"> natif vers /jeux/[slug]/stats :
 * zéro JavaScript, même choix que la recherche de l'accueil et « Mon match ».
 */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { disciplineParSlug, libellesDe } from "@/lib/arena/disciplines";
import { TRACKERS } from "@/lib/arena/trackers";
import type { Tournoi } from "@/lib/arena/types";
import MotifDiscipline from "@/components/MotifDiscipline";
import EnteteSite from "@/components/EnteteSite";
import PiedSite from "@/components/PiedSite";

export default async function PageJeu({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const discipline = disciplineParSlug(slug);
  if (!discipline) notFound();

  // Tournois de la discipline, éditions précédentes comprises (FC 25 reste
  // visible sur la fiche FC 26 : l'historique survit aux millésimes).
  let tournois: Tournoi[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .schema("arena")
      .from("tournois")
      .select("*")
      .in("jeu", libellesDe(discipline))
      .order("date_debut", { ascending: false })
      .limit(30);
    tournois = (data ?? []) as Tournoi[];
  } catch {
    // Environnement sans base (premier déploiement) : fiche servable quand même.
  }

  const actifs = tournois
    .filter((t) => t.statut === "OUVERT" || t.statut === "EN_COURS")
    .sort((a, b) => (a.date_debut < b.date_debut ? -1 : 1));
  const termines = tournois.filter((t) => t.statut === "TERMINE");

  const tracker = TRACKERS[discipline.slug];

  const CarteTournoi = ({ t }: { t: Tournoi }) => (
    <li>
      <a
        href={`/t/${t.qr_token}`}
        className="flex items-center justify-between rounded-lg border border-arena-border bg-arena-surface shadow-carte px-4 py-3 transition-colors hover:border-arena-violet/50"
      >
        <span>
          <span className="font-bold">{t.titre}</span>
          <span className="ml-2 text-sm text-arena-muted">
            {new Date(t.date_debut).toLocaleDateString("fr-FR")}
            {t.lieu ? ` · ${t.lieu}` : ""}
          </span>
        </span>
        <span className="rounded-full bg-arena-surface px-3 py-1 text-xs font-semibold text-arena-muted">
          {t.statut === "EN_COURS"
            ? "🔴 En cours"
            : t.statut === "OUVERT"
              ? "Inscriptions ouvertes"
              : "Terminé"}
        </span>
      </a>
    </li>
  );

  return (
    <>
      <EnteteSite />

      {/* Bandeau aux couleurs de la discipline : même dégradé et même motif
          original que la pastille d'accueil — continuité visuelle sans
          la moindre image sous droits. */}
      <header
        className={`relative overflow-hidden bg-gradient-to-br ${discipline.couleur} text-white`}
      >
        <MotifDiscipline
          cle={discipline.motif}
          className="absolute -right-8 -top-8 h-48 w-48 text-white/20"
        />
        <div className="relative mx-auto max-w-2xl px-4 py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
            ARENA · {discipline.verticale === "ESPORT" ? "Esport" : "Sport"}
          </p>
          <h1 className="mt-1 font-titre text-3xl font-black">{discipline.jeu}</h1>
          <p className="mt-2 text-sm text-white/80">
            {tournois.length > 0
              ? `${tournois.length} tournoi${tournois.length > 1 ? "s" : ""} sur ARENA`
              : "Aucun tournoi pour l'instant — le tien peut être le premier."}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        {actifs.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-arena-faint">
              À venir / en cours
            </h2>
            <ul className="space-y-2">
              {actifs.map((t) => (
                <CarteTournoi key={t.id} t={t} />
              ))}
            </ul>
          </section>
        )}

        {/* ---- Stats externes : le renvoi assumé vers le site de référence ----
            Affiché seulement si le jeu a un tracker au format d'URL stable
            (cf. lib/arena/trackers.ts). Pour les autres, la section n'existe
            pas : mieux vaut rien qu'un lien qui casse. */}
        {tracker && (
          <section className="mb-8 rounded-lg border border-arena-violet/30 bg-arena-violet/5 p-4">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-arena-violet">
              Tes stats sur {discipline.court}
            </h2>
            <p className="mb-3 text-xs text-arena-muted">
              Les stats de jeu détaillées vivent chez{" "}
              <a
                href={tracker.urlAccueil}
                rel="noopener noreferrer"
                className="underline hover:text-arena-ink"
              >
                {tracker.nom}
              </a>
              , un service indépendant — ARENA t&apos;y emmène directement.
            </p>
            <form
              method="get"
              action={`/jeux/${discipline.slug}/stats`}
              className="flex flex-wrap gap-2"
            >
              <input
                type="text"
                name="pseudo"
                placeholder={tracker.aideSaisie}
                aria-label={tracker.aideSaisie}
                className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-arena-border bg-arena-surface px-3 py-2 text-sm focus:border-arena-violet focus:outline-none"
              />
              {tracker.plateformes.length > 0 && (
                <select
                  name="plateforme"
                  aria-label="Plateforme"
                  className="min-h-[44px] rounded-lg border border-arena-border bg-arena-surface px-2 py-2 text-sm focus:border-arena-violet focus:outline-none"
                >
                  {tracker.plateformes.map((p) => (
                    <option key={p.cle} value={p.cle}>
                      {p.libelle}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="submit"
                className="min-h-[44px] rounded-lg bg-arena-violet px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-arena-violet-fonce"
              >
                Voir
              </button>
            </form>
          </section>
        )}

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-arena-faint">
            Tournois passés
          </h2>
          {termines.length === 0 ? (
            <p className="text-sm text-arena-faint">
              Aucun tournoi terminé sur cette discipline pour l&apos;instant.
            </p>
          ) : (
            <ul className="space-y-2">
              {termines.map((t) => (
                <CarteTournoi key={t.id} t={t} />
              ))}
            </ul>
          )}
        </section>

        <p className="text-xs text-arena-faint">
          Tes résultats ARENA (victoires, adversaires, points) sont sur ton{" "}
          <a href="/classement" className="underline hover:text-arena-violet">
            profil joueur
          </a>{" "}
          — cherche ton pseudo depuis le classement.
        </p>
      </main>
      <PiedSite />
    </>
  );
}
