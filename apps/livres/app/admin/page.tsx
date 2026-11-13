/**
 * Administration : toutes les boîtes (actives ou non), signalements en
 * attente, ajout d'une boîte (13/11/2026). Lecture par service_role : la
 * page est derrière le contrôle du layout, les actions le refont.
 */
import Link from "next/link";
import { getServiceClient } from "@/lib/supabase/service";
import { ajouterBoiteAction } from "@/lib/livres/actions";
import { LIBELLE_ETAT, type EtatBoite } from "@/lib/livres/regles";
import ChampsBoite from "@/components/ChampsBoite";

export default async function Admin({ searchParams }: { searchParams: Promise<{ erreur?: string; ajoute?: string }> }) {
  const { erreur, ajoute } = await searchParams;
  const db = getServiceClient();
  const [{ data: boitesData }, { data: sigData }] = await Promise.all([
    db.schema("livres").from("boites").select("id, slug, nom, quartier, etat, active").order("nom"),
    db.schema("livres").from("signalements").select("boite_id").is("traite_le", null),
  ]);
  const boites = (boitesData ?? []) as { id: string; slug: string; nom: string; quartier: string | null; etat: EtatBoite; active: boolean }[];
  const enAttente = new Map<string, number>();
  for (const s of (sigData ?? []) as { boite_id: string }[]) enAttente.set(s.boite_id, (enAttente.get(s.boite_id) ?? 0) + 1);

  return (
    <div className="space-y-8">
      {erreur && <p role="alert" className="rounded-lg bg-livre-abimee-pale p-3 font-semibold text-livre-abimee">{erreur}</p>}
      {ajoute && <p role="status" className="rounded-lg bg-livre-vert-pale p-3 font-semibold text-livre-vert">Boîte ajoutée.</p>}

      <section>
        <h1 className="mb-3 text-2xl font-bold">Boîtes ({boites.length})</h1>
        {boites.length === 0 ? (
          <p className="text-livre-doux">Aucune boîte pour l&apos;instant : ajoute la première ci-dessous.</p>
        ) : (
          <ul className="divide-y divide-livre-trait rounded-xl border border-livre-trait bg-livre-carte">
            {boites.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span>
                  <Link href={`/admin/boite/${b.id}`} className="font-semibold text-livre-vert underline">{b.nom}</Link>
                  <span className="text-sm text-livre-doux">
                    {" "}· {LIBELLE_ETAT[b.etat]}{b.quartier ? ` · ${b.quartier}` : ""}{b.active ? "" : " · retirée"}
                  </span>
                </span>
                {(enAttente.get(b.id) ?? 0) > 0 && (
                  <span className="rounded-full bg-livre-vide-pale px-2 py-0.5 text-xs font-bold text-livre-vide">
                    {enAttente.get(b.id)} signalement{(enAttente.get(b.id) ?? 0) > 1 ? "s" : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-livre-trait bg-livre-carte p-4">
        <h2 className="mb-3 text-xl font-bold">Ajouter une boîte</h2>
        <form action={ajouterBoiteAction} className="space-y-4">
          <ChampsBoite />
          <button className="rounded-lg bg-livre-vert px-5 py-3 font-semibold text-white hover:bg-livre-vert-fonce">Ajouter</button>
        </form>
      </section>
    </div>
  );
}
