/**
 * BadgesSection — Composant client qui gere :
 *   1. La VITRINE des 3 badges affiches sur le profil public
 *   2. La GRILLE de TOUS les badges (debloques en couleur + verrouilles grises)
 *   3. Le toggle d'affichage : click sur un badge debloque pour le mettre/enlever
 *      de la vitrine (max 3).
 *
 * Pourquoi Client Component :
 *   - useState pour la selection vitrine (UX immediate, pas roundtrip)
 *   - useTransition pour persister via Server Action
 *   - Animations + feedback visuel
 *
 * Validation 3 max cote app + cote serveur (defense en profondeur).
 */
"use client";

import { useState, useTransition } from "react";
import BadgeCard, { type BadgeData } from "@/components/BadgeCard";
import { updateBadgeShowcaseAction } from "./actions";

interface BadgesSectionProps {
  /** Catalogue de tous les badges existants (depuis BDD) */
  allBadges: BadgeData[];
  /** Slugs des badges deja debloques par le user */
  unlockedSlugs: string[];
  /** Slugs des badges actuellement dans la vitrine (max 3) */
  initialShowcaseSlugs: string[];
}

export default function BadgesSection({
  allBadges,
  unlockedSlugs,
  initialShowcaseSlugs,
}: BadgesSectionProps) {
  const [showcaseSlugs, setShowcaseSlugs] = useState<string[]>(initialShowcaseSlugs);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggleShowcase(slug: string) {
    setError("");
    setSaved(false);

    if (!unlockedSlugs.includes(slug)) {
      setError("Tu n'as pas encore debloque ce badge.");
      return;
    }

    let newShowcase: string[];
    if (showcaseSlugs.includes(slug)) {
      // Retirer de la vitrine
      newShowcase = showcaseSlugs.filter((s) => s !== slug);
    } else {
      // Ajouter (mais max 3)
      if (showcaseSlugs.length >= 3) {
        setError("Maximum 3 badges sur la vitrine. Retire-en un pour ajouter celui-ci.");
        return;
      }
      newShowcase = [...showcaseSlugs, slug];
    }

    setShowcaseSlugs(newShowcase);

    // Persister
    startTransition(async () => {
      const result = await updateBadgeShowcaseAction(newShowcase);
      if (!result.success) {
        setError(result.error ?? "Erreur inconnue");
        // Rollback local en cas d'echec serveur
        setShowcaseSlugs(showcaseSlugs);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  // Stats : combien debloques / total
  const nbUnlocked = unlockedSlugs.length;
  const nbTotal = allBadges.length;

  // Tri : showcase en premier, puis unlocked, puis locked
  const sortedBadges = [...allBadges].sort((a, b) => {
    const aShowcase = showcaseSlugs.includes(a.slug) ? 0 : 1;
    const bShowcase = showcaseSlugs.includes(b.slug) ? 0 : 1;
    if (aShowcase !== bShowcase) return aShowcase - bShowcase;
    const aUnlocked = unlockedSlugs.includes(a.slug) ? 0 : 1;
    const bUnlocked = unlockedSlugs.includes(b.slug) ? 0 : 1;
    if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked;
    // Rares en premier dans chaque groupe
    if (a.rare !== b.rare) return a.rare ? -1 : 1;
    return a.nom.localeCompare(b.nom);
  });

  // Vitrine : badges actuellement selectionnes
  const showcaseBadges = sortedBadges.filter((b) => showcaseSlugs.includes(b.slug));

  return (
    <section className="mb-12">
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-vea-text">Mes badges</h2>
        <span className="text-xs text-vea-text-muted">
          <span className="font-bold text-vea-accent">{nbUnlocked}</span> / {nbTotal} debloques
        </span>
      </div>

      {/* VITRINE 3 BADGES */}
      <div className="card-clean p-5 mb-6">
        <h3 className="text-sm font-bold text-vea-text mb-3">
          Vitrine{" "}
          <span className="text-xs text-vea-text-dim font-normal">
            ({showcaseSlugs.length}/3 — visibles sur ton profil public)
          </span>
        </h3>
        {showcaseBadges.length === 0 ? (
          <p className="text-xs text-vea-text-muted italic text-center py-4">
            Aucun badge dans ta vitrine. Clique sur un badge debloque ci-dessous pour l&apos;ajouter.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {showcaseBadges.map((badge) => (
              <button
                key={badge.id}
                type="button"
                onClick={() => toggleShowcase(badge.slug)}
                className="cursor-pointer text-left"
                disabled={isPending}
                aria-label={`Retirer ${badge.nom} de la vitrine`}
              >
                <BadgeCard badge={badge} unlocked={true} inShowcase={true} size="md" />
              </button>
            ))}
            {/* Slots vides pour completer 3 */}
            {Array.from({ length: 3 - showcaseBadges.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="border-2 border-dashed border-vea-border rounded-lg p-4 flex items-center justify-center text-vea-text-dim text-xs italic"
              >
                Slot libre
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback */}
      {error && (
        <div className="mb-4 border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-2 text-sm text-vea-accent">
          {error}
        </div>
      )}
      {saved && (
        <div className="mb-4 border border-green-300 bg-green-50 rounded-lg px-4 py-2 text-sm text-green-700">
          Vitrine mise a jour.
        </div>
      )}

      {/* GRILLE TOUS LES BADGES (locked visibles avec conditions) */}
      <h3 className="text-sm font-bold text-vea-text mb-3">
        Tous les badges{" "}
        <span className="text-xs text-vea-text-dim font-normal">
          (les verrouilles montrent comment les obtenir)
        </span>
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {sortedBadges.map((badge) => {
          const isUnlocked = unlockedSlugs.includes(badge.slug);
          const isInShowcase = showcaseSlugs.includes(badge.slug);
          return (
            <button
              key={badge.id}
              type="button"
              onClick={() => isUnlocked && toggleShowcase(badge.slug)}
              disabled={!isUnlocked || isPending}
              className={`text-left ${isUnlocked ? "cursor-pointer" : "cursor-not-allowed"}`}
              aria-label={
                isUnlocked
                  ? `${isInShowcase ? "Retirer" : "Ajouter"} ${badge.nom} ${isInShowcase ? "de" : "a"} la vitrine`
                  : `${badge.nom} verrouille`
              }
            >
              <BadgeCard
                badge={badge}
                unlocked={isUnlocked}
                inShowcase={isInShowcase}
                size="sm"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
