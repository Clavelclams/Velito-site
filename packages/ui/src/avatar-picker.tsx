/**
 * <AvatarPicker /> — Sélecteur d'avatar interactif.
 *
 * UX (style Wii / Mario Kart) :
 *  1. Grand aperçu de l'avatar courant en haut (xl)
 *  2. Grille 5×4 des 20 personnages à choisir
 *  3. Bandeau de 4 couleurs de fond
 *  4. Bandeau de 3 accessoires (dont "aucun")
 *  5. Bouton "Valider mon perso" qui remonte la config au parent
 *
 * Pourquoi pas un wizard multi-étapes :
 *  - Choisir un avatar c'est 10 secondes max. Un wizard rajoute des clics
 *    inutiles. On affiche tout en une page, le joueur joue avec en temps réel.
 *  - Sur mobile (la cible : un joueur dans un bar avec son téléphone), un seul
 *    écran réduit la friction "où je clique pour valider ?".
 *
 * État local seulement : on ne touche pas à la DB ici. C'est le parent qui
 * décide ce qu'il fait du `AvatarConfig` (l'écrire en cookie session, l'envoyer
 * au backend, etc.).
 */
"use client";

import { useMemo, useState } from "react";
import { Avatar } from "./avatar";
import {
  AVATAR_BASES,
  AVATAR_BACKGROUNDS,
  AVATAR_ACCESSORIES,
  DEFAULT_AVATAR,
  type AvatarConfig,
  type AvatarTone,
} from "./avatar-data";

export interface AvatarPickerProps {
  /** Avatar initial (par défaut DEFAULT_AVATAR). */
  initial?: AvatarConfig;
  /** Appelé quand l'user clique "Valider mon perso". */
  onSelect: (config: AvatarConfig) => void;
  /** Label du bouton de validation. Défaut : "Valider mon perso". */
  ctaLabel?: string;
  /** Si true, l'aperçu reste sticky en haut au scroll (mobile). */
  stickyPreview?: boolean;
}

export function AvatarPicker({
  initial = DEFAULT_AVATAR,
  onSelect,
  ctaLabel = "Valider mon perso",
  stickyPreview = false,
}: AvatarPickerProps) {
  const [config, setConfig] = useState<AvatarConfig>(initial);

  // ─── Toggle Gentil/Méchant — pilote TOUT (persos + fonds) ───
  // On déduit la tone initiale depuis l'avatar courant ; sinon "gentil".
  const initialTone: AvatarTone =
    AVATAR_BASES.find((b) => b.id === initial.base)?.tone ?? "gentil";
  const [tone, setTone] = useState<AvatarTone>(initialTone);

  // Persos filtrés par tone (20 par mode)
  const filteredBases = useMemo(
    () => AVATAR_BASES.filter((b) => b.tone === tone),
    [tone]
  );

  // Backgrounds filtrés par tone (palette claire vs sombre)
  const filteredBackgrounds = useMemo(
    () => AVATAR_BACKGROUNDS.filter((b) => b.tone === tone),
    [tone]
  );

  /**
   * Bascule de tonalité : auto-switche perso ET couleur sur la 1ère du nouveau
   * tone si l'actuel n'est pas dans le bon mode.
   */
  function handleToneChange(newTone: AvatarTone) {
    setTone(newTone);

    const currentBaseInNewTone = AVATAR_BASES.find(
      (b) => b.id === config.base && b.tone === newTone
    );
    const currentBgInNewTone = AVATAR_BACKGROUNDS.find(
      (b) => b.id === config.background && b.tone === newTone
    );

    setConfig((c) => ({
      ...c,
      base: currentBaseInNewTone
        ? c.base
        : AVATAR_BASES.find((b) => b.tone === newTone)?.id ?? c.base,
      background: currentBgInNewTone
        ? c.background
        : AVATAR_BACKGROUNDS.find((b) => b.tone === newTone)?.id ?? c.background,
    }));
  }

  return (
    <div className="space-y-10">
      {/* ─── Aperçu en grand — avec marge basse explicite pour séparation forte ─── */}
      <div
        className={
          "flex justify-center pb-8 " +
          (stickyPreview ? "sticky top-0 z-10 bg-ink-700/80 py-3 backdrop-blur" : "")
        }
      >
        <Avatar config={config} size="xl" className="ring-4 ring-white/15" />
      </div>

      {/* ─── 1. Choix du personnage ─── */}
      <section>
        {/* Titre aligné à gauche + 60px d'air en haut, 24px en bas (vers le toggle) */}
        <p
          className="text-left text-xs uppercase tracking-[0.25em] text-white/50"
          style={{ marginTop: "60px", marginBottom: "24px" }}
        >
          Choisis ton perso
        </p>

        {/* Toggle Gentil/Méchant — pilote TOUT (persos visibles + fonds disponibles) */}
        <div
          role="tablist"
          aria-label="Gentil ou Méchant"
          className="mb-6 inline-flex w-full rounded-xl border border-white/10 bg-white/[0.03] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tone === "gentil"}
            onClick={() => handleToneChange("gentil")}
            className={
              "flex-1 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition " +
              (tone === "gentil"
                ? "bg-white text-[#04040e] shadow"
                : "text-white/60 hover:text-white")
            }
          >
            Gentil
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tone === "mechant"}
            onClick={() => handleToneChange("mechant")}
            className={
              "flex-1 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition " +
              (tone === "mechant"
                ? "bg-white text-[#04040e] shadow"
                : "text-white/60 hover:text-white")
            }
          >
            Méchant
          </button>
        </div>

        {/* Grille des persos filtrés par tone (20 visibles à la fois) */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {filteredBases.map((base) => {
            const isSelected = config.base === base.id;
            return (
              <button
                key={base.id}
                type="button"
                onClick={() => setConfig((c) => ({ ...c, base: base.id }))}
                aria-pressed={isSelected}
                aria-label={`Personnage ${base.label}`}
                className={
                  "group flex flex-col items-center rounded-xl p-2 transition " +
                  (isSelected
                    ? "bg-white/10 ring-2 ring-white"
                    : "ring-1 ring-white/5 hover:bg-white/[0.04] hover:ring-white/20")
                }
              >
                <Avatar config={{ ...config, base: base.id }} size="md" />
                <span
                  className={
                    "mt-2 truncate text-xs " +
                    (isSelected ? "font-semibold text-white" : "text-white/50")
                  }
                >
                  {base.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── 2. Couleur de fond — 4 couleurs filtrées selon le tone choisi en haut ─── */}
      <section>
        <p className="mb-5 text-left text-xs uppercase tracking-[0.25em] text-white/50">
          Couleur de fond
        </p>

        {/* 4 ronds de couleur — palette automatiquement filtrée par le toggle Gentil/Méchant */}
        <div className="flex flex-wrap justify-center gap-4">
          {filteredBackgrounds.map((bg) => {
            const isSelected = config.background === bg.id;
            return (
              <button
                key={bg.id}
                type="button"
                onClick={() =>
                  setConfig((c) => ({ ...c, background: bg.id }))
                }
                aria-pressed={isSelected}
                aria-label={`Fond ${bg.label}`}
                style={{ backgroundColor: `#${bg.hex}` }}
                className={
                  "h-10 w-10 rounded-full border-2 transition " +
                  (isSelected
                    ? "scale-110 border-white ring-2 ring-white/30"
                    : "border-white/15 hover:scale-105 hover:border-white/40")
                }
              />
            );
          })}
        </div>
      </section>

      {/* ─── 3. Accessoire ─── */}
      <section>
        <p className="mb-6 text-left text-xs uppercase tracking-[0.25em] text-white/50">
          Accessoire
        </p>
        <div className="grid grid-cols-3 gap-2">
          {AVATAR_ACCESSORIES.map((acc) => {
            const isSelected = config.accessory === acc.id;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() =>
                  setConfig((c) => ({ ...c, accessory: acc.id }))
                }
                aria-pressed={isSelected}
                className={
                  "rounded-full border px-3 py-2 text-center text-xs font-medium transition sm:text-sm " +
                  (isSelected
                    ? "border-white bg-white/10 text-white"
                    : "border-white/15 text-white/60 hover:border-white/30 hover:text-white")
                }
              >
                {acc.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Zone CTA : séparée visuellement de la section accessoires ─── */}
      <div className="mt-4 border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={() => onSelect(config)}
          className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#04040e] shadow-md shadow-white/10 transition hover:bg-white/90 active:scale-[0.98]"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
