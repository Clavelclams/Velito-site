"use client";

/**
 * Formulaire de création d'une clé d'API (14/11/2026).
 *
 * Seul composant client de la page : il faut AFFICHER la clé renvoyée par
 * l'action, une seule fois, sans la mettre dans l'URL (une URL finit dans
 * l'historique et les journaux). useActionState garde la réponse de l'action
 * en mémoire du navigateur : rechargée, la page ne la montre plus.
 */
import { useActionState, useState } from "react";
import { creerCleApi, type EtatCreationCle } from "@/lib/arena/actions-api";

const inputCls =
  "rounded-lg border border-arena-border bg-arena-surface px-3 py-2 text-sm focus:border-arena-violet focus:outline-none";
const btn =
  "rounded-lg bg-arena-violet px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-arena-violet-fonce disabled:opacity-60";

export default function CreerCleApi({
  organisations,
}: {
  organisations: { id: string; name: string }[];
}) {
  const [etat, action, enCours] = useActionState<EtatCreationCle, FormData>(creerCleApi, {});
  const [copie, setCopie] = useState(false);

  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-end gap-3">
        {organisations.length > 1 ? (
          <label className="flex flex-col gap-1 text-sm">
            Organisation
            <select name="organisation_id" className={inputCls} required>
              {organisations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="organisation_id" value={organisations[0]?.id ?? ""} />
        )}
        <label className="flex flex-col gap-1 text-sm">
          Nom de la clé
          <input
            name="nom"
            required
            minLength={2}
            maxLength={60}
            placeholder="Site du club"
            className={`${inputCls} w-56`}
          />
        </label>
        <button className={btn} disabled={enCours}>
          {enCours ? "Création…" : "Créer une clé"}
        </button>
      </form>

      {etat.erreur && (
        <p role="alert" className="rounded-lg border border-arena-red/30 bg-arena-red-pale px-4 py-3 text-sm text-arena-red">
          {etat.erreur}
        </p>
      )}

      {etat.cle && (
        <div className="rounded-lg border border-arena-green/40 bg-arena-green-pale p-4 text-sm">
          <p className="font-bold text-arena-green">Clé « {etat.nom} » créée.</p>
          <p className="mt-1 text-arena-muted">
            Copie-la maintenant : elle ne sera <strong>plus jamais affichée</strong>. Si tu la
            perds, révoque-la et crée-en une autre.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-arena-surface px-3 py-2 font-mono text-xs text-arena-ink">
              {etat.cle}
            </code>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(etat.cle ?? "");
                  setCopie(true);
                } catch {
                  setCopie(false);
                }
              }}
              className="rounded-lg border border-arena-border px-3 py-1.5 text-xs font-semibold text-arena-muted hover:text-arena-ink"
            >
              {copie ? "Copiée" : "Copier"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
