/**
 * Liste des tournois de l'organisation (espace orga).
 * Lecture via service client APRÈS vérification staff par le layout parent —
 * on re-vérifie quand même ici (défense en profondeur, le layout n'est pas
 * une barrière de sécurité garantie pour les data fetches).
 */
import Link from "next/link";
import { getContexteStaff } from "@/lib/arena/auth";
import { getServiceClient } from "@/lib/supabase/service";
import type { Tournoi } from "@/lib/arena/types";

export default async function ListeTournois() {
  const ctx = await getContexteStaff();
  if (!ctx) return null; // le layout affiche déjà l'écran de connexion

  const db = getServiceClient();
  const { data } = await db
    .from("arena_tournois")
    .select("*")
    .eq("organisation_id", ctx.organisation.id)
    .order("date_debut", { ascending: false });

  const tournois = (data ?? []) as Tournoi[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black">Tournois</h1>
        <Link
          href="/admin/tournois/nouveau"
          className="rounded-lg bg-arena-violet px-4 py-2 text-sm font-semibold text-white hover:bg-arena-violet/80"
        >
          + Nouveau tournoi
        </Link>
      </div>

      {tournois.length === 0 ? (
        <div className="rounded-lg border border-arena-border bg-arena-surface p-8 text-center text-gray-500">
          Aucun tournoi. Crée le premier — celui de la rentrée ?
        </div>
      ) : (
        <ul className="space-y-2">
          {tournois.map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/tournois/${t.id}`}
                className="flex items-center justify-between rounded-lg border border-arena-border bg-arena-surface p-4 hover:border-arena-violet/50"
              >
                <div>
                  <p className="font-bold">{t.titre}</p>
                  <p className="text-sm text-gray-400">
                    {t.jeu} ·{" "}
                    {new Date(t.date_debut).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300">
                  {t.statut}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
