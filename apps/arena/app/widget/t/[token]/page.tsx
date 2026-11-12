/**
 * /widget/t/[token] : le tournoi en version À INTÉGRER sur un autre site
 * (12/11/2026, doctrine de complémentarité : « un club colle son bracket
 * ARENA sur son site »).
 *
 * Le club colle une balise <iframe> (code fourni sur la page staff du
 * tournoi). Cette page est la seule de l'app autorisée en iframe : voir
 * next.config.js, la route /widget a ses propres en-têtes.
 *
 * Choix :
 *  - Lecture seule, aucun formulaire, aucun bouton d'action : une page
 *    affichable chez un tiers ne doit rien pouvoir déclencher (pas de
 *    clickjacking possible sur une page sans action).
 *  - Client anonyme + RLS, comme la page publique. Un brouillon n'est
 *    jamais affiché, même si la personne qui regarde est staff.
 *  - Pas d'en-tête ni de pied de site : le widget vit dans la page du club.
 *    Un seul lien « Voir sur ARENA » en bas, qui ouvre un nouvel onglet.
 *  - Rafraîchi toutes les 15 s pendant le tournoi (même composant que la
 *    page publique).
 *  - noindex : Google doit indexer la vraie page du tournoi, pas sa copie.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { chargerTournoiPublic } from "@/lib/arena/chargement-public";
import { grouperMatchsParSection, matchFinal } from "@/lib/arena/affichage";
import AutoRefresh from "../../../t/[token]/AutoRefresh";
import type { MatchRow } from "@/lib/arena/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tournoi", robots: { index: false, follow: false } };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arena.velito.fr";

export default async function WidgetTournoi({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const donnees = await chargerTournoiPublic(await createClient(), token);
  if (!donnees || donnees.tournoi.statut === "BROUILLON") notFound();
  const { tournoi, participants, matchs, nom } = donnees;

  const camps = (m: MatchRow) => ({
    c1: m.equipe1_id ?? m.joueur1_id,
    c2: m.equipe2_id ?? m.joueur2_id,
    gagnant: m.equipe_gagnante_id ?? m.gagnant_id,
  });
  const finale = matchFinal(matchs);
  const champion = finale?.statut === "VALIDE" ? nom(finale.equipe_gagnante_id ?? finale.gagnant_id) : null;
  // Le widget est petit : on n'affiche pas les byes (matchs sans adversaire).
  const sections = grouperMatchsParSection(matchs.filter((m) => !m.is_bye));

  return (
    <main className="mx-auto max-w-xl p-3 text-sm">
      {tournoi.statut === "EN_COURS" && <AutoRefresh />}

      <header className="mb-3">
        <p className="text-base font-black leading-tight">{tournoi.titre}</p>
        <p className="text-xs text-arena-muted">
          {tournoi.jeu} · {new Date(tournoi.date_debut).toLocaleDateString("fr-FR")}
          {tournoi.lieu ? ` · ${tournoi.lieu}` : ""} ·{" "}
          {tournoi.statut === "EN_COURS"
            ? "en cours"
            : tournoi.statut === "OUVERT"
              ? `${participants.length} inscrit${participants.length > 1 ? "s" : ""}`
              : tournoi.statut === "TERMINE"
                ? "terminé"
                : "annulé"}
        </p>
      </header>

      {champion && (
        <p className="mb-3 rounded-md bg-arena-gold-pale px-3 py-2 text-center font-bold text-arena-gold">
          🏆 {champion}
        </p>
      )}

      {sections.length === 0 ? (
        <p className="text-arena-muted">Le tableau sera publié au démarrage du tournoi.</p>
      ) : (
        <div className="space-y-3">
          {sections.map((s) => (
            <section key={s.titre}>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-arena-lilac">{s.titre}</p>
              <ul className="space-y-1">
                {s.matchs.map((m) => {
                  const c = camps(m);
                  const joue = m.statut === "VALIDE" || m.statut === "TERMINE";
                  return (
                    <li
                      key={m.id}
                      className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-md border border-arena-border bg-arena-surface px-2 py-1.5"
                    >
                      <span className={`truncate ${c.gagnant && c.gagnant === c.c1 ? "font-bold text-arena-green" : ""}`}>
                        {c.c1 ? nom(c.c1) : "À venir"}
                      </span>
                      <span className="font-mono text-xs text-arena-muted">
                        {joue ? `${m.score_j1 ?? "·"} - ${m.score_j2 ?? "·"}` : "vs"}
                      </span>
                      <span className={`truncate text-right ${c.gagnant && c.gagnant === c.c2 ? "font-bold text-arena-green" : ""}`}>
                        {c.c2 ? nom(c.c2) : "À venir"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-3 text-right text-xs">
        <a
          href={`${SITE_URL}/t/${tournoi.qr_token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-arena-violet underline"
        >
          Voir sur ARENA
        </a>
      </p>
    </main>
  );
}
