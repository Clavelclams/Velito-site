"use client";

/**
 * Liste des trajets IK (07/11/2026) : doublons possibles signalés (jamais
 * bloqués), rattachement à une note de frais en cours du même bénéficiaire,
 * détachement et suppression. Le serveur revérifie tout.
 */
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formaterCentimes } from "@/lib/services/montants";
import { detacherTrajetAction, rattacherTrajetAction, supprimerTrajetAction } from "@/app/[entiteId]/ik/actions";

export interface VueTrajet {
  id: string;
  date: string;
  beneficiaire: string;
  trajet: string;
  motif: string;
  distance: string;
  allerRetour: boolean;
  taux: string;
  montantCentimes: number;
  doublon: boolean;
  /** Note qui porte ce trajet (non refusée), sinon null. */
  note: { id: string; numero: string; modifiable: boolean } | null;
  /** Notes en cours (brouillon, à vérifier) du même bénéficiaire. */
  notesPossibles: { id: string; libelle: string }[];
}

const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function TableauTrajets({ entiteId, trajets, peutEcrire }: { entiteId: string; trajets: VueTrajet[]; peutEcrire: boolean }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [choix, setChoix] = useState<Record<string, string>>({});

  const lancer = (fn: () => Promise<{ success: boolean; error?: string }>) => {
    setErreur(null);
    demarrer(async () => {
      const r = await fn();
      if (!r.success) setErreur(r.error ?? "Action impossible.");
      router.refresh();
    });
  };

  if (trajets.length === 0) return <p className="text-sm text-compta-text-muted">Aucun trajet pour ces filtres.</p>;

  return (
    <div className="space-y-2">
      {erreur && <p className="text-sm text-compta-depense">{erreur}</p>}
      <div className="overflow-x-auto rounded-lg border border-compta-border">
        <table className="w-full text-sm">
          <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Trajet</th>
              <th className="px-3 py-2 text-right font-medium">Km réels</th>
              <th className="px-3 py-2 text-right font-medium">Taux</th>
              <th className="px-3 py-2 text-right font-medium">Montant</th>
              <th className="px-3 py-2 font-medium">Note de frais</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-compta-border bg-compta-surface">
            {trajets.map((t) => (
              <tr key={t.id} className={t.doublon ? "bg-compta-depense/5" : undefined}>
                <td className="whitespace-nowrap px-3 py-2">{dateFr(t.date)}</td>
                <td className="px-3 py-2">
                  {t.beneficiaire} · {t.trajet}
                  <span className="block text-xs text-compta-text-muted">
                    {t.motif}
                    {t.allerRetour ? " · aller-retour" : ""}
                  </span>
                  {t.doublon && <span className="block text-xs font-medium text-compta-depense">Doublon possible : même jour, même trajet, même personne.</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{t.distance}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{t.taux} €</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formaterCentimes(t.montantCentimes)}</td>
                <td className="px-3 py-2">
                  {t.note ? (
                    <div className="space-y-1">
                      <Link href={`/${entiteId}/notes-de-frais/${t.note.id}`} className="font-medium text-compta-accent hover:underline">
                        {t.note.numero}
                      </Link>
                      {peutEcrire && t.note.modifiable && (
                        <button
                          type="button"
                          disabled={enCours}
                          onClick={() => lancer(() => detacherTrajetAction(entiteId, t.id))}
                          className="block text-xs text-compta-text-muted underline-offset-2 hover:underline disabled:opacity-50"
                        >
                          Détacher
                        </button>
                      )}
                    </div>
                  ) : peutEcrire ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {t.notesPossibles.length > 0 ? (
                        <>
                          <select
                            value={choix[t.id] ?? ""}
                            onChange={(e) => setChoix({ ...choix, [t.id]: e.target.value })}
                            className="max-w-[12rem] rounded-md border border-compta-border bg-white px-2 py-1 text-xs"
                          >
                            <option value="">Rattacher à…</option>
                            {t.notesPossibles.map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.libelle}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={enCours || !choix[t.id]}
                            onClick={() => lancer(() => rattacherTrajetAction(entiteId, t.id, choix[t.id] ?? ""))}
                            className="text-xs font-medium text-compta-accent disabled:opacity-50"
                          >
                            OK
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-compta-text-muted">Aucune note en cours à ce nom</span>
                      )}
                      <button
                        type="button"
                        disabled={enCours}
                        onClick={() => {
                          if (window.confirm("Supprimer ce trajet ?")) lancer(() => supprimerTrajetAction(entiteId, t.id));
                        }}
                        className="text-xs text-compta-depense underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-compta-text-muted">Non rattaché</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
