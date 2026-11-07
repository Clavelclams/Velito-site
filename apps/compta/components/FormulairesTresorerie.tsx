"use client";

/**
 * Formulaires de la page Trésorerie — composant CLIENT (Lot 6, 07/11/2026).
 *
 * Trois petits formulaires indépendants : nouveau compte, solde lu sur un
 * relevé, virement interne. Comme partout dans compta, le client n'envoie que
 * des CHAÎNES ("1 250,00") : la conversion en centimes et toutes les règles
 * vivent dans le service, côté serveur.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  creerCompteAction,
  creerVirementAction,
  enregistrerSoldeObserveAction,
} from "@/app/[entiteId]/tresorerie/actions";
import { LIBELLES_NATURE } from "@/lib/services/tresorerie";

const styleChamp =
  "w-full rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent";
const styleBouton =
  "rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-compta-accent-hover disabled:opacity-50";

function aujourdHui(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Petit cadre commun : titre, contenu, message de retour. */
function Bloc({
  titre,
  aide,
  children,
  message,
}: {
  titre: string;
  aide: string;
  children: React.ReactNode;
  message: { ok: boolean; texte: string } | null;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-compta-border bg-compta-surface p-5">
      <div>
        <h3 className="font-semibold">{titre}</h3>
        <p className="text-xs text-compta-text-muted">{aide}</p>
      </div>
      {children}
      {message && (
        <p className={`text-sm ${message.ok ? "text-compta-recette" : "text-compta-depense"}`} role="status">
          {message.texte}
        </p>
      )}
    </div>
  );
}

export function FormulairesTresorerie({
  entiteId,
  comptes,
  lectureSeule = false,
}: {
  entiteId: string;
  comptes: { id: string; nom: string }[];
  /** [07/11/2026] Lecteur : aucun des trois formulaires n'est rendu. */
  lectureSeule?: boolean;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  // --- nouveau compte ---
  const [nom, setNom] = useState("");
  const [nature, setNature] = useState("courant");
  const [soldeInitial, setSoldeInitial] = useState("");
  const [dateSolde, setDateSolde] = useState("");
  const [msgCompte, setMsgCompte] = useState<{ ok: boolean; texte: string } | null>(null);

  // --- solde observé ---
  const [compteObs, setCompteObs] = useState(comptes[0]?.id ?? "");
  const [dateReleve, setDateReleve] = useState(aujourdHui());
  const [soldeLu, setSoldeLu] = useState("");
  const [reference, setReference] = useState("");
  const [msgObs, setMsgObs] = useState<{ ok: boolean; texte: string } | null>(null);

  // --- virement ---
  const [source, setSource] = useState(comptes[0]?.id ?? "");
  const [destination, setDestination] = useState(comptes[1]?.id ?? "");
  const [dateVir, setDateVir] = useState(aujourdHui());
  const [montantVir, setMontantVir] = useState("");
  const [libelleVir, setLibelleVir] = useState("");
  const [msgVir, setMsgVir] = useState<{ ok: boolean; texte: string } | null>(null);

  function creerCompte(e: React.FormEvent) {
    e.preventDefault();
    setMsgCompte(null);
    demarrer(async () => {
      const r = await creerCompteAction(entiteId, { nom, nature, soldeInitial, dateSoldeInitial: dateSolde });
      if (r.success) {
        setNom("");
        setSoldeInitial("");
        setDateSolde("");
        setMsgCompte({ ok: true, texte: "Compte créé." });
        router.refresh();
      } else setMsgCompte({ ok: false, texte: r.error ?? "Création impossible." });
    });
  }

  function enregistrerObs(e: React.FormEvent) {
    e.preventDefault();
    setMsgObs(null);
    demarrer(async () => {
      const r = await enregistrerSoldeObserveAction(entiteId, {
        compteId: compteObs,
        dateReleve,
        solde: soldeLu,
        reference,
      });
      if (r.success) {
        setSoldeLu("");
        setReference("");
        setMsgObs({ ok: true, texte: "Solde enregistré : le contrôle du mois est à jour." });
        router.refresh();
      } else setMsgObs({ ok: false, texte: r.error ?? "Enregistrement impossible." });
    });
  }

  function virer(e: React.FormEvent) {
    e.preventDefault();
    setMsgVir(null);
    demarrer(async () => {
      const r = await creerVirementAction(entiteId, {
        compteSourceId: source,
        compteDestinationId: destination,
        date: dateVir,
        montant: montantVir,
        libelle: libelleVir,
      });
      if (r.success) {
        setMontantVir("");
        setLibelleVir("");
        setMsgVir({ ok: true, texte: "Virement enregistré (une sortie et une entrée)." });
        router.refresh();
      } else setMsgVir({ ok: false, texte: r.error ?? "Virement impossible." });
    });
  }

  // [07/11/2026] Après tous les hooks (ordre constant), rien pour le lecteur.
  if (lectureSeule) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Bloc
        titre="Nouveau compte"
        aide="Solde initial : laisse vide si tu ne le connais pas encore. Vide n'est pas zéro."
        message={msgCompte}
      >
        <form onSubmit={creerCompte} className="space-y-2">
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex. Compte courant Crédit Mutuel" maxLength={60} className={styleChamp} />
          <select value={nature} onChange={(e) => setNature(e.target.value)} className={styleChamp}>
            {Object.entries(LIBELLES_NATURE).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input value={soldeInitial} onChange={(e) => setSoldeInitial(e.target.value)} placeholder="Solde initial (€)" inputMode="decimal" className={styleChamp} />
            <input type="date" value={dateSolde} onChange={(e) => setDateSolde(e.target.value)} aria-label="Date du solde initial" className={styleChamp} />
          </div>
          <button type="submit" disabled={enCours} className={styleBouton}>
            Créer le compte
          </button>
        </form>
      </Bloc>

      <Bloc
        titre="Solde lu sur un relevé"
        aide="Ce n'est pas une opération : il sert seulement à contrôler le solde calculé."
        message={msgObs}
      >
        {comptes.length === 0 ? (
          <p className="text-sm text-compta-text-muted">Crée d&apos;abord un compte.</p>
        ) : (
          <form onSubmit={enregistrerObs} className="space-y-2">
            <select value={compteObs} onChange={(e) => setCompteObs(e.target.value)} className={styleChamp}>
              {comptes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={dateReleve} onChange={(e) => setDateReleve(e.target.value)} aria-label="Date du relevé" className={styleChamp} />
              <input value={soldeLu} onChange={(e) => setSoldeLu(e.target.value)} placeholder="Solde (€)" inputMode="decimal" className={styleChamp} />
            </div>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Référence (ex. relevé n°12)" maxLength={120} className={styleChamp} />
            <button type="submit" disabled={enCours} className={styleBouton}>
              Enregistrer le solde
            </button>
          </form>
        )}
      </Bloc>

      <Bloc
        titre="Virement interne"
        aide="Entre deux comptes de la structure : ni recette, ni dépense."
        message={msgVir}
      >
        {comptes.length < 2 ? (
          <p className="text-sm text-compta-text-muted">Il faut au moins deux comptes.</p>
        ) : (
          <form onSubmit={virer} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Compte de départ" className={styleChamp}>
                {comptes.map((c) => (
                  <option key={c.id} value={c.id}>
                    De : {c.nom}
                  </option>
                ))}
              </select>
              <select value={destination} onChange={(e) => setDestination(e.target.value)} aria-label="Compte d'arrivée" className={styleChamp}>
                {comptes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Vers : {c.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={dateVir} onChange={(e) => setDateVir(e.target.value)} aria-label="Date du virement" className={styleChamp} />
              <input value={montantVir} onChange={(e) => setMontantVir(e.target.value)} placeholder="Montant (€)" inputMode="decimal" className={styleChamp} />
            </div>
            <input value={libelleVir} onChange={(e) => setLibelleVir(e.target.value)} placeholder="Libellé (optionnel)" maxLength={255} className={styleChamp} />
            <button type="submit" disabled={enCours} className={styleBouton}>
              Enregistrer le virement
            </button>
          </form>
        )}
      </Bloc>
    </div>
  );
}
