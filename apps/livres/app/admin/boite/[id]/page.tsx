/**
 * Fiche bénévole d'une boîte (13/11/2026) : modifier, changer l'état,
 * traiter les signalements, et le QR code à imprimer et coller sur la boîte.
 *
 * QR code généré côté serveur (bibliothèque `qrcode`, image en data URL,
 * comme la feuille QR d'ARENA) : rien à télécharger, ça s'imprime avec
 * Ctrl+P. Il pointe vers l'adresse publique de la fiche.
 */
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getServiceClient } from "@/lib/supabase/service";
import { modifierBoiteAction, traiterSignalementAction } from "@/lib/livres/actions";
import { depuis, ETATS, LIBELLE_ETAT, LIBELLE_SIGNALEMENT } from "@/lib/livres/regles";
import type { Boite, Signalement } from "@/lib/livres/types";
import ChampsBoite from "@/components/ChampsBoite";

const SITE = "https://livres.velito.fr";

export default async function AdminBoite({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string; enregistre?: string }>;
}) {
  const { id } = await params;
  const { erreur, enregistre } = await searchParams;
  const db = getServiceClient();
  const [{ data: bData }, { data: sData }] = await Promise.all([
    db.schema("livres").from("boites").select("*").eq("id", id).maybeSingle(),
    db.schema("livres").from("signalements").select("*").eq("boite_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  const b = bData as Boite | null;
  if (!b) notFound();
  const signalements = (sData ?? []) as Signalement[];
  const lien = `${SITE}/boite/${b.slug}`;
  const qr = await QRCode.toDataURL(lien, { width: 480, margin: 2, errorCorrectionLevel: "M" });
  const maintenant = new Date();

  return (
    <div className="space-y-8">
      {erreur && <p role="alert" className="rounded-lg bg-livre-abimee-pale p-3 font-semibold text-livre-abimee">{erreur}</p>}
      {enregistre && <p role="status" className="rounded-lg bg-livre-vert-pale p-3 font-semibold text-livre-vert">Enregistré.</p>}

      <h1 className="text-2xl font-bold">{b.nom}</h1>

      <section className="rounded-xl border border-livre-trait bg-livre-carte p-4">
        <h2 className="mb-3 text-xl font-bold">Signalements</h2>
        {signalements.length === 0 ? (
          <p className="text-livre-doux">Aucun signalement.</p>
        ) : (
          <ul className="divide-y divide-livre-trait">
            {signalements.map((s) => (
              <li key={s.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                <span>
                  <b>{LIBELLE_SIGNALEMENT[s.type]}</b>
                  <span className="text-sm text-livre-doux"> · {depuis(s.created_at, maintenant)}</span>
                  {s.message && <span className="mt-1 block whitespace-pre-line text-sm">{s.message}</span>}
                </span>
                {s.traite_le ? (
                  <span className="text-sm text-livre-doux">Traité</span>
                ) : (
                  <form action={traiterSignalementAction}>
                    <input type="hidden" name="boite_id" value={b.id} />
                    <input type="hidden" name="signalement_id" value={s.id} />
                    <button className="rounded-lg border border-livre-vert px-3 py-1 text-sm font-semibold text-livre-vert">Marquer traité</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-livre-trait bg-livre-carte p-4">
        <h2 className="mb-3 text-xl font-bold">Modifier</h2>
        <form action={modifierBoiteAction} className="space-y-4">
          <input type="hidden" name="id" value={b.id} />
          <ChampsBoite b={b} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm font-semibold">État</span>
              <select name="etat" defaultValue={b.etat} className="w-full rounded-lg border border-livre-trait bg-white px-3 py-2">
                {ETATS.map((e) => (
                  <option key={e} value={e}>{LIBELLE_ETAT[e]}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 pt-6">
              <input type="checkbox" name="active" defaultChecked={b.active} /> Visible sur le site
            </label>
          </div>
          <button className="rounded-lg bg-livre-vert px-5 py-3 font-semibold text-white hover:bg-livre-vert-fonce">Enregistrer</button>
        </form>
      </section>

      <section className="rounded-xl border border-livre-trait bg-livre-carte p-4 text-center">
        <h2 className="mb-1 text-xl font-bold">QR code à coller sur la boîte</h2>
        <p className="mb-3 text-sm text-livre-doux">Imprime cette page (Ctrl+P), découpe, plastifie si possible.</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL générée côté serveur */}
        <img src={qr} alt={`QR code vers la fiche de la boîte ${b.nom}`} width={240} height={240} className="mx-auto" />
        <p className="mt-2 font-semibold">Boîte à livres · {b.nom}</p>
        <p className="text-sm">Scanne : dis si elle est vide ou abîmée, sans compte.</p>
        <p className="mt-1 break-all text-xs text-livre-doux">{lien}</p>
      </section>
    </div>
  );
}
