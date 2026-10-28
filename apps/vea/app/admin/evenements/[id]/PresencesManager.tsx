/**
 * PresencesManager — saisie des présents sur place, pensée pour le téléphone.
 * [28/10/2026] Remplace AddManualParticipantForm + ParticipantsList sur la
 * fiche événement (ces deux composants exigeaient téléphone + date de
 * naissance et créaient des doublons ; ils cochaient aussi plusieurs motifs,
 * ce que la base refuse : une présence par personne et par événement).
 *
 * Déroulé :
 *   1. Choisir le motif du prochain ajout (Jouer par défaut).
 *   2. Taper 2 lettres : la recherche part toute seule (prénom, nom ou pseudo).
 *   3. "Ajouter" sur la bonne personne. Personne ? "Créer une fiche".
 *   4. Les points sont mis à jour par la base à chaque ajout ou retrait.
 */
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  searchParticipantsAction,
  addPresenceAction,
  createPreinscritAndAddAction,
  removePresenceAction,
  completerPreinscritAction,
  type Motif,
  type ResultatRecherche,
} from "./presences-actions";

export interface PresentRow {
  participantId: string;
  prenom: string;
  nom: string;
  pseudo: string | null;
  motif: Motif;
  heures: number;
  preInscrit: boolean;
  ajoutePar: string | null;
  ajouteLe: string | null; // ISO
  /** [28/10/2026] Champs de la fiche, pour la compléter au clic (pré-inscrits seulement). */
  aUnCompte: boolean;
  sexe: "F" | "M" | "X" | null;
  annee: number | null;
  quartier: string | null;
  phone: string | null;
}

export interface RetraitRow {
  nom: string;
  retireLe: string; // ISO
  retirePar: string | null;
}

const MOTIFS: { v: Motif; label: string; pts: string }[] = [
  { v: "jouer", label: "Jouer", pts: "10 pts" },
  { v: "aider", label: "Aider", pts: "15 pts/h" },
  { v: "regarder", label: "Regarder", pts: "2 pts" },
];

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })
    : "";

export default function PresencesManager({
  eventSlug,
  dureeParDefaut,
  presents,
  retraits,
}: {
  eventSlug: string;
  dureeParDefaut: number;
  presents: PresentRow[];
  retraits: RetraitRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [motif, setMotif] = useState<Motif>("jouer");
  const [heures, setHeures] = useState(String(dureeParDefaut || 2));
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<ResultatRecherche[]>([]);
  const [recherche, setRecherche] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  const [creation, setCreation] = useState(false);
  const [f, setF] = useState({ prenom: "", nom: "", sexe: "", annee: "", quartier: "" });
  const [doublons, setDoublons] = useState<ResultatRecherche[] | null>(null);

  // [28/10/2026] Fiche ouverte au clic sur un présent (une seule à la fois).
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [fiche, setFiche] = useState({ prenom: "", nom: "", sexe: "", annee: "", quartier: "", phone: "" });

  function ouvrirFiche(p: PresentRow) {
    if (ouvert === p.participantId) {
      setOuvert(null);
      return;
    }
    setOuvert(p.participantId);
    setFiche({
      prenom: p.prenom,
      nom: p.nom === "À compléter" ? "" : p.nom,
      sexe: p.sexe ?? "",
      annee: p.annee ? String(p.annee) : "",
      quartier: p.quartier ?? "",
      phone: p.phone ?? "",
    });
  }

  function enregistrerFiche(p: PresentRow) {
    setMessage(null);
    startTransition(async () => {
      const r = await completerPreinscritAction({
        eventSlug,
        participantId: p.participantId,
        prenom: fiche.prenom,
        nom: fiche.nom,
        sexe: fiche.sexe as "F" | "M" | "X" | "",
        annee: fiche.annee ? Number(fiche.annee) : null,
        quartier: fiche.quartier,
        phone: fiche.phone,
      });
      if (!r.success) {
        setMessage({ ok: false, texte: r.error ?? "Erreur." });
        return;
      }
      setMessage({ ok: true, texte: `Fiche de ${fiche.prenom} enregistrée.` });
      setOuvert(null);
      router.refresh();
    });
  }

  // Recherche automatique 300 ms après la dernière frappe.
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    if (q.trim().length < 2) {
      setResultats([]);
      return;
    }
    minuteur.current = setTimeout(async () => {
      setRecherche(true);
      const r = await searchParticipantsAction({ q, eventSlug });
      setRecherche(false);
      if (r.success) setResultats(r.resultats ?? []);
      else setMessage({ ok: false, texte: r.error ?? "Recherche impossible." });
    }, 300);
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [q, eventSlug]);

  const h = Number(heures.replace(",", "."));

  function apres(r: { success: boolean; error?: string }, ok: string) {
    if (!r.success) {
      setMessage({ ok: false, texte: r.error ?? "Erreur." });
      return false;
    }
    setMessage({ ok: true, texte: ok });
    setQ("");
    setResultats([]);
    router.refresh();
    return true;
  }

  function ajouter(p: ResultatRecherche) {
    setMessage(null);
    startTransition(async () => {
      const r = await addPresenceAction({ eventSlug, participantId: p.id, motif, heures: h });
      if (apres(r, `${p.prenom} ${p.nom} ajouté(e).`)) {
        setDoublons(null);
        setCreation(false);
      }
    });
  }

  function creer(confirmerNouveau = false) {
    setMessage(null);
    startTransition(async () => {
      const r = await createPreinscritAndAddAction({
        eventSlug,
        prenom: f.prenom,
        nom: f.nom,
        sexe: f.sexe as "F" | "M" | "X" | "",
        annee: f.annee ? Number(f.annee) : null,
        quartier: f.quartier,
        motif,
        heures: h,
        confirmerNouveau,
      });
      if (r.doublons) {
        setDoublons(r.doublons);
        setMessage({ ok: false, texte: r.error ?? "Homonyme trouvé." });
        return;
      }
      if (apres(r, `Fiche créée et ${f.prenom} ajouté(e).`)) {
        setF({ prenom: "", nom: "", sexe: "", annee: "", quartier: "" });
        setCreation(false);
        setDoublons(null);
      }
    });
  }

  function retirer(p: PresentRow) {
    if (!confirm(`Retirer ${p.prenom} ${p.nom} de cet événement ? Ses points pour cet événement seront retirés.`)) return;
    setMessage(null);
    startTransition(async () => {
      const r = await removePresenceAction({ eventSlug, participantId: p.participantId });
      apres(r, `${p.prenom} ${p.nom} retiré(e).`);
    });
  }

  const input =
    "w-full bg-white border border-vea-border rounded-lg px-3 py-3 text-base text-vea-text focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15";

  return (
    <section className="space-y-4" aria-labelledby="titre-presents">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="titre-presents" className="text-lg font-bold text-vea-text">Présents</h2>
        <span className="text-3xl font-black text-vea-accent" aria-label={`${presents.length} présents`}>{presents.length}</span>
      </div>

      {/* Bloc d'ajout, collé en haut de l'écran sur téléphone pendant qu'on fait défiler la liste */}
      <div className="card-clean p-4 space-y-3 sticky top-20 z-10 bg-white">
        <fieldset>
          <legend className="text-[10px] uppercase tracking-widest font-bold text-vea-text-dim mb-2">Motif du prochain ajout</legend>
          <div className="grid grid-cols-3 gap-2">
            {MOTIFS.map((m) => (
              <button
                key={m.v}
                type="button"
                onClick={() => setMotif(m.v)}
                aria-pressed={motif === m.v}
                className={`rounded-lg py-2.5 text-sm font-bold border transition-colors ${
                  motif === m.v ? "bg-vea-accent text-white border-vea-accent" : "bg-white text-vea-text border-vea-border"
                }`}
              >
                {m.label}
                <span className="block text-[10px] font-semibold opacity-80">{m.pts}</span>
              </button>
            ))}
          </div>
          {motif === "aider" && (
            <label className="mt-2 flex items-center gap-2 text-sm text-vea-text">
              Heures d&apos;aide
              <input
                type="number"
                inputMode="decimal"
                min={0.5}
                max={24}
                step={0.5}
                value={heures}
                onChange={(e) => setHeures(e.target.value)}
                className="w-24 bg-white border border-vea-border rounded-lg px-3 py-2 text-base"
              />
              <span className="text-xs text-vea-text-dim">= {Number.isFinite(h) ? Math.round(Math.min(24, Math.max(0.5, h)) * 15) : "?"} pts</span>
            </label>
          )}
        </fieldset>

        <label htmlFor="recherche-present" className="sr-only">Rechercher une personne</label>
        <input
          id="recherche-present"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Prénom, nom ou pseudo…"
          autoComplete="off"
          className={input}
        />

        {message && (
          <p role={message.ok ? "status" : "alert"} className={`text-sm rounded-lg px-3 py-2 ${message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {message.texte}
          </p>
        )}

        {q.trim().length >= 2 && (
          <ul className="divide-y divide-vea-border border border-vea-border rounded-lg max-h-72 overflow-y-auto" aria-live="polite">
            {recherche && <li className="p-3 text-sm text-vea-text-dim">Recherche…</li>}
            {!recherche && resultats.length === 0 && (
              <li className="p-3 text-sm text-vea-text-muted">Personne ne correspond.</li>
            )}
            {resultats.map((p) => (
              <li key={p.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-vea-text truncate">
                    {p.prenom} {p.nom}
                    {p.pseudo && <span className="font-normal text-vea-text-muted"> · {p.pseudo}</span>}
                  </p>
                  <p className="text-xs text-vea-text-dim">
                    {[p.annee ? `né(e) en ${p.annee}` : null, p.quartier, p.preInscrit ? "pré-inscrit" : null].filter(Boolean).join(" · ") || "Fiche sans détail"}
                  </p>
                </div>
                {p.dejaPresent ? (
                  <span className="shrink-0 text-xs font-bold text-emerald-700">Déjà là</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => ajouter(p)}
                    disabled={isPending}
                    className="shrink-0 px-4 py-2 rounded-full bg-vea-accent text-white text-sm font-bold disabled:opacity-50"
                  >
                    Ajouter
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {!creation ? (
          <button type="button" onClick={() => { setCreation(true); setF((x) => ({ ...x, prenom: x.prenom || q.split(" ")[0] || "" })); }} className="text-sm font-semibold text-vea-accent hover:underline">
            + Créer une fiche (personne pas encore inscrite)
          </button>
        ) : (
          <div className="border-t border-vea-border pt-3 space-y-3">
            <p className="text-sm font-bold text-vea-text">Nouvelle fiche pré-inscrite</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-vea-text-muted">Prénom *
                <input value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} required className={input} autoComplete="off" />
              </label>
              <label className="text-xs text-vea-text-muted">Nom
                <input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} className={input} placeholder="À compléter" autoComplete="off" />
              </label>
              <label className="text-xs text-vea-text-muted">Sexe
                <select value={f.sexe} onChange={(e) => setF({ ...f, sexe: e.target.value })} className={input}>
                  <option value="">Non renseigné</option>
                  <option value="F">Fille</option>
                  <option value="M">Garçon</option>
                  <option value="X">Autre</option>
                </select>
              </label>
              <label className="text-xs text-vea-text-muted">Année de naissance
                <input value={f.annee} onChange={(e) => setF({ ...f, annee: e.target.value.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" className={input} placeholder="2012" />
              </label>
              <label className="text-xs text-vea-text-muted col-span-2">Quartier
                <input value={f.quartier} onChange={(e) => setF({ ...f, quartier: e.target.value })} className={input} placeholder="Étouvie, Amiens Nord…" />
              </label>
            </div>

            {doublons && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
                <p className="text-sm font-bold text-amber-900">Ces fiches existent déjà. C&apos;est l&apos;une d&apos;elles ?</p>
                {doublons.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{d.prenom} {d.nom}{d.annee ? ` (${d.annee})` : ""}{d.pseudo ? ` · ${d.pseudo}` : ""}</span>
                    <button type="button" onClick={() => ajouter(d)} disabled={isPending} className="px-3 py-1.5 rounded-full bg-vea-accent text-white text-xs font-bold">Oui, ajouter</button>
                  </div>
                ))}
                <button type="button" onClick={() => creer(true)} disabled={isPending} className="text-sm font-semibold text-amber-900 underline">
                  Non, c&apos;est une autre personne : créer la fiche
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={() => creer(false)} disabled={isPending || f.prenom.trim().length < 2} className="flex-1 py-3 rounded-full bg-vea-accent text-white text-sm font-bold disabled:opacity-50">
                {isPending ? "…" : "Créer et ajouter"}
              </button>
              <button type="button" onClick={() => { setCreation(false); setDoublons(null); }} className="px-4 py-3 rounded-full border border-vea-border text-sm font-bold">
                Annuler
              </button>
            </div>
            <p className="text-[11px] text-vea-text-dim">Sans nom, la fiche est créée avec « À compléter ». Pas de téléphone ni d&apos;email ici.</p>
          </div>
        )}
      </div>

      {/* Liste des présents */}
      {presents.length === 0 ? (
        <p className="card-clean p-4 text-sm text-vea-text-muted">Personne pour l&apos;instant.</p>
      ) : (
        <ul className="card-clean divide-y divide-vea-border">
          {presents.map((p) => (
            <li key={p.participantId} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => ouvrirFiche(p)}
                  aria-expanded={ouvert === p.participantId}
                  className="min-w-0 text-left flex-1"
                >
                  <p className="text-sm font-bold text-vea-text">
                    {p.prenom} {p.nom}
                    {p.pseudo && <span className="font-normal text-vea-text-muted"> · {p.pseudo}</span>}
                    {!p.aUnCompte && (p.nom === "À compléter" || !p.sexe || !p.annee) && (
                      <span className="ml-2 text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">à compléter</span>
                    )}
                  </p>
                  <p className="text-xs text-vea-text-dim">
                    <span className="font-semibold text-vea-text-muted">
                      {p.motif === "aider" ? `Aider ${p.heures} h` : p.motif === "jouer" ? "Jouer" : "Regarder"}
                    </span>
                    {p.aUnCompte ? " · compte" : " · pré-inscrit"}
                    {(p.ajoutePar || p.ajouteLe) && ` · ajouté${p.ajoutePar ? ` par ${p.ajoutePar}` : ""}${p.ajouteLe ? ` le ${fmt(p.ajouteLe)}` : ""}`}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => retirer(p)}
                  disabled={isPending}
                  className="shrink-0 px-3 py-2 rounded-full border border-red-200 text-red-700 text-xs font-bold disabled:opacity-50"
                >
                  Retirer
                </button>
              </div>

              {ouvert === p.participantId && (
                p.aUnCompte ? (
                  <p className="mt-3 text-xs text-vea-text-muted bg-vea-bg rounded-lg p-3">
                    {p.prenom} a un compte : c&apos;est lui ou elle qui complète sa fiche, depuis son profil.
                  </p>
                ) : (
                  <div className="mt-3 border-t border-vea-border pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs text-vea-text-muted">Prénom *
                        <input value={fiche.prenom} onChange={(e) => setFiche({ ...fiche, prenom: e.target.value })} className={input} autoComplete="off" />
                      </label>
                      <label className="text-xs text-vea-text-muted">Nom
                        <input value={fiche.nom} onChange={(e) => setFiche({ ...fiche, nom: e.target.value })} className={input} placeholder="À compléter" autoComplete="off" />
                      </label>
                      <label className="text-xs text-vea-text-muted">Sexe
                        <select value={fiche.sexe} onChange={(e) => setFiche({ ...fiche, sexe: e.target.value })} className={input}>
                          <option value="">Non renseigné</option>
                          <option value="F">Fille</option>
                          <option value="M">Garçon</option>
                          <option value="X">Autre</option>
                        </select>
                      </label>
                      <label className="text-xs text-vea-text-muted">Année de naissance
                        <input value={fiche.annee} onChange={(e) => setFiche({ ...fiche, annee: e.target.value.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" className={input} placeholder="2012" />
                      </label>
                      <label className="text-xs text-vea-text-muted">Quartier
                        <input value={fiche.quartier} onChange={(e) => setFiche({ ...fiche, quartier: e.target.value })} className={input} placeholder="Étouvie…" />
                      </label>
                      <label className="text-xs text-vea-text-muted">Téléphone
                        <input value={fiche.phone} onChange={(e) => setFiche({ ...fiche, phone: e.target.value })} type="tel" inputMode="tel" className={input} placeholder="06…" />
                      </label>
                    </div>
                    <p className="text-[11px] text-vea-text-dim">
                      Téléphone du jeune ou d&apos;un parent. Il sert à rattacher automatiquement cette fiche (et ses points)
                      à son compte le jour où il s&apos;inscrit avec le même numéro, prénom et nom.
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => enregistrerFiche(p)} disabled={isPending || fiche.prenom.trim().length < 2} className="flex-1 py-3 rounded-full bg-vea-accent text-white text-sm font-bold disabled:opacity-50">
                        {isPending ? "…" : "Enregistrer la fiche"}
                      </button>
                      <button type="button" onClick={() => setOuvert(null)} className="px-4 py-3 rounded-full border border-vea-border text-sm font-bold">
                        Fermer
                      </button>
                    </div>
                  </div>
                )
              )}
            </li>
          ))}
        </ul>
      )}

      {retraits.length > 0 && (
        <details className="card-clean p-3">
          <summary className="text-sm font-semibold text-vea-text-muted cursor-pointer">Retraits ({retraits.length})</summary>
          <ul className="mt-2 space-y-1 text-xs text-vea-text-dim">
            {retraits.map((r, i) => (
              <li key={i}>{r.nom} · retiré le {fmt(r.retireLe)}{r.retirePar ? ` par ${r.retirePar}` : ""}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
