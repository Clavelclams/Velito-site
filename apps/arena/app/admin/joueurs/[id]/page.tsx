/**
 * Fiche RGPD d'un joueur — espace orga. /admin/joueurs/[id]
 *
 * Ce que le staff peut faire ici, et rien d'autre :
 *  1. Compléter l'année de naissance d'un joueur inscrit avant que le champ
 *     existe (badge « âge ? » dans la liste des participants).
 *  2. Anonymiser le joueur — le droit à l'effacement (RGPD art. 17), en
 *     retapant son pseudo pour confirmer.
 *
 * Accès : staff d'une organisation où le joueur a participé. La page le
 * vérifie elle-même (le layout ne protège que le rendu, pas les données), et
 * chaque action le revérifie côté serveur : la page peut mentir, pas l'action.
 *
 * Client service_role : c'est le seul endroit public de l'app où l'année de
 * naissance et le statut de mineur s'affichent — au staff, et à lui seul.
 */
import { notFound } from "next/navigation";
import { getContexteStaff } from "@/lib/arena/auth";
import { getServiceClient } from "@/lib/supabase/service";
import { anonymiserJoueur, completerAnneeNaissance } from "@/lib/arena/actions";
import type { Joueur } from "@/lib/arena/types";
import BandeauErreur from "@/components/BandeauErreur";

const inputCls =
  "rounded-lg border border-arena-border bg-arena-surface px-3 py-2 text-sm focus:border-arena-violet focus:outline-none";

export default async function FicheJoueur({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;
  const ctx = await getContexteStaff();
  if (!ctx) return null; // le layout affiche déjà l'écran de connexion

  const db = getServiceClient();
  const orgIds = ctx.organisations.map((o) => o.id);

  // Lien légitime : au moins une participation dans MES organisations.
  // Sinon 404 — on ne confirme pas à un staff étranger que ce joueur existe.
  const [{ data: joueurData }, { data: partData }] = await Promise.all([
    db.schema("arena").from("joueurs").select("*").eq("id", id).maybeSingle(),
    db
      .schema("arena")
      .from("participations")
      .select("id, tournoi:tournois!inner(id, titre, date_debut, organisation_id)")
      .eq("joueur_id", id)
      .in("tournoi.organisation_id", orgIds)
      .order("created_at", { ascending: false }),
  ]);
  if (!joueurData || !partData || partData.length === 0) notFound();
  const joueur = joueurData as Joueur;
  const participations = partData as unknown as {
    id: string;
    tournoi: { id: string; titre: string; date_debut: string } | null;
  }[];

  // Historique des consentements : lecture staff, table append-only.
  const { data: consData } = await db
    .schema("arena")
    .from("consentements")
    .select("type, accorde, source, created_at")
    .eq("joueur_id", id)
    .order("created_at", { ascending: false })
    .limit(20);
  const consentements = (consData ?? []) as {
    type: string;
    accorde: boolean;
    source: string;
    created_at: string;
  }[];

  return (
    <div className="mx-auto max-w-2xl">
      <a href="/admin/tournois" className="text-sm text-arena-faint hover:text-arena-ink">
        ← Tournois
      </a>
      <h1 className="mt-2 text-2xl font-black">
        {joueur.pseudo}
        {joueur.anonymise && (
          <span className="ml-2 rounded-full bg-arena-surface px-2 py-0.5 text-xs font-semibold text-arena-faint">
            anonymisé
          </span>
        )}
      </h1>
      <p className="mt-1 text-sm text-arena-muted">
        Fiche RGPD · visible du staff uniquement
      </p>

      <BandeauErreur message={erreur} />

      {/* ---- Identité et âge ---- */}
      <section className="mt-6 rounded-lg border border-arena-border bg-arena-surface shadow-carte p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-arena-faint">
          Âge et protection
        </h2>
        {joueur.anonymise ? (
          <p className="text-sm text-arena-muted">
            Ce joueur a exercé son droit à l&apos;effacement : plus aucune donnée
            personnelle n&apos;est conservée.
          </p>
        ) : joueur.annee_naissance !== null ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
            <dt className="text-arena-faint">Année de naissance</dt>
            <dd className="font-semibold">{joueur.annee_naissance}</dd>
            <dt className="text-arena-faint">Statut</dt>
            <dd className="font-semibold">
              {joueur.est_mineur ? "Mineur — profil restreint" : "Majeur"}
            </dd>
            <dt className="text-arena-faint">Visible dans les classements</dt>
            <dd className="font-semibold">{joueur.profil_public ? "Oui" : "Non"}</dd>
            {joueur.consentement_parental_at && (
              <>
                <dt className="text-arena-faint">Autorisation parentale</dt>
                <dd className="font-semibold">
                  recueillie le{" "}
                  {new Date(joueur.consentement_parental_at).toLocaleDateString("fr-FR")}
                </dd>
              </>
            )}
          </dl>
        ) : (
          <>
            <p className="mb-3 text-sm text-arena-muted">
              Année de naissance inconnue : ce joueur a été inscrit avant que le
              champ soit demandé. Tant qu&apos;elle manque, il est traité comme
              majeur et apparaît dans les classements publics.{" "}
              <b>Complète-la à sa prochaine venue.</b>
            </p>
            <form action={completerAnneeNaissance} className="flex flex-col gap-2">
              <input type="hidden" name="joueur_id" value={joueur.id} />
              <div className="flex gap-2">
                <input
                  name="annee_naissance"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  placeholder="Année de naissance"
                  aria-label="Année de naissance (4 chiffres)"
                  className={`${inputCls} w-44`}
                />
                <button className="rounded-lg bg-arena-violet px-4 py-2 text-sm font-semibold text-white hover:bg-arena-violet-fonce">
                  Enregistrer
                </button>
              </div>
              <label className="flex items-start gap-2 text-xs text-arena-muted">
                <input type="checkbox" name="consentement_parental" className="mt-0.5" />
                <span>
                  Autorisation parentale recueillie — obligatoire si moins de 15 ans.
                </span>
              </label>
            </form>
          </>
        )}
      </section>

      {/* ---- Participations dans mes orgas ---- */}
      <section className="mt-6 rounded-lg border border-arena-border bg-arena-surface shadow-carte p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-arena-faint">
          Tournois dans tes organisations ({participations.length})
        </h2>
        <ul className="space-y-1 text-sm">
          {participations.map((p) => (
            <li key={p.id}>
              {p.tournoi ? (
                <a href={`/admin/tournois/${p.tournoi.id}`} className="underline hover:text-arena-violet">
                  {p.tournoi.titre}
                </a>
              ) : (
                "?"
              )}
              {p.tournoi && (
                <span className="ml-2 text-arena-faint">
                  {new Date(p.tournoi.date_debut).toLocaleDateString("fr-FR")}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Consentements ---- */}
      {consentements.length > 0 && (
        <section className="mt-6 rounded-lg border border-arena-border bg-arena-surface shadow-carte p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-arena-faint">
            Consentements enregistrés
          </h2>
          <ul className="space-y-1 text-sm">
            {consentements.map((c, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-32 text-arena-faint">
                  {new Date(c.created_at).toLocaleDateString("fr-FR")}
                </span>
                <span className="font-mono text-xs">{c.type}</span>
                <span className={c.accorde ? "text-arena-green" : "text-arena-muted"}>
                  {c.accorde ? "accordé" : "refusé / restreint"}
                </span>
                <span className="text-arena-faint">({c.source})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- Droit à l'effacement ---- */}
      {!joueur.anonymise && (
        <section className="mt-6 rounded-lg border border-arena-red/30 bg-arena-red-pale/40 p-4">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-arena-red">
            Droit à l&apos;effacement
          </h2>
          <p className="mb-3 text-sm text-arena-muted">
            À utiliser sur demande du joueur (ou d&apos;un parent pour un mineur).
            Le pseudo, l&apos;année de naissance et le lien avec un compte sont
            effacés ; les matchs restent, sous un identifiant neutre, pour ne
            pas fausser les résultats des autres. <b>Irréversible.</b>
          </p>
          <form action={anonymiserJoueur} className="flex flex-wrap gap-2">
            <input type="hidden" name="joueur_id" value={joueur.id} />
            <input
              name="confirmation"
              required
              autoComplete="off"
              placeholder={`Retape « ${joueur.pseudo} » pour confirmer`}
              aria-label="Confirmation : retape le pseudo"
              className={`${inputCls} min-w-0 flex-1`}
            />
            <button className="rounded-lg border border-arena-red bg-arena-surface px-4 py-2 text-sm font-semibold text-arena-red hover:bg-arena-red hover:text-white">
              Anonymiser ce joueur
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
