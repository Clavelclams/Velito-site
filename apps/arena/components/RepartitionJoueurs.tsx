"use client";

/**
 * Répartition de joueurs entre plusieurs colonnes (équipes, poules, ou simple
 * liste ordonnée). DEUX façons de faire la même chose, au choix de la personne :
 *
 *   1. GLISSER-DÉPOSER, pour qui est à la souris et va vite.
 *   2. APPUYER SUR UN JOUEUR, PUIS SUR LA COLONNE. Ce mode marche au doigt,
 *      au clavier et au lecteur d'écran.
 *
 * Pourquoi les deux et pas seulement le glisser-déposer : sur téléphone, le
 * glisser-déposer HTML5 n'est pas supporté de façon fiable, et le jour J la
 * saisie se fait debout, une main sur le téléphone, dans un local bruyant.
 * Un mode « je rate ma cible et je recommence » y est inutilisable. Le mode
 * clic est donc le mode de RÉFÉRENCE, le glisser est un raccourci en plus.
 *
 * Pourquoi c'est le SEUL composant client de l'application : réorganiser une
 * liste demande un retour visuel immédiat, avant l'aller-retour serveur. On
 * garde donc un état local optimiste, et on envoie la nouvelle répartition au
 * serveur en arrière-plan. Si le serveur refuse, on revient à l'état d'avant
 * et on affiche pourquoi. Aucune bibliothèque ajoutée : l'API drag-and-drop
 * est native, et un `useState` suffit pour le reste.
 */

import { useState, useTransition } from "react";

export interface JoueurDeplacable {
  id: string;
  pseudo: string;
  /** Identifiant de la colonne où il se trouve (null = non assigné). */
  colonneId: string | null;
}

export interface Colonne {
  id: string;
  titre: string;
  /** Effectif attendu, pour prévenir quand une équipe est incomplète. */
  effectifCible?: number;
}

interface Props {
  colonnes: Colonne[];
  joueurs: JoueurDeplacable[];
  /** Libellé de la colonne des joueurs pas encore placés. */
  titreNonAssignes?: string;
  /**
   * Server Action liée côté serveur. Reçoit la répartition complète, pas un
   * seul déplacement : le serveur n'a ainsi jamais à reconstituer un état
   * partiel, et deux staffs qui cliquent en même temps ne se marchent pas
   * dessus de façon silencieuse.
   */
  enregistrer: (
    repartition: { joueurId: string; colonneId: string | null; ordre: number }[]
  ) => Promise<{ ok: boolean; message?: string }>;
}

const COLONNE_LIBRE = "__libres__";

export default function RepartitionJoueurs({
  colonnes,
  joueurs,
  titreNonAssignes = "Pas encore placés",
  enregistrer,
}: Props) {
  const [etat, setEtat] = useState<JoueurDeplacable[]>(joueurs);
  const [selection, setSelection] = useState<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const toutes: Colonne[] = [
    ...colonnes,
    { id: COLONNE_LIBRE, titre: titreNonAssignes },
  ];

  const joueursDe = (colonneId: string) =>
    etat.filter((j) =>
      colonneId === COLONNE_LIBRE ? j.colonneId === null : j.colonneId === colonneId
    );

  /** Déplace un joueur, met à jour l'écran tout de suite, puis prévient le serveur. */
  function deplacer(joueurId: string, versColonne: string) {
    const cible = versColonne === COLONNE_LIBRE ? null : versColonne;
    const avant = etat;
    const apres = etat.map((j) => (j.id === joueurId ? { ...j, colonneId: cible } : j));

    setEtat(apres);
    setSelection(null);
    setErreur(null);

    // L'ordre envoyé au serveur est celui que la personne VOIT : on parcourt
    // les colonnes de gauche à droite, puis les non-placés. Prendre l'ordre du
    // tableau interne donnerait un classement qui ne correspond à rien
    // à l'écran, et donc des têtes de série incompréhensibles.
    const repartition = toutes
      .flatMap((c) =>
        apres.filter((j) =>
          c.id === COLONNE_LIBRE ? j.colonneId === null : j.colonneId === c.id
        )
      )
      .map((j, index) => ({
        joueurId: j.id,
        colonneId: j.colonneId,
        ordre: index,
      }));

    demarrer(async () => {
      const reponse = await enregistrer(repartition);
      if (!reponse.ok) {
        // Retour à l'état d'avant : mieux vaut un écran juste qu'un écran
        // qui ment sur ce qui est réellement enregistré.
        setEtat(avant);
        setErreur(reponse.message ?? "Le déplacement n'a pas pu être enregistré.");
      }
    });
  }

  return (
    <div>
      <p className="mb-3 text-sm text-arena-muted">
        Glisse un joueur vers une colonne, ou appuie sur son nom puis sur la
        colonne d&apos;arrivée. Les deux font exactement la même chose.
      </p>

      {erreur && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-arena-red/30 bg-arena-red-pale px-4 py-2 text-sm font-semibold text-arena-red"
        >
          {erreur}
        </p>
      )}

      {selection && (
        <p className="mb-3 rounded-lg border border-arena-violet/30 bg-arena-violet-pale px-4 py-2 text-sm font-semibold text-arena-violet">
          {etat.find((j) => j.id === selection)?.pseudo} est sélectionné.
          Appuie maintenant sur la colonne où le placer.{" "}
          <button
            type="button"
            onClick={() => setSelection(null)}
            className="underline"
          >
            Annuler
          </button>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {toutes.map((colonne) => {
          const dedans = joueursDe(colonne.id);
          const incomplete =
            colonne.effectifCible !== undefined &&
            dedans.length !== colonne.effectifCible;

          return (
            <section
              key={colonne.id}
              // Zone de dépôt. preventDefault sur dragOver est ce qui autorise
              // le dépôt : sans lui, le navigateur refuse par défaut.
              onDragOver={(e) => {
                e.preventDefault();
                setSurvol(colonne.id);
              }}
              onDragLeave={() => setSurvol((s) => (s === colonne.id ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setSurvol(null);
                const joueurId = e.dataTransfer.getData("text/plain");
                if (joueurId) deplacer(joueurId, colonne.id);
              }}
              className={`rounded-xl border-2 p-3 transition-colors ${
                survol === colonne.id
                  ? "border-arena-violet bg-arena-violet-pale"
                  : "border-arena-border bg-arena-surface"
              }`}
            >
              <header className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-arena-violet">
                  {colonne.titre}
                </h3>
                <span
                  className={`text-xs font-semibold ${
                    incomplete ? "text-arena-red" : "text-arena-faint"
                  }`}
                >
                  {dedans.length}
                  {colonne.effectifCible !== undefined
                    ? ` / ${colonne.effectifCible}`
                    : ""}
                </span>
              </header>

              {/* Bouton de dépôt en mode clic. Il n'apparaît que quand un
                  joueur est sélectionné : sinon il n'aurait aucun sens et
                  encombrerait l'écran. */}
              {selection && (
                <button
                  type="button"
                  onClick={() => deplacer(selection, colonne.id)}
                  className="mb-2 w-full rounded-lg border-2 border-dashed border-arena-violet px-3 py-2 text-sm font-semibold text-arena-violet hover:bg-arena-violet-pale"
                >
                  Placer ici
                </button>
              )}

              <ul className="space-y-2">
                {dedans.length === 0 && (
                  <li className="rounded-lg border border-dashed border-arena-border px-3 py-3 text-center text-xs text-arena-faint">
                    Personne pour l&apos;instant
                  </li>
                )}
                {dedans.map((joueur) => {
                  const actif = selection === joueur.id;
                  return (
                    <li key={joueur.id}>
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", joueur.id);
                          e.dataTransfer.effectAllowed = "move";
                          setSelection(joueur.id);
                        }}
                        onDragEnd={() => {
                          setSelection(null);
                          setSurvol(null);
                        }}
                        onClick={() =>
                          setSelection((s) => (s === joueur.id ? null : joueur.id))
                        }
                        aria-pressed={actif}
                        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-semibold shadow-carte transition-colors ${
                          actif
                            ? "border-arena-violet bg-arena-violet-pale text-arena-violet"
                            : "border-arena-border bg-arena-bg text-arena-ink hover:border-arena-violet"
                        }`}
                      >
                        {/* Poignée visuelle : sans repère, personne ne devine
                            qu'un élément est déplaçable. */}
                        <span aria-hidden className="text-arena-faint">
                          ⠿
                        </span>
                        {joueur.pseudo}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-3 h-4 text-xs text-arena-faint" aria-live="polite">
        {enCours ? "Enregistrement…" : ""}
      </p>
    </div>
  );
}
