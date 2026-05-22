/**
 * /admin/bilan VEA — Bilan & suivi de l'association.
 *
 * Server Component. Acces : permission "vea" editor+ (sinon redirect /login).
 *
 * Objectif (demande Clavel 22/05/2026) : une vue d'ensemble chiffree de l'asso
 * pour deux usages concrets :
 *   1. Dossiers de subvention (mixite F/G, jeunesse, participation reelle).
 *   2. Pilotage interne (Alban + Clavel) : comment se porte VEA.
 *
 * 4 vues demandees :
 *   - Repartition par sexe (F / G / Autre)        -> donut SVG
 *   - Repartition par niveau (gamification)       -> barres
 *   - Statut : compte / pre-inscrit / Old VEA     -> barres
 *   - Participation aux events                    -> top events + taux
 *
 * + 2 listes ancrees (#membres, #preinscrits) vers lesquelles pointent les
 *   cards stats du dashboard.
 *
 * Donnees : client utilisateur (session admin) — la RLS autorise l'admin VEA a
 * lire tous les participants/presences (idem dashboard /admin).
 * Le niveau se calcule depuis xp_saison_actuelle via computeLevel().
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";
import { computeLevel } from "@/lib/gamification";
import SexeSelect from "./SexeSelect";

export const dynamic = "force-dynamic";

// ---- Types des lignes lues ----
type ParticipantRow = {
  id: string;
  prenom: string | null;
  nom: string | null;
  sexe: "F" | "M" | "X" | null;
  date_naissance: string | null;
  user_id: string | null;
  pre_inscrit: boolean | null;
  xp_saison_actuelle: number | null;
  role: string | null;
  created_at: string | null;
  quartier: string | null;
};

type PresenceRow = {
  participant_id: string;
  event_slug: string | null;
};

// ---- Palette graphiques (exception data-viz : hex directs, accessibles sur blanc) ----
const C_RED = "#E63946"; // accent VEA
const C_BLUE = "#2D6A9F"; // bleu institutionnel
const C_GRAY = "#9CA3AF"; // neutre
const C_GREEN = "#2F9E5E"; // statut "compte cree"
const C_AMBER = "#D9883B"; // statut "pre-inscrit"

/** Calcule l'age en annees a partir d'une date ISO (ou null). */
function ageFrom(dateIso: string | null): number | null {
  if (!dateIso) return null;
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/**
 * Donut SVG pur (pas de lib). On dessine chaque segment via stroke-dasharray
 * sur un cercle : la longueur du trait = part du segment dans le total.
 */
function Donut({
  segments,
  size = 168,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Repartition">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {/* piste de fond */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#EFEFEC"
            strokeWidth={stroke}
          />
          {total > 0 &&
            segments.map((seg) => {
              const frac = seg.value / total;
              const len = frac * circumference;
              const dash = `${len} ${circumference - len}`;
              const el = (
                <circle
                  key={seg.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={stroke}
                  strokeDasharray={dash}
                  strokeDashoffset={-offsetAcc}
                />
              );
              offsetAcc += len;
              return el;
            })}
        </g>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-vea-text"
          style={{ fontSize: 26, fontWeight: 800 }}
        >
          {total}
        </text>
      </svg>

      <ul className="space-y-2 text-sm">
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <li key={seg.label} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-vea-text font-medium">{seg.label}</span>
              <span className="text-vea-text-dim">
                — {seg.value} ({pct}%)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Barres horizontales simples (CSS). Le max definit la largeur 100%. */
function BarList({
  rows,
  color = C_RED,
  emptyLabel = "Pas encore de donnees.",
}: {
  rows: { label: string; value: number; sub?: string }[];
  color?: string;
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) {
    return <p className="text-sm text-vea-text-dim italic">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm font-medium text-vea-text">{r.label}</span>
            <span className="text-sm text-vea-text-dim tabular-nums">
              {r.value}
              {r.sub ? <span className="text-xs ml-1">{r.sub}</span> : null}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-[#EFEFEC] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round((r.value / max) * 100)}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Petite carte KPI. */
function Kpi({
  value,
  label,
  sub,
}: {
  value: string | number;
  label: string;
  sub?: string;
}) {
  return (
    <div className="card-clean p-5 text-center h-full">
      <div className="text-3xl font-black text-vea-accent">{value}</div>
      <p className="text-xs uppercase tracking-widest text-vea-text-muted mt-2 font-semibold">
        {label}
      </p>
      {sub ? <p className="text-[10px] text-vea-text-dim mt-1 italic">{sub}</p> : null}
    </div>
  );
}

export default async function BilanPage() {
  // 1. Garde permission (double securite avec le middleware).
  const canRead = await hasPermission("vea", "editor");
  if (!canRead) redirect("/login?redirect=/admin/bilan");

  // 2. Lectures via le client utilisateur (session admin). La RLS autorise
  // l'admin VEA a tout lire (idem dashboard /admin et /admin/evenements/[id]).
  const supabase = await createClient();

  const [
    { data: pData, error: pErr },
    { data: presData, error: presErr },
  ] = await Promise.all([
    // select("*") volontaire : la table vea.participants n'a pas forcement
    // toutes les colonnes nommees (quartier/created_at etaient des champs Prisma).
    // Un select par colonnes plante toute la requete si UNE manque -> liste vide
    // -> zeros partout. "*" renvoie ce qui existe, le code gere les champs absents.
    supabase.schema("vea").from("participants").select("*"),
    supabase.schema("vea").from("presences").select("participant_id, event_slug"),
  ]);

  if (pErr) console.error("[bilan] participants error:", pErr);
  if (presErr) console.error("[bilan] presences error:", presErr);

  const participants = (pData ?? []) as ParticipantRow[];
  const presences = (presData ?? []) as PresenceRow[];

  // ---- Statut ----
  const membres = participants.filter((p) => p.user_id);
  const preInscrits = participants.filter((p) => !p.user_id && p.pre_inscrit);
  const oldVea = participants.filter((p) => !p.user_id && !p.pre_inscrit);
  const total = participants.length;

  // ---- Sexe ----
  const sexeF = participants.filter((p) => p.sexe === "F").length;
  const sexeM = participants.filter((p) => p.sexe === "M").length;
  const sexeX = participants.filter((p) => p.sexe === "X").length;
  const sexeNR = participants.filter((p) => !p.sexe).length;

  // ---- Age (mineurs / majeurs sur fiches renseignees) ----
  const ages = participants
    .map((p) => ageFrom(p.date_naissance))
    .filter((a): a is number => a !== null);
  const mineurs = ages.filter((a) => a < 18).length;
  const majeurs = ages.filter((a) => a >= 18).length;
  const ageMoyen =
    ages.length > 0
      ? Math.round((ages.reduce((s, a) => s + a, 0) / ages.length) * 10) / 10
      : null;

  // ---- Niveaux (depuis xp_saison_actuelle) ----
  const niveauCount = new Map<number, number>();
  for (const p of participants) {
    const lvl = computeLevel(Number(p.xp_saison_actuelle ?? 0));
    niveauCount.set(lvl, (niveauCount.get(lvl) ?? 0) + 1);
  }
  const niveauRows = [...niveauCount.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([lvl, count]) => ({ label: `Niveau ${lvl}`, value: count }));

  // ---- Participation events ----
  // Nb de personnes distinctes vues au moins 1 fois.
  const venusSet = new Set(presences.map((p) => p.participant_id));
  const venusCount = venusSet.size;
  const tauxParticipation =
    total > 0 ? Math.round((venusCount / total) * 100) : 0;

  // Top events par frequentation (presences distinctes par event_slug).
  const eventCount = new Map<string, Set<string>>();
  for (const pr of presences) {
    if (!pr.event_slug) continue;
    if (!eventCount.has(pr.event_slug)) eventCount.set(pr.event_slug, new Set());
    eventCount.get(pr.event_slug)!.add(pr.participant_id);
  }
  const topEvents = [...eventCount.entries()]
    .map(([slug, set]) => ({ label: slug, value: set.size }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // ---- Helpers listes ----
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("fr-FR") : "—";
  const nomComplet = (p: ParticipantRow) =>
    `${p.prenom ?? ""} ${p.nom ?? ""}`.trim() || "—";

  const membresSorted = [...membres].sort((a, b) =>
    nomComplet(a).localeCompare(nomComplet(b))
  );
  const preInscritsSorted = [...preInscrits].sort((a, b) =>
    nomComplet(a).localeCompare(nomComplet(b))
  );

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div>
            <span className="badge-red mb-3 inline-block">Suivi &amp; pilotage</span>
            <h1 className="text-3xl sm:text-4xl font-black text-vea-text">
              Bilan de l&apos;association
            </h1>
            <p className="text-vea-text-muted text-sm mt-1">
              Une photo chiffrée de VEA — pour les dossiers de subvention et le
              pilotage interne.
            </p>
          </div>
          <Link
            href="/admin"
            className="text-xs text-vea-text-dim hover:text-vea-accent transition-colors"
          >
            ← Retour au dashboard
          </Link>
        </div>

        {/* KPI rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
          <Kpi value={total} label="Inscrits total" sub="Toutes catégories" />
          <Kpi value={membres.length} label="Membres" sub="Compte créé" />
          <Kpi value={preInscrits.length} label="Pré-inscrits" sub="À fusionner" />
          <Kpi value={oldVea.length} label="Old VEA" sub="À relancer" />
          <Kpi
            value={`${tauxParticipation}%`}
            label="Participation"
            sub={`${venusCount} venus ≥ 1 event`}
          />
        </div>

        {/* Grille 2 colonnes de graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {/* Sexe */}
          <section className="card-clean p-6">
            <h2 className="text-lg font-bold text-vea-text mb-1">
              Répartition par sexe
            </h2>
            <p className="text-xs text-vea-text-dim mb-5">
              Mixité des inscrits — indicateur clé pour les financeurs.
            </p>
            <Donut
              segments={[
                { label: "Filles", value: sexeF, color: C_RED },
                { label: "Garçons", value: sexeM, color: C_BLUE },
                { label: "Autre", value: sexeX, color: C_GRAY },
                { label: "Non renseigné", value: sexeNR, color: "#D9D9D4" },
              ]}
            />
          </section>

          {/* Age */}
          <section className="card-clean p-6">
            <h2 className="text-lg font-bold text-vea-text mb-1">
              Tranches d&apos;âge
            </h2>
            <p className="text-xs text-vea-text-dim mb-5">
              Sur {ages.length} fiche{ages.length > 1 ? "s" : ""} avec date de
              naissance{ageMoyen !== null ? ` — âge moyen ${ageMoyen} ans` : ""}.
            </p>
            <BarList
              color={C_BLUE}
              rows={[
                { label: "Mineurs (-18)", value: mineurs },
                { label: "Majeurs (18+)", value: majeurs },
              ]}
              emptyLabel="Aucune date de naissance renseignée pour l'instant."
            />
          </section>

          {/* Niveaux */}
          <section className="card-clean p-6">
            <h2 className="text-lg font-bold text-vea-text mb-1">
              Répartition par niveau
            </h2>
            <p className="text-xs text-vea-text-dim mb-5">
              Niveau gamifié (calculé depuis l&apos;XP de la saison).
            </p>
            <BarList rows={niveauRows} color={C_RED} />
          </section>

          {/* Statut */}
          <section className="card-clean p-6">
            <h2 className="text-lg font-bold text-vea-text mb-1">
              Statut des inscrits
            </h2>
            <p className="text-xs text-vea-text-dim mb-5">
              Qui a un vrai compte, qui reste à fusionner ou relancer.
            </p>
            <BarList
              color={C_GREEN}
              rows={[
                { label: "Membres (compte créé)", value: membres.length },
                { label: "Pré-inscrits (scan guest)", value: preInscrits.length },
                { label: "Old VEA (à relancer)", value: oldVea.length },
              ]}
            />
          </section>
        </div>

        {/* Participation aux events */}
        <section className="card-clean p-6 mb-10">
          <h2 className="text-lg font-bold text-vea-text mb-1">
            Participation aux événements
          </h2>
          <p className="text-xs text-vea-text-dim mb-5">
            Nombre de participants distincts par événement (top 8).
          </p>
          <BarList
            rows={topEvents}
            color={C_AMBER}
            emptyLabel="Aucune présence enregistrée pour l'instant."
          />
        </section>

        {/* Liste membres avec compte (ancre #membres) */}
        <section id="membres" className="mb-10 scroll-mt-28">
          <h2 className="text-xl font-bold text-vea-text mb-4">
            Membres avec compte{" "}
            <span className="text-vea-text-dim font-normal text-base">
              ({membres.length})
            </span>
          </h2>
          <div className="card-clean overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-vea-border text-left">
                  {["Nom", "Sexe", "Niveau", "Inscrit le"].map((h) => (
                    <th
                      key={h}
                      className="p-3 text-xs uppercase tracking-widest text-vea-text-muted font-semibold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {membresSorted.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-vea-border/50 ${
                      i % 2 ? "bg-vea-bg/40" : ""
                    }`}
                  >
                    <td className="p-3 text-vea-text font-medium">
                      {nomComplet(p)}
                    </td>
                    <td className="p-3">
                      <SexeSelect participantId={p.id} current={p.sexe} />
                    </td>
                    <td className="p-3 text-vea-text-muted">
                      Niv. {computeLevel(Number(p.xp_saison_actuelle ?? 0))}
                    </td>
                    <td className="p-3 text-vea-text-dim">
                      {fmtDate(p.created_at)}
                    </td>
                  </tr>
                ))}
                {membresSorted.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-vea-text-dim">
                      Aucun membre avec compte pour l&apos;instant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Liste pré-inscrits (ancre #preinscrits) */}
        <section id="preinscrits" className="scroll-mt-28">
          <h2 className="text-xl font-bold text-vea-text mb-4">
            Pré-inscrits à fusionner{" "}
            <span className="text-vea-text-dim font-normal text-base">
              ({preInscrits.length})
            </span>
          </h2>
          <div className="card-clean overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-vea-border text-left">
                  {["Nom", "Sexe", "Quartier", "Vu le"].map((h) => (
                    <th
                      key={h}
                      className="p-3 text-xs uppercase tracking-widest text-vea-text-muted font-semibold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preInscritsSorted.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-vea-border/50 ${
                      i % 2 ? "bg-vea-bg/40" : ""
                    }`}
                  >
                    <td className="p-3 text-vea-text font-medium">
                      {nomComplet(p)}
                    </td>
                    <td className="p-3">
                      <SexeSelect participantId={p.id} current={p.sexe} />
                    </td>
                    <td className="p-3 text-vea-text-muted">{p.quartier ?? "—"}</td>
                    <td className="p-3 text-vea-text-dim">
                      {fmtDate(p.created_at)}
                    </td>
                  </tr>
                ))}
                {preInscritsSorted.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-vea-text-dim">
                      Aucun pré-inscrit en attente. Tout est fusionné.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
