/**
 * Indemnités kilométriques — Server Component (07/11/2026).
 *
 * Trajets (distance réelle, taux saisi par l'association, montant arrondi
 * par trajet), doublons possibles signalés, rattachement à une note de frais
 * en cours du même bénéficiaire. Filtres par exercice et par personne dans
 * l'URL. Calculs : service pur ik ; écritures : actions.ts.
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { roleSurEntite } from "@/lib/repositories/membres";
import { listerLignesEntite, listerNotes, listerTrajets } from "@/lib/repositories/notes-de-frais";
import { formaterCentimes } from "@/lib/services/montants";
import { centikmDepuisBase, doublonsPossibles, formaterDistance, formaterTaux, normaliser, totalTrajets } from "@/lib/services/ik";
import { estModifiable } from "@/lib/services/notes-de-frais";
import { FormulaireTrajet } from "@/components/FormulaireTrajet";
import { TableauTrajets, type VueTrajet } from "@/components/TableauTrajets";

export default async function IkPage({
  params,
  searchParams,
}: {
  params: Promise<{ entiteId: string }>;
  searchParams: Promise<{ exercice?: string; personne?: string }>;
}) {
  const { entiteId } = await params;
  const { exercice = "", personne = "" } = await searchParams;
  const supabase = await createClient();
  const [trajets, notes, lignes, role] = await Promise.all([
    listerTrajets(supabase, entiteId),
    listerNotes(supabase, entiteId),
    listerLignesEntite(supabase, entiteId),
    roleSurEntite(supabase, entiteId),
  ]);
  const peutEcrire = role === "proprietaire" || role === "tresorier";
  const aujourdHui = new Date().toISOString().slice(0, 10);

  // Doublons calculés sur TOUS les trajets (un doublon peut être hors filtre).
  const doublons = doublonsPossibles(trajets);
  const notesParId = new Map(notes.map((n) => [n.id, n]));
  // Note qui porte chaque trajet : la ligne d'une note refusée ne compte plus.
  const noteDuTrajet = new Map<string, (typeof notes)[number]>();
  for (const l of lignes) {
    const n = notesParId.get(l.note_id);
    if (l.trajet_id && n && n.statut !== "refusee") noteDuTrajet.set(l.trajet_id, n);
  }
  const notesEnCours = notes.filter((n) => estModifiable(n));

  const exercices = [...new Set(trajets.map((t) => t.date_trajet.slice(0, 4)))].sort().reverse();
  const personnes = [...new Set(trajets.map((t) => t.beneficiaire))].sort((a, b) => a.localeCompare(b, "fr"));
  const visibles = trajets.filter(
    (t) => (!/^\d{4}$/.test(exercice) || t.date_trajet.startsWith(exercice)) && (!personne || normaliser(t.beneficiaire) === normaliser(personne)),
  );
  const nbDoublons = visibles.filter((t) => doublons.has(t.id)).length;
  // Aide à la saisie seulement : le dernier taux saisi par l'association.
  const dernier = [...trajets].sort((a, b) => b.cree_le.localeCompare(a.cree_le))[0];

  const vues: VueTrajet[] = visibles.map((t) => {
    const n = noteDuTrajet.get(t.id);
    return {
      id: t.id,
      date: t.date_trajet,
      beneficiaire: t.beneficiaire,
      trajet: `${t.depart} → ${t.arrivee}`,
      motif: t.motif,
      distance: formaterDistance(centikmDepuisBase(t.distance_km)),
      allerRetour: t.aller_retour,
      taux: formaterTaux(t.taux_km_dixmillimes),
      montantCentimes: Number(t.montant_centimes),
      doublon: doublons.has(t.id),
      note: n ? { id: n.id, numero: n.numero, modifiable: estModifiable(n) } : null,
      notesPossibles: notesEnCours
        .filter((x) => normaliser(x.beneficiaire) === normaliser(t.beneficiaire))
        .map((x) => ({ id: x.id, libelle: `${x.numero} · ${x.objet}` })),
    };
  });
  const champ = "rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent";

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Indemnités kilométriques</h2>
          <p className="text-sm text-compta-text-muted">
            Un trajet = les km réellement parcourus × le taux retenu par l&apos;association, arrondi au centime pour chaque
            trajet. Le retour n&apos;est jamais doublé automatiquement : saisis la distance totale réellement faite. Un trajet
            rattaché à une note de frais en devient une ligne.
          </p>
        </div>
        <Link href={`/${entiteId}/notes-de-frais`} className="whitespace-nowrap text-sm text-compta-text-muted hover:text-compta-accent">
          ← Notes de frais
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-lg border border-compta-border bg-compta-surface p-3">
        <label>
          <span className="mb-1 block text-xs font-medium text-compta-text-muted">Exercice</span>
          <select name="exercice" defaultValue={exercice} className={champ}>
            <option value="">Tous</option>
            {exercices.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-compta-text-muted">Personne</span>
          <select name="personne" defaultValue={personne} className={champ}>
            <option value="">Toutes</option>
            {personnes.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white hover:bg-compta-accent-hover">
          Filtrer
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-compta-border bg-compta-surface p-3">
          <p className="text-xs text-compta-text-muted">Trajets</p>
          <p className="text-lg font-semibold tabular-nums">{visibles.length}</p>
        </div>
        <div className="rounded-lg border border-compta-border bg-compta-surface p-3">
          <p className="text-xs text-compta-text-muted">Total (somme des trajets arrondis)</p>
          <p className="text-lg font-semibold tabular-nums">{formaterCentimes(totalTrajets(visibles))}</p>
        </div>
        <div className="rounded-lg border border-compta-border bg-compta-surface p-3">
          <p className="text-xs text-compta-text-muted">Doublons possibles</p>
          <p className={`text-lg font-semibold tabular-nums ${nbDoublons > 0 ? "text-compta-depense" : ""}`}>{nbDoublons}</p>
        </div>
      </div>

      <TableauTrajets entiteId={entiteId} trajets={vues} peutEcrire={peutEcrire} />

      {peutEcrire && (
        <div className="space-y-2">
          <h3 className="font-semibold">Nouveau trajet</h3>
          <FormulaireTrajet
            entiteId={entiteId}
            dernierTaux={dernier ? formaterTaux(dernier.taux_km_dixmillimes) : ""}
            beneficiaires={[...new Set([...personnes, ...notes.map((n) => n.beneficiaire)])].sort((a, b) => a.localeCompare(b, "fr"))}
            aujourdHui={aujourdHui}
          />
        </div>
      )}
    </section>
  );
}
