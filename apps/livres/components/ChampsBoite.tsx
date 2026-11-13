/**
 * Champs du formulaire d'une boîte, partagés par l'ajout et la modification
 * (13/11/2026). Server Component : simple HTML, aucun JavaScript.
 */
import type { Boite } from "@/lib/livres/types";

const champ = "w-full rounded-lg border border-livre-trait bg-white px-3 py-2";

export default function ChampsBoite({ b }: { b?: Partial<Boite> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 sm:col-span-2">
        <span className="text-sm font-semibold">Nom *</span>
        <input name="nom" required minLength={2} maxLength={80} defaultValue={b?.nom ?? ""} className={champ} placeholder="Parc Saint-Pierre" />
      </label>
      <label className="grid gap-1">
        <span className="text-sm font-semibold">Latitude *</span>
        <input name="lat" required inputMode="decimal" defaultValue={b?.lat ?? ""} className={champ} placeholder="49.9005" />
      </label>
      <label className="grid gap-1">
        <span className="text-sm font-semibold">Longitude *</span>
        <input name="lng" required inputMode="decimal" defaultValue={b?.lng ?? ""} className={champ} placeholder="2.3070" />
      </label>
      <p className="text-xs text-livre-doux sm:col-span-2">
        Astuce : sur Google Maps, appui long sur l&apos;emplacement, les deux nombres
        s&apos;affichent (le premier est la latitude). Sur OpenStreetMap : clic droit,
        « Afficher l&apos;adresse ».
      </p>
      <label className="grid gap-1">
        <span className="text-sm font-semibold">Adresse</span>
        <input name="adresse" maxLength={200} defaultValue={b?.adresse ?? ""} className={champ} />
      </label>
      <label className="grid gap-1">
        <span className="text-sm font-semibold">Quartier</span>
        <input name="quartier" maxLength={80} defaultValue={b?.quartier ?? ""} className={champ} placeholder="Saint-Leu, Étouvie, Nord…" />
      </label>
      <label className="grid gap-1">
        <span className="text-sm font-semibold">Référent (prénom + initiale)</span>
        <input name="referent" maxLength={40} defaultValue={b?.referent ?? ""} className={champ} placeholder="Léa M." />
      </label>
      <label className="grid gap-1">
        <span className="text-sm font-semibold">Origine</span>
        <select name="origine" defaultValue={b?.origine ?? "existante"} className={champ}>
          <option value="existante">Boîte existante recensée</option>
          <option value="velito">Posée par VEA</option>
          <option value="ville">Posée par la Ville</option>
          <option value="budget_participatif">Budget participatif</option>
        </select>
      </label>
      <label className="grid gap-1 sm:col-span-2">
        <span className="text-sm font-semibold">Photo (adresse https://)</span>
        <input name="photo_url" maxLength={500} defaultValue={b?.photo_url ?? ""} className={champ} />
      </label>
      <label className="grid gap-1 sm:col-span-2">
        <span className="text-sm font-semibold">Description</span>
        <textarea name="description" maxLength={1000} rows={3} defaultValue={b?.description ?? ""} className={champ} placeholder="Devant la médiathèque, à côté du banc." />
      </label>
    </div>
  );
}
