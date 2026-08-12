/**
 * Page publique d'accueil ARENA.
 * Server Component : lit les tournois visibles (statut ≠ BROUILLON, via RLS)
 * avec le client anonyme. Aucune auth requise — c'est la vitrine.
 */
import { createClient } from "@/lib/supabase/server";
import type { Tournoi } from "@/lib/arena/types";

const LABELS: Record<string, string> = {
  OUVERT: "Inscriptions ouvertes",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

export default async function ArenaHome() {
  let tournois: Tournoi[] = [];
  let erreurConfig = false;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .schema("arena")
      .from("tournois")
      .select("*")
      .neq("statut", "BROUILLON")
      .order("date_debut", { ascending: false })
      .limit(20);
    tournois = (data ?? []) as Tournoi[];
  } catch {
    // Env Supabase absente (premier déploiement) → on affiche le placeholder.
    erreurConfig = true;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-black tracking-tight">
          ARENA<span className="text-arena-violet">.</span>
        </h1>
        <p className="mt-3 text-arena-muted">
          Tournois esport amateur à Amiens. Brackets, scores validés, et des
          résultats qui ne se perdent plus.
        </p>
      </header>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-arena-faint">
          Tournois
        </h2>

        {erreurConfig || tournois.length === 0 ? (
          <div className="rounded-lg border border-arena-border bg-arena-surface shadow-carte p-8 text-center text-arena-faint">
            Aucun tournoi publié pour le moment. Reviens bientôt.
          </div>
        ) : (
          <ul className="space-y-3">
            {tournois.map((t) => (
              <li key={t.id}>
                <a
                  href={`/t/${t.qr_token}`}
                  className="block rounded-lg border border-arena-border bg-arena-surface shadow-carte p-4 transition-colors hover:border-arena-violet/50"
                >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold">{t.titre}</p>
                    <p className="text-sm text-arena-muted">
                      {t.jeu} ·{" "}
                      {new Date(t.date_debut).toLocaleDateString("fr-FR", {
                        dateStyle: "long",
                      })}
                      {t.lieu ? ` · ${t.lieu}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      t.statut === "EN_COURS"
                        ? "bg-arena-violet-pale text-arena-lilac"
                        : t.statut === "OUVERT"
                          ? "bg-arena-green-pale text-arena-green"
                          : "bg-arena-surface text-arena-muted"
                    }`}
                  >
                    {LABELS[t.statut] ?? t.statut}
                  </span>
                </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-16 text-center text-xs text-arena-faint">
        Un projet Velito, Amiens ·{" "}
        <a href="/classement" className="underline hover:text-arena-muted">
          Classement
        </a>{" "}
        ·{" "}
        <a href="/prevention" className="underline hover:text-arena-muted">
          Esport responsable
        </a>{" "}
        ·{" "}
        <a href="/reglement" className="underline hover:text-arena-muted">
          Règlement
        </a>{" "}
        ·{" "}
        <a href="/admin" className="underline hover:text-arena-muted">
          Espace orga
        </a>
      </footer>
    </div>
  );
}
