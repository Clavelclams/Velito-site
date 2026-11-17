/**
 * /admin/defis/{id}/recap : le récapitulatif imprimable (17/11/2026).
 * Scores par rotation, gagnant, total, rotations jouées, record du jour.
 */
import { notFound } from "next/navigation";
import { estStaffDe, getContexteStaff } from "@/lib/arena/auth";
import { chargerDefiParId } from "@/lib/arena/defi-donnees";
import { classementDuJour, nomEquipe, recapitulatif, recordDuJour } from "@/lib/arena/defi";

export const dynamic = "force-dynamic";

export default async function PageRecap({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContexteStaff();
  if (!ctx) return null;
  const complet = await chargerDefiParId(id);
  if (!complet || !estStaffDe(ctx, complet.defi.organisation_id)) notFound();
  const { defi, rotations, equipes } = complet;
  const recap = recapitulatif(rotations, equipes);
  const classement = classementDuJour(rotations, equipes);
  const record = recordDuJour(classement);
  const cellule = "border border-arena-border px-2 py-1.5";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black">{defi.titre}</h1>
          <p className="text-sm text-arena-muted">
            {recap.rotationsJouees} rotation(s) jouée(s) · {recap.totalJour} {defi.unite} au total
            {record && ` · record : ${record.score} ${defi.unite} (${record.equipes.join(", ")})`}
          </p>
        </div>
        <p className="flex gap-4 text-sm">
          <a href={`/admin/defis/${defi.id}`} className="font-semibold text-arena-violet underline">Saisie</a>
          <a href={`/admin/defis/${defi.id}/export`} className="font-semibold text-arena-violet underline">Télécharger le CSV</a>
        </p>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead className="bg-arena-surface-fort text-left">
          <tr>
            <th className={cellule}>Rotation</th>
            <th className={cellule}>Heure</th>
            <th className={cellule}>Rouge</th>
            <th className={cellule}>Bleu</th>
            <th className={cellule}>Total</th>
            <th className={cellule}>Gagnant</th>
            <th className={cellule}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {recap.lignes.map((l) => (
            <tr key={l.numero} className={l.statut === "VALIDEE" ? "" : "text-arena-faint"}>
              <td className={`${cellule} font-bold`}>G{l.numero}</td>
              <td className={cellule}>{l.heure?.replace(":", "h") ?? ""}</td>
              <td className={`${cellule} tabular-nums`}>{l.rouge}</td>
              <td className={`${cellule} tabular-nums`}>{l.bleu}</td>
              <td className={`${cellule} font-bold tabular-nums`}>{l.total}</td>
              <td className={cellule}>
                {l.gagnant === "EGALITE" ? "Égalité" : l.gagnant ? nomEquipe(l.numero, l.gagnant) : ""}
              </td>
              <td className={cellule}>{l.statut === "VALIDEE" ? "jouée" : l.statut === "EN_COURS" ? "en cours" : "à venir"}</td>
            </tr>
          ))}
          <tr className="bg-arena-surface-fort font-black">
            <td className={cellule} colSpan={4}>Total des rotations jouées</td>
            <td className={`${cellule} tabular-nums`}>{recap.totalJour}</td>
            <td className={cellule} colSpan={2}>{recap.rotationsJouees} rotation(s)</td>
          </tr>
        </tbody>
      </table>

      <section>
        <h2 className="mb-2 font-bold">Classement des équipes</h2>
        <ol className="grid gap-1 text-sm sm:grid-cols-2">
          {classement.map((l) => (
            <li key={l.nom} className="flex justify-between rounded border border-arena-border px-3 py-1.5">
              <span>{l.rang}. {l.nom}</span>
              <span className="font-bold tabular-nums">{l.score}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
