/**
 * BilanEventForm — Editeur du BILAN PUBLIC d'un evenement.
 *
 * Panneau repliable sur la fiche /admin/evenements/[id]. L'admin saisit a la
 * main les chiffres du bilan (total present, mixite F/G, joueurs, spectateurs,
 * benevoles) + un texte de recap, et choisit ligne par ligne ce qui est rendu
 * public via des cases a cocher. Un interrupteur global "Rendre ce bilan public"
 * controle si la page /agenda/[slug] est accessible aux visiteurs.
 *
 * Important : ces chiffres ne viennent PAS du scan QR. C'est un bilan editorial
 * (ex : 50 personnes sur le stand meme si toutes n'ont pas scanne). Aucun nom
 * n'est jamais expose cote public — uniquement des nombres agreges + le texte.
 */
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateBilanAction } from "./actions";

interface BilanEventFormProps {
  event: {
    id: string;
    event_slug: string;
    bilan_public: boolean;
    bilan_recap: string | null;
    bilan_nb_total: number | null;
    bilan_nb_filles: number | null;
    bilan_nb_garcons: number | null;
    bilan_nb_joueurs: number | null;
    bilan_nb_spectateurs: number | null;
    bilan_nb_benevoles: number | null;
    bilan_show_total: boolean;
    bilan_show_genre: boolean;
    bilan_show_joueurs: boolean;
    bilan_show_spectateurs: boolean;
    bilan_show_benevoles: boolean;
  };
}

// Helper : nombre (ou "") <-> state string, pour gerer le champ vide = NULL.
const toStr = (n: number | null) => (n === null || n === undefined ? "" : String(n));
const toNb = (s: string): number | null => {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export default function BilanEventForm({ event }: BilanEventFormProps) {
  const [open, setOpen] = useState(false);

  const [bilanPublic, setBilanPublic] = useState(event.bilan_public);
  const [recap, setRecap] = useState(event.bilan_recap ?? "");
  const [total, setTotal] = useState(toStr(event.bilan_nb_total));
  const [filles, setFilles] = useState(toStr(event.bilan_nb_filles));
  const [garcons, setGarcons] = useState(toStr(event.bilan_nb_garcons));
  const [joueurs, setJoueurs] = useState(toStr(event.bilan_nb_joueurs));
  const [spectateurs, setSpectateurs] = useState(toStr(event.bilan_nb_spectateurs));
  const [benevoles, setBenevoles] = useState(toStr(event.bilan_nb_benevoles));

  const [showTotal, setShowTotal] = useState(event.bilan_show_total);
  const [showGenre, setShowGenre] = useState(event.bilan_show_genre);
  const [showJoueurs, setShowJoueurs] = useState(event.bilan_show_joueurs);
  const [showSpectateurs, setShowSpectateurs] = useState(event.bilan_show_spectateurs);
  const [showBenevoles, setShowBenevoles] = useState(event.bilan_show_benevoles);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateBilanAction({
        id: event.id,
        eventSlug: event.event_slug,
        bilanPublic,
        recap,
        nbTotal: toNb(total),
        nbFilles: toNb(filles),
        nbGarcons: toNb(garcons),
        nbJoueurs: toNb(joueurs),
        nbSpectateurs: toNb(spectateurs),
        nbBenevoles: toNb(benevoles),
        showTotal,
        showGenre,
        showJoueurs,
        showSpectateurs,
        showBenevoles,
      });
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      setSuccess(
        bilanPublic
          ? "Bilan enregistre et publie. Le lien apparait sur la card de l'agenda."
          : "Bilan enregistre (non public pour l'instant).",
      );
    });
  }

  const inputClass =
    "w-full bg-white border border-vea-border rounded-lg px-3 py-2 text-sm text-vea-text focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15";
  const labelClass = "block text-xs font-semibold text-vea-text-muted mb-1";
  const checkClass = "w-4 h-4 accent-vea-accent shrink-0";

  // Petite ligne "chiffre + case visible".
  function NumberRow({
    id,
    label,
    value,
    onValue,
    show,
    onShow,
    hint,
  }: {
    id: string;
    label: string;
    value: string;
    onValue: (v: string) => void;
    show: boolean;
    onShow: (v: boolean) => void;
    hint?: string;
  }) {
    return (
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor={id} className={labelClass}>{label}</label>
          <input
            type="number"
            min={0}
            id={id}
            value={value}
            onChange={(e) => onValue(e.target.value)}
            className={inputClass}
            placeholder="—"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-vea-text-muted pb-2.5 whitespace-nowrap">
          <input type="checkbox" checked={show} onChange={(e) => onShow(e.target.checked)} className={checkClass} />
          Visible
        </label>
        {hint && <span className="sr-only">{hint}</span>}
      </div>
    );
  }

  return (
    <div className="card-clean p-4 mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-bold text-vea-text">
          Bilan public de l&apos;event {open ? "▲" : "▼"}
        </span>
        <span className="text-[11px] text-vea-text-dim">
          {event.bilan_public ? "Publie" : "Non public"} · chiffres saisis a la main
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-[11px] text-vea-text-dim leading-relaxed">
            Ces chiffres ne viennent pas du scan : c&apos;est toi qui les remplis
            (ex : 50 personnes sur le stand meme si toutes n&apos;ont pas scanne).
            Coche &laquo;&nbsp;Visible&nbsp;&raquo; sur ce que tu veux exposer.
            Aucun nom n&apos;est jamais affiche cote public.
          </p>

          {/* Interrupteur global */}
          <label className="flex items-start gap-2 text-sm text-vea-text bg-vea-accent-soft/30 border border-vea-accent/20 rounded-lg px-3 py-2">
            <input
              type="checkbox"
              checked={bilanPublic}
              onChange={(e) => setBilanPublic(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-vea-accent"
            />
            <span>
              <strong>Rendre ce bilan public</strong> — affiche un bouton
              &laquo;&nbsp;Voir le bilan&nbsp;&raquo; sur la card de l&apos;agenda
              et ouvre la page <span className="font-mono">/agenda/{event.event_slug}</span>.
            </span>
          </label>

          {/* Recap */}
          <div>
            <label htmlFor="bilan-recap" className={labelClass}>Texte de recap (public)</label>
            <textarea
              id="bilan-recap"
              value={recap}
              onChange={(e) => setRecap(e.target.value.slice(0, 2000))}
              rows={3}
              className={inputClass}
              placeholder="Ex : Belle apres-midi sur notre stand, beaucoup de jeunes du quartier, ambiance au top..."
            />
          </div>

          {/* Chiffres + visibilite */}
          <div className="space-y-3">
            <NumberRow id="bilan-total" label="Total presents" value={total} onValue={setTotal} show={showTotal} onShow={setShowTotal} />
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label htmlFor="bilan-filles" className={labelClass}>Filles</label>
                <input type="number" min={0} id="bilan-filles" value={filles} onChange={(e) => setFilles(e.target.value)} className={inputClass} placeholder="—" />
              </div>
              <div>
                <label htmlFor="bilan-garcons" className={labelClass}>Garcons</label>
                <input type="number" min={0} id="bilan-garcons" value={garcons} onChange={(e) => setGarcons(e.target.value)} className={inputClass} placeholder="—" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-vea-text-muted -mt-1">
              <input type="checkbox" checked={showGenre} onChange={(e) => setShowGenre(e.target.checked)} className={checkClass} />
              Afficher la mixite filles / garcons publiquement
            </label>
            {(() => {
              const f = toNb(filles) ?? 0;
              const g = toNb(garcons) ?? 0;
              const t = f + g;
              if (t <= 0) return null;
              const pf = Math.round((f / t) * 100);
              return (
                <p className="text-[11px] text-vea-accent font-semibold -mt-1">
                  Mixite : {pf}% filles / {100 - pf}% garcons (sur {t} renseigne{t > 1 ? "s" : ""})
                </p>
              );
            })()}

            <NumberRow id="bilan-joueurs" label="Joueurs" value={joueurs} onValue={setJoueurs} show={showJoueurs} onShow={setShowJoueurs} />
            <NumberRow id="bilan-spectateurs" label="Spectateurs" value={spectateurs} onValue={setSpectateurs} show={showSpectateurs} onShow={setShowSpectateurs} />
            <NumberRow id="bilan-benevoles" label="Benevoles" value={benevoles} onValue={setBenevoles} show={showBenevoles} onShow={setShowBenevoles} />
          </div>

          {error && (
            <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}
          {success && (
            <div role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <button type="submit" disabled={isPending} className="px-4 py-2 rounded-full bg-vea-accent text-white text-sm font-bold hover:bg-vea-accent-hover disabled:opacity-50">
              {isPending ? "Enregistrement…" : "Enregistrer le bilan"}
            </button>
            {event.bilan_public && (
              <Link href={`/agenda/${event.event_slug}`} target="_blank" className="text-xs text-vea-accent hover:underline">
                Voir la page publique ↗
              </Link>
            )}
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-full border border-vea-border text-sm text-vea-text-muted hover:text-vea-text">
              Fermer
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
