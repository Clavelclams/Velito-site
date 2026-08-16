/**
 * COMPTE À REBOURS JUSQU'AU JURY — composant CLIENT, et c'est le sujet.
 *
 * Le dashboard est un Server Component sans cookie ni fetch dynamique :
 * Next le PRÉ-REND AU BUILD (SSG). Un `Date.now()` écrit là-bas est donc
 * évalué UNE FOIS, au moment du `next build`, puis figé dans le HTML — le
 * compteur affichait toujours le même nombre jusqu'au déploiement suivant.
 *
 * Règle générale : toute valeur qui dépend de « maintenant » ne peut pas
 * vivre dans du HTML statique. Soit on rend la page dynamique (coûteux ici :
 * chaque visite relirait les ~120 fichiers Markdown), soit on calcule côté
 * client. Ici c'est le bon choix — le compte à rebours dépend de l'horloge
 * du LECTEUR, pas de celle du serveur.
 *
 * Piège d'hydratation : si on calculait dès le premier rendu, le HTML du
 * build et celui du client différeraient et React crierait au mismatch.
 * D'où le `null` initial + calcul dans useEffect : le premier rendu client
 * est identique au HTML statique, la vraie valeur arrive juste après.
 */
"use client";

import { useEffect, useState } from "react";

/** Jury CDA — à affiner quand la convocation AFPA arrive. */
const JURY = { annee: 2027, mois: 3, jour: 1 }; // mois 0-indexé : 3 = avril

/**
 * Jours calendaires restants. On compare deux MINUITS locaux : sinon le
 * nombre changerait en cours de journée selon l'heure qu'il est.
 * Math.round absorbe les ±1 h des changements d'heure (mars/octobre).
 */
function joursAvantJury(): number {
  const jury = new Date(JURY.annee, JURY.mois, JURY.jour);
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  return Math.max(
    0,
    Math.round((jury.getTime() - aujourdhui.getTime()) / 86_400_000),
  );
}

export default function CompteARebours() {
  const [jours, setJours] = useState<number | null>(null);

  useEffect(() => {
    setJours(joursAvantJury());
    // L'onglet peut rester ouvert plusieurs jours : on repasse toutes les
    // heures pour que le compteur descende sans rechargement.
    const t = setInterval(() => setJours(joursAvantJury()), 3_600_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-cours-accent to-cours-bloc2 px-6 py-4 text-center text-white shadow-lg shadow-cours-accent/25">
      <p className="text-2xl font-bold tabular-nums sm:text-3xl">
        {jours === null ? (
          // Placeholder de la même largeur : pas de saut de mise en page.
          <span className="opacity-40">J−···</span>
        ) : (
          `J−${jours}`
        )}
      </p>
      <p className="text-xs uppercase tracking-wide text-white/80">
        avant le jury
      </p>
    </div>
  );
}
