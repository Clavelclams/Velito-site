/**
 * SearchPanel — barre de recherche globale du hub Velito.
 *
 * Fonctionnalité :
 *   L'utilisateur tape dans le champ → on charge (lazy) /search-index.json
 *   généré par scripts/build-search-index.mjs, puis on filtre + score les
 *   entrées et on affiche un dropdown avec les résultats groupés par app
 *   (3 max par app + "Voir tout sur XXX →").
 *
 * Scoring maison (inspiré TF-IDF, pas de dépendance externe) :
 *   Pour chaque entrée, on calcule un score basé sur :
 *     - Combien de tokens de la query matchent dans le text (sub-string)
 *     - Pondération par niveau de balise (titre > sous-titre > paragraphe)
 *     - Bonus "match au début" (le titre commence par le terme cherché)
 *     - Bonus "match exact dans un mot"
 *   Le score est ensuite normalisé. Implémentation simple = défendable jury.
 *
 * UX :
 *   - Dropdown visible si query.length >= 2 ET résultats > 0
 *   - Groupé par app, avec label de la section parente quand dispo
 *   - Surlignage des matches (regex insensible à la casse)
 *   - Keyboard nav : ↑ ↓ Enter Esc
 *   - Esc / click en dehors → ferme
 *
 * Performance :
 *   - Index chargé une seule fois au premier focus (paresseux)
 *   - Cache en mémoire pour les recherches suivantes
 *   - Debounce 120ms sur la query pour pas re-scorer à chaque frappe
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/** Structure d'une entrée d'index (mirroir de scripts/build-search-index.mjs) */
interface SearchEntry {
  id: string;
  app: string;
  appLabel: string;
  url: string;
  kind: "title" | "subtitle" | "paragraph" | "item" | "module" | "page";
  level: number;
  text: string;
  section?: string;
}

interface ScoredEntry extends SearchEntry {
  score: number;
}

/** Pondération par niveau (plus le niveau est bas, plus c'est important). */
const LEVEL_WEIGHT: Record<number, number> = {
  1: 5.0,   // h1 / module / page
  2: 3.0,   // h2
  3: 2.0,   // h3
  4: 1.5,   // h4
  5: 1.0,   // p / li
};

const MAX_RESULTS_PER_APP = 3;

/** Découpe la query en tokens lowercase non vides (>=2 chars). */
function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // retire les accents pour matcher "esport" / "Esport"
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

/** Idem pour l'index (pré-normalisé une fois par entrée pour la vitesse). */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Calcule le score d'une entrée pour une liste de tokens.
 * Retourne 0 si aucun token ne match (l'entrée sera filtrée).
 */
function scoreEntry(entry: SearchEntry, tokens: string[], normalized: string): number {
  if (tokens.length === 0) return 0;
  let score = 0;
  let matched = 0;

  for (const tok of tokens) {
    if (!normalized.includes(tok)) continue;
    matched++;

    // Bonus si le mot commence par le token (genre query "esp" → match "esport")
    const wordStartRe = new RegExp(`\\b${tok}`, "i");
    if (wordStartRe.test(normalized)) score += 2;
    else score += 1;

    // Bonus si tout au début du texte
    if (normalized.startsWith(tok)) score += 3;
  }

  if (matched === 0) return 0;
  // Bonus si TOUS les tokens matchent (recherche multi-mots)
  if (matched === tokens.length) score *= 1.5;

  // Pondération par niveau
  score *= LEVEL_WEIGHT[entry.level] ?? 1;

  return score;
}

/**
 * Échappe un texte pour qu'il soit utilisable dans un regex.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Rend un texte avec les matches surlignés en jaune (<mark>).
 * Renvoie un fragment React. Inspiré du parser de Markdown : on split sur
 * la regex globale et on alterne texte / match.
 */
function highlightText(text: string, tokens: string[]): React.ReactNode {
  if (tokens.length === 0) return text;
  const pattern = tokens.map(escapeRegex).join("|");
  const re = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark key={i} className="bg-[#a78bfa]/40 text-white rounded px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function SearchPanel() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Lazy load de l'index au 1er focus ----------------------------------
  const loadIndex = useCallback(async () => {
    if (index !== null) return;
    try {
      const res = await fetch("/search-index.json", { cache: "force-cache" });
      const data = (await res.json()) as SearchEntry[];
      setIndex(data);
    } catch (e) {
      console.error("[SearchPanel] impossible de charger /search-index.json", e);
      setIndex([]);
    }
  }, [index]);

  // --- Debounce 120ms -----------------------------------------------------
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  // --- Calcul des résultats scorés + groupés par app ----------------------
  const groupedResults = useMemo(() => {
    if (!index || debouncedQuery.length < 2) return null;
    const tokens = tokenize(debouncedQuery);
    if (tokens.length === 0) return null;

    const scored: ScoredEntry[] = [];
    for (const entry of index) {
      const normalized = normalizeForMatch(entry.text);
      const s = scoreEntry(entry, tokens, normalized);
      if (s > 0) scored.push({ ...entry, score: s });
    }
    scored.sort((a, b) => b.score - a.score);

    // Grouper par app, en limitant à MAX_RESULTS_PER_APP par app
    const byApp = new Map<string, { appLabel: string; entries: ScoredEntry[]; total: number }>();
    for (const e of scored) {
      const cur = byApp.get(e.app) ?? { appLabel: e.appLabel, entries: [], total: 0 };
      cur.total += 1;
      if (cur.entries.length < MAX_RESULTS_PER_APP) cur.entries.push(e);
      byApp.set(e.app, cur);
    }

    // Trier les apps par score total décroissant (le top score de l'app)
    return Array.from(byApp.entries())
      .map(([app, data]) => ({
        app,
        appLabel: data.appLabel,
        entries: data.entries,
        more: data.total - data.entries.length,
      }))
      .sort((a, b) => (b.entries[0]?.score ?? 0) - (a.entries[0]?.score ?? 0));
  }, [index, debouncedQuery]);

  // Liste plate des résultats pour la nav clavier
  const flatResults = useMemo(() => {
    if (!groupedResults) return [];
    return groupedResults.flatMap((g) => g.entries);
  }, [groupedResults]);

  // Reset highlighted index quand la query change
  useEffect(() => {
    setHighlighted(0);
  }, [debouncedQuery]);

  // --- Click outside → ferme ---------------------------------------------
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // --- Keyboard nav -------------------------------------------------------
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!groupedResults || flatResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatResults[highlighted];
      if (target) {
        if (target.url.startsWith("http")) {
          window.location.href = target.url;
        } else {
          window.location.href = target.url;
        }
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const tokens = tokenize(debouncedQuery);
  const showDropdown = open && debouncedQuery.length >= 2;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input -------------------------------------------------------- */}
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { loadIndex(); setOpen(true); }}
          onKeyDown={onKeyDown}
          placeholder="Rechercher dans Velito…"
          aria-label="Rechercher dans tout l'écosystème Velito"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          className="w-full pl-10 pr-4 py-2 bg-white/5 backdrop-blur-md border border-white/15 rounded-full text-white placeholder-white/50 text-sm focus:outline-none focus:border-white/40 focus:bg-white/10 transition-colors"
        />
      </div>

      {/* Dropdown ---------------------------------------------------- */}
      {showDropdown && (
        <div
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#04040e]/95 backdrop-blur-md shadow-2xl"
        >
          {/* État : index pas encore chargé */}
          {index === null && (
            <p className="px-4 py-3 text-sm text-white/60">Chargement de l&apos;index…</p>
          )}

          {/* État : aucun résultat */}
          {index !== null && (!groupedResults || groupedResults.length === 0) && (
            <p className="px-4 py-3 text-sm text-white/60">
              Aucun résultat pour <span className="font-mono">«&nbsp;{debouncedQuery}&nbsp;»</span>
            </p>
          )}

          {/* État : résultats groupés par app */}
          {groupedResults?.map((group) => (
            <section key={group.app} className="border-b border-white/5 last:border-b-0">
              <header className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                {group.appLabel}
              </header>
              <ul>
                {group.entries.map((entry) => {
                  const flatIdx = flatResults.indexOf(entry);
                  const isHighlighted = flatIdx === highlighted;
                  return (
                    <li key={entry.id}>
                      <Link
                        href={entry.url}
                        onClick={() => setOpen(false)}
                        className={`block px-4 py-2 transition-colors ${
                          isHighlighted ? "bg-white/10" : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <p className="text-sm text-white leading-snug line-clamp-2">
                          {highlightText(entry.text.length > 180 ? entry.text.slice(0, 180) + "…" : entry.text, tokens)}
                        </p>
                        {entry.section && (
                          <p className="text-[11px] text-white/40 mt-0.5">
                            {entry.section} · {entry.kind}
                          </p>
                        )}
                      </Link>
                    </li>
                  );
                })}
                {group.more > 0 && (
                  <li className="px-4 py-2 text-[11px] text-white/40">
                    +{group.more} autres résultats dans {group.appLabel}
                  </li>
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
