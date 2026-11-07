/**
 * Notes de frais — liste, recherche et filtres (Server Component, 07/11/2026).
 *
 * Recherche par numéro, bénéficiaire ou objet ; filtres par statut et par
 * exercice, passés dans l'URL (?q=…&statut=…&exercice=…) pour qu'un filtre se
 * partage et se recharge. Le filtrage est un service pur testé (filtrerNotes).
 * Total d'une note = somme de ses lignes, jamais stocké.
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { roleSurEntite } from "@/lib/repositories/membres";
import { listerLignesEntite, listerNotes } from "@/lib/repositories/notes-de-frais";
import { formaterCentimes } from "@/lib/services/montants";
import { exercicesDesNotes, filtrerNotes, LIBELLES_STATUT_NOTE, totauxParNote } from "@/lib/services/notes-de-frais";
import { FormulaireNoteFrais } from "@/components/FormulaireNoteFrais";

const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const CLASSE_STATUT: Record<string, string> = {
  brouillon: "text-compta-text-muted",
  a_verifier: "text-compta-accent",
  validee: "font-medium",
  remboursee: "text-compta-recette",
  refusee: "text-compta-depense",
  abandonnee: "text-compta-recette",
};

export default async function NotesDeFraisPage({
  params,
  searchParams,
}: {
  params: Promise<{ entiteId: string }>;
  searchParams: Promise<{ q?: string; statut?: string; exercice?: string }>;
}) {
  const { entiteId } = await params;
  const { q = "", statut = "", exercice = "" } = await searchParams;
  const supabase = await createClient();
  const [notes, lignes, role] = await Promise.all([
    listerNotes(supabase, entiteId),
    listerLignesEntite(supabase, entiteId),
    roleSurEntite(supabase, entiteId),
  ]);
  const peutEcrire = role === "proprietaire" || role === "tresorier";
  const totaux = totauxParNote(lignes);
  const visibles = filtrerNotes(notes, { recherche: q, statut, exercice });
  const totalVisible = visibles.reduce((s, n) => s + (totaux.get(n.id) ?? 0), 0);
  const exercices = exercicesDesNotes(notes);
  const beneficiaires = [...new Set(notes.map((n) => n.beneficiaire))].sort((a, b) => a.localeCompare(b, "fr"));
  const champ = "rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent";

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Notes de frais</h2>
          <p className="text-sm text-compta-text-muted">
            Les dépenses avancées par un membre. La dépense, c&apos;est le ticket : une fois la note validée, chaque ligne
            passe sur le compte « Avances des membres ». Le virement qui rembourse le membre n&apos;est pas une seconde
            dépense, c&apos;est un virement interne.
          </p>
        </div>
        <Link href={`/${entiteId}/ik`} className="whitespace-nowrap text-sm text-compta-text-muted hover:text-compta-accent">
          Indemnités kilométriques →
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-lg border border-compta-border bg-compta-surface p-3">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-compta-text-muted">Recherche (numéro, bénéficiaire, objet)</span>
          <input name="q" defaultValue={q} className={`${champ} w-full`} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-compta-text-muted">Statut</span>
          <select name="statut" defaultValue={statut} className={champ}>
            <option value="">Tous</option>
            {Object.entries(LIBELLES_STATUT_NOTE).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
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
        <button type="submit" className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white hover:bg-compta-accent-hover">
          Filtrer
        </button>
        {(q || statut || exercice) && (
          <Link href={`/${entiteId}/notes-de-frais`} className="px-2 py-2 text-sm text-compta-text-muted hover:text-compta-accent">
            Effacer
          </Link>
        )}
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-compta-text-muted">Aucune note de frais pour l&apos;instant.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-compta-border">
          <table className="w-full text-sm">
            <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Numéro</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Bénéficiaire et objet</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-compta-border bg-compta-surface">
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-compta-text-muted">
                    Aucune note ne correspond à ces filtres.
                  </td>
                </tr>
              )}
              {visibles.map((n) => (
                <tr key={n.id}>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link href={`/${entiteId}/notes-de-frais/${n.id}`} className="font-medium hover:text-compta-accent">
                      {n.numero}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{dateFr(n.date_note)}</td>
                  <td className="px-3 py-2">
                    {n.beneficiaire}
                    <span className="block text-xs text-compta-text-muted">{n.objet}</span>
                  </td>
                  <td className={`whitespace-nowrap px-3 py-2 text-xs ${CLASSE_STATUT[n.statut] ?? ""}`}>{LIBELLES_STATUT_NOTE[n.statut]}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formaterCentimes(totaux.get(n.id) ?? 0)}</td>
                </tr>
              ))}
            </tbody>
            {visibles.length > 0 && (
              <tfoot className="bg-compta-bg font-semibold">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right">
                    {visibles.length} note(s)
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formaterCentimes(totalVisible)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {peutEcrire && (
        <div className="space-y-2">
          <h3 className="font-semibold">Nouvelle note</h3>
          <p className="text-xs text-compta-text-muted">Le numéro (NDF-AAAA-NNN) est attribué automatiquement à la création.</p>
          <FormulaireNoteFrais entiteId={entiteId} beneficiaires={beneficiaires} aujourdHui={new Date().toISOString().slice(0, 10)} />
        </div>
      )}
    </section>
  );
}
