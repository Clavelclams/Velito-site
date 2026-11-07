"use client";

/**
 * Parties interactives d'une fiche projet (07/11/2026) : roadmap, journal,
 * fiche (dont CDC) et membres. Chaque bouton appelle une server action ; ce
 * qui s'affiche dépend du rôle calculé par la base (role_projet), et la RLS
 * refuse de toute façon ce que le rôle ne permet pas.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ajouterEtapeAction,
  ajouterJournalAction,
  ajouterMembreAction,
  changerStatutEtapeAction,
  modifierProjetAction,
  retirerMembreAction,
  supprimerEtapeAction,
  supprimerJournalAction,
  type Resultat,
} from "../actions";
import {
  LIBELLES_STATUT_ETAPE,
  LIBELLES_STATUT_PROJET,
  LIBELLES_TYPE_JOURNAL,
  type StatutEtape,
} from "@/lib/projets/avancement";

const champ = "w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[#a78bfa]";
const boutonBlanc = "rounded-full bg-white text-[#04040e] px-4 py-2 text-sm font-medium hover:bg-white/90 disabled:opacity-50";

export type Role = "admin" | "proprietaire" | "dev" | "lecteur";

function useAction() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  function lancer(fn: () => Promise<Resultat>, apres?: () => void) {
    setErreur(null);
    demarrer(async () => {
      const r = await fn();
      if (!r.success) setErreur(r.error ?? "Action impossible.");
      else {
        apres?.();
        router.refresh();
      }
    });
  }
  return { enCours, erreur, lancer };
}

function MessageErreur({ texte }: { texte: string | null }) {
  return texte ? <p className="text-sm text-red-300" role="alert">{texte}</p> : null;
}

function dateFr(iso: string | null): string {
  if (!iso) return "";
  const [a, m, j] = iso.slice(0, 10).split("-");
  return `${j}/${m}/${a}`;
}

// ---------------------------------------------------------------------------
// Roadmap
// ---------------------------------------------------------------------------
export interface Etape {
  id: string;
  lot: string | null;
  titre: string;
  description: string | null;
  statut: StatutEtape;
  poids: number;
  echeance: string | null;
  fait_le: string | null;
}

const PASTILLE: Record<StatutEtape, string> = {
  fait: "bg-emerald-400/20 text-emerald-200 border-emerald-400/30",
  en_cours: "bg-amber-400/15 text-amber-200 border-amber-400/30",
  a_faire: "bg-white/5 text-white/70 border-white/15",
  abandonne: "bg-white/5 text-white/40 border-white/10 line-through",
};

export function Roadmap({
  projetId, slug, role, groupes,
}: {
  projetId: string;
  slug: string;
  role: Role;
  groupes: { lot: string; etapes: Etape[] }[];
}) {
  const peutEcrire = role !== "lecteur";
  const { enCours, erreur, lancer } = useAction();
  const [lot, setLot] = useState("");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [poids, setPoids] = useState("1");
  const [echeance, setEcheance] = useState("");

  return (
    <div className="space-y-6">
      {groupes.length === 0 && <p className="text-sm text-white/60">Pas encore d&apos;étape.</p>}
      {groupes.map((g) => (
        <div key={g.lot}>
          <h3 className="mb-2 text-xs uppercase tracking-wider text-white/40">{g.lot}</h3>
          <ul className="space-y-2">
            {g.etapes.map((e) => (
              <li key={e.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-sm ${e.statut === "abandonne" ? "line-through text-white/40" : ""}`}>{e.titre}</p>
                    {e.description && <p className="mt-1 text-xs text-white/50 whitespace-pre-wrap">{e.description}</p>}
                    <p className="mt-1 text-[11px] text-white/40">
                      poids {e.poids}
                      {e.echeance ? ` · échéance ${dateFr(e.echeance)}` : ""}
                      {e.fait_le ? ` · fait le ${dateFr(e.fait_le)}` : ""}
                    </p>
                  </div>
                  {peutEcrire ? (
                    <select
                      value={e.statut}
                      disabled={enCours}
                      onChange={(ev) => lancer(() => changerStatutEtapeAction(e.id, slug, ev.target.value))}
                      className={`rounded-full border px-2 py-1 text-xs ${PASTILLE[e.statut]} bg-transparent`}
                      aria-label={`Statut de « ${e.titre} »`}
                    >
                      {Object.entries(LIBELLES_STATUT_ETAPE).map(([v, l]) => (
                        <option key={v} value={v} className="text-black">{l}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`rounded-full border px-2 py-1 text-xs ${PASTILLE[e.statut]}`}>{LIBELLES_STATUT_ETAPE[e.statut]}</span>
                  )}
                </div>
                {peutEcrire && (
                  <button
                    type="button"
                    disabled={enCours}
                    onClick={() => {
                      if (window.confirm("Supprimer cette étape ? (Pour la garder dans l'historique, mets-la plutôt en « Abandonné ».)")) {
                        lancer(() => supprimerEtapeAction(e.id, slug));
                      }
                    }}
                    className="mt-2 text-[11px] text-white/40 hover:text-red-300"
                  >
                    Supprimer
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <MessageErreur texte={erreur} />

      {peutEcrire && (
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            lancer(() => ajouterEtapeAction(projetId, slug, { lot, titre, description, poids, echeance }), () => {
              setTitre("");
              setDescription("");
            });
          }}
          className="space-y-2 rounded-xl border border-dashed border-white/15 p-4"
        >
          <p className="text-sm font-medium">Ajouter une étape</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={lot} onChange={(e) => setLot(e.target.value)} maxLength={80} placeholder="Lot (ex. Stores)" className={champ} />
            <input value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={200} required placeholder="Titre de l'étape" className={champ} />
          </div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={2} placeholder="Détail (optionnel)" className={champ} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-white/60">
              Poids{" "}
              <select value={poids} onChange={(e) => setPoids(e.target.value)} className="rounded-lg border border-white/15 bg-transparent px-2 py-1">
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n} className="text-black">{n}</option>)}
              </select>
            </label>
            <input type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} aria-label="Échéance" className="rounded-lg border border-white/15 bg-transparent px-2 py-1 text-xs" />
            <button type="submit" disabled={enCours} className={boutonBlanc}>Ajouter</button>
          </div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------
export interface EntreeJournal {
  id: string;
  date_entree: string;
  type: string;
  titre: string;
  contenu: string | null;
  auteur: string | null;
}

export function Journal({
  projetId, slug, role, userId, entrees,
}: {
  projetId: string;
  slug: string;
  role: Role;
  userId: string;
  entrees: EntreeJournal[];
}) {
  const peutEcrire = role !== "lecteur";
  const { enCours, erreur, lancer } = useAction();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState("fait");
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");

  return (
    <div className="space-y-4">
      {peutEcrire && (
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            lancer(() => ajouterJournalAction(projetId, slug, { date, type, titre, contenu }), () => {
              setTitre("");
              setContenu("");
            });
          }}
          className="space-y-2 rounded-xl border border-dashed border-white/15 p-4"
        >
          <p className="text-sm font-medium">Ajouter au journal</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" className={champ} />
            <select value={type} onChange={(e) => setType(e.target.value)} className={champ}>
              {Object.entries(LIBELLES_TYPE_JOURNAL).map(([v, l]) => <option key={v} value={v} className="text-black">{l}</option>)}
            </select>
          </div>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} required maxLength={200} placeholder="Ce qui s'est passé" className={champ} />
          <textarea value={contenu} onChange={(e) => setContenu(e.target.value)} maxLength={5000} rows={3} placeholder="Détail : pourquoi, comment, ce qui reste" className={champ} />
          <button type="submit" disabled={enCours} className={boutonBlanc}>Publier</button>
        </form>
      )}
      <MessageErreur texte={erreur} />
      {entrees.length === 0 ? (
        <p className="text-sm text-white/60">Le journal est vide.</p>
      ) : (
        <ol className="space-y-3 border-l border-white/10 pl-4">
          {entrees.map((j) => (
            <li key={j.id}>
              <p className="text-xs text-white/40">
                {dateFr(j.date_entree)} · {LIBELLES_TYPE_JOURNAL[j.type] ?? j.type}
              </p>
              <p className="text-sm font-medium">{j.titre}</p>
              {j.contenu && <p className="mt-1 text-sm text-white/60 whitespace-pre-wrap">{j.contenu}</p>}
              {(j.auteur === userId || role === "admin" || role === "proprietaire") && (
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => window.confirm("Supprimer cette entrée ?") && lancer(() => supprimerJournalAction(j.id, slug))}
                  className="mt-1 text-[11px] text-white/40 hover:text-red-300"
                >
                  Supprimer
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fiche (dont CDC) — modifiable par l'admin et le propriétaire
// ---------------------------------------------------------------------------
export interface Fiche {
  nom: string;
  resume: string | null;
  statut: string;
  url_prod: string | null;
  depot: string | null;
  stack: string | null;
  cdc: string | null;
  public: boolean;
  resume_public: string | null;
}

export function EditionFiche({ projetId, slug, fiche }: { projetId: string; slug: string; fiche: Fiche }) {
  const { enCours, erreur, lancer } = useAction();
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState({
    nom: fiche.nom,
    resume: fiche.resume ?? "",
    statut: fiche.statut,
    url_prod: fiche.url_prod ?? "",
    depot: fiche.depot ?? "",
    stack: fiche.stack ?? "",
    cdc: fiche.cdc ?? "",
    public: fiche.public,
    resume_public: fiche.resume_public ?? "",
  });
  const maj = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  if (!ouvert) {
    return (
      <button type="button" onClick={() => setOuvert(true)} className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10">
        Modifier la fiche et le CDC
      </button>
    );
  }
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        lancer(() => modifierProjetAction(projetId, slug, f), () => setOuvert(false));
      }}
      className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-sm text-white/70">Nom<input value={f.nom} onChange={maj("nom")} maxLength={80} className={champ} /></label>
        <label className="block text-sm text-white/70">Statut
          <select value={f.statut} onChange={maj("statut")} className={champ}>
            {Object.entries(LIBELLES_STATUT_PROJET).map(([v, l]) => <option key={v} value={v} className="text-black">{l}</option>)}
          </select>
        </label>
        <label className="block text-sm text-white/70">Site en ligne<input value={f.url_prod} onChange={maj("url_prod")} placeholder="https://…" className={champ} /></label>
        <label className="block text-sm text-white/70">Dépôt<input value={f.depot} onChange={maj("depot")} maxLength={200} className={champ} /></label>
      </div>
      <label className="block text-sm text-white/70">Stack<input value={f.stack} onChange={maj("stack")} maxLength={200} className={champ} /></label>
      <label className="block text-sm text-white/70">Résumé<textarea value={f.resume} onChange={maj("resume")} maxLength={500} rows={2} className={champ} /></label>
      <label className="block text-sm text-white/70">
        Cahier des charges (texte ; titres avec #, listes avec -)
        <textarea value={f.cdc} onChange={maj("cdc")} maxLength={50000} rows={12} className={`${champ} font-mono text-xs`} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.public} onChange={maj("public")} />
        Montrer ce projet dans la vitrine publique (résumé public et pourcentage seulement, jamais le CDC ni le journal)
      </label>
      {f.public && (
        <label className="block text-sm text-white/70">Résumé public<textarea value={f.resume_public} onChange={maj("resume_public")} maxLength={500} rows={2} className={champ} /></label>
      )}
      <MessageErreur texte={erreur} />
      <div className="flex gap-2">
        <button type="submit" disabled={enCours} className={boutonBlanc}>Enregistrer</button>
        <button type="button" onClick={() => setOuvert(false)} className="rounded-full border border-white/20 px-4 py-2 text-sm">Annuler</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Membres
// ---------------------------------------------------------------------------
export function Membres({
  projetId, slug, peutGerer, membres,
}: {
  projetId: string;
  slug: string;
  peutGerer: boolean;
  membres: { user_id: string; email: string; role: string }[];
}) {
  const { enCours, erreur, lancer } = useAction();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("dev");
  const libelles: Record<string, string> = { proprietaire: "Propriétaire", dev: "Dev", lecteur: "Lecteur" };

  return (
    <div className="space-y-3">
      {membres.length === 0 ? (
        <p className="text-sm text-white/60">Aucun membre (l&apos;admin du hub voit déjà tout).</p>
      ) : (
        <ul className="space-y-2">
          {membres.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{m.email} <span className="text-white/40">· {libelles[m.role] ?? m.role}</span></span>
              {peutGerer && (
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => window.confirm(`Retirer ${m.email} du projet ?`) && lancer(() => retirerMembreAction(projetId, slug, m.user_id))}
                  className="text-xs text-white/40 hover:text-red-300"
                >
                  Retirer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {peutGerer && (
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            lancer(() => ajouterMembreAction(projetId, slug, email, role), () => setEmail(""));
          }}
          className="flex flex-wrap gap-2"
        >
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email du compte Velito" className={`${champ} flex-1 min-w-[200px]`} />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-white/15 bg-transparent px-2 text-sm">
            <option value="dev" className="text-black">Dev (alimente)</option>
            <option value="lecteur" className="text-black">Lecteur</option>
            <option value="proprietaire" className="text-black">Propriétaire</option>
          </select>
          <button type="submit" disabled={enCours} className={boutonBlanc}>Ajouter</button>
        </form>
      )}
      <MessageErreur texte={erreur} />
    </div>
  );
}
