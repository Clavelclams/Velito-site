/**
 * /moi : l'espace joueur (12/11/2026, migration 010).
 *
 * Quatre états, dans l'ordre où un joueur les traverse :
 *  1. pas connecté          → bouton de connexion (hub, retour ici) ;
 *  2. connecté, sans profil → « première fois » (créer) ou « c'est mon
 *                             pseudo » (demande au staff) ;
 *  3. demande en attente    → on le dit, avec un bouton pour annuler ;
 *  4. profil relié          → ses tournois (en cours, à venir, passés), les
 *                             tournois ouverts en ligne, son profil public.
 *
 * Server Component, formulaires natifs : zéro JavaScript client, comme le
 * reste d'ARENA. Les lectures passent par service_role, TOUJOURS filtrées
 * par l'id du compte vérifié (getUtilisateur), jamais par un paramètre.
 *
 * Pour « mon prochain match », on renvoie vers la page du tournoi avec
 * ?moi=<pseudo> : la logique existe déjà (mon-match.ts, 13 tests), on ne
 * la duplique pas.
 */
import type { Metadata } from "next";
import { getUtilisateur } from "@/lib/arena/auth";
import { getServiceClient } from "@/lib/supabase/service";
import {
  annulerDemandeRattachement,
  creerProfilJoueur,
  demanderRattachement,
} from "@/lib/arena/actions-joueur";
import { etatAutorisationParentale, lienConnexion } from "@/lib/arena/espace-joueur";
import EnteteSite from "@/components/EnteteSite";
import PiedSite from "@/components/PiedSite";
import BandeauErreur from "@/components/BandeauErreur";
import type { StatutTournoi } from "@/lib/arena/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon espace", robots: { index: false } };

const HUB_LOGIN = process.env.NEXT_PUBLIC_HUB_LOGIN_URL ?? "https://hub.velito.fr/login";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arena.velito.fr";

const carte = "rounded-lg border border-arena-border bg-arena-surface p-5 shadow-carte";
const champ =
  "min-h-[44px] w-full rounded-lg border border-arena-border bg-arena-bg px-3 py-2 text-sm focus:border-arena-violet focus:outline-none";
const bouton =
  "min-h-[44px] rounded-lg bg-arena-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-arena-violet-fonce";

interface TournoiResume {
  id: string;
  titre: string;
  jeu: string;
  date_debut: string;
  lieu: string | null;
  statut: StatutTournoi;
  qr_token: string;
}

function dateCourte(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function PageMoi({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  const compte = await getUtilisateur();

  return (
    <>
      <EnteteSite />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-6 text-3xl font-black">
          Mon espace<span className="text-arena-violet">.</span>
        </h1>
        <BandeauErreur message={erreur} />
        {compte ? <Contenu userId={compte.id} /> : <NonConnecte />}
      </main>
      <PiedSite />
    </>
  );
}

function NonConnecte() {
  return (
    <div className={carte}>
      <p className="mb-4 text-arena-muted">
        Connecte-toi avec ton compte Velito (le même que sur le hub) pour
        retrouver tes tournois, ton prochain match et ton palmarès.
      </p>
      <a href={lienConnexion(HUB_LOGIN, `${SITE_URL}/moi`)} className={`inline-block ${bouton}`}>
        Se connecter
      </a>
    </div>
  );
}

async function Contenu({ userId }: { userId: string }) {
  const db = getServiceClient();
  const { data: joueur } = await db
    .schema("arena")
    .from("joueurs")
    .select("id, pseudo, profil_public, annee_naissance, consentement_parental_at")
    .eq("user_id", userId)
    .eq("anonymise", false)
    .maybeSingle();

  if (!joueur) {
    const { data: demande } = await db
      .schema("arena")
      .from("demandes_rattachement")
      .select("id, created_at, joueur:joueurs(pseudo)")
      .eq("user_id", userId)
      .eq("statut", "EN_ATTENTE")
      .maybeSingle();
    if (demande) {
      const d = demande as unknown as { created_at: string; joueur: { pseudo: string } | null };
      return (
        <div className={carte}>
          <p className="mb-4">
            Ta demande pour le pseudo <b>{d.joueur?.pseudo ?? "?"}</b> est en
            attente depuis le {dateCourte(d.created_at)}. Le staff d&apos;un
            tournoi où ce pseudo a joué doit la valider.
          </p>
          <form action={annulerDemandeRattachement}>
            <button className="text-sm text-arena-faint underline hover:text-arena-ink">
              Annuler ma demande
            </button>
          </form>
        </div>
      );
    }
    return <SansProfil />;
  }

  const j = joueur as {
    id: string;
    pseudo: string;
    profil_public: boolean;
    annee_naissance: number | null;
    consentement_parental_at: string | null;
  };

  const [{ data: partsData }, { data: ouvertsData }] = await Promise.all([
    db
      .schema("arena")
      .from("participations")
      .select("check_in, tournoi:tournois(id, titre, jeu, date_debut, lieu, statut, qr_token)")
      .eq("joueur_id", j.id),
    db
      .schema("arena")
      .from("tournois")
      .select("id, titre, jeu, date_debut, lieu, statut, qr_token")
      .eq("statut", "OUVERT")
      .eq("inscription_en_ligne", true)
      .order("date_debut", { ascending: true })
      .limit(20),
  ]);

  const parts = ((partsData ?? []) as unknown as { check_in: boolean; tournoi: TournoiResume | null }[])
    .filter((p): p is { check_in: boolean; tournoi: TournoiResume } => p.tournoi !== null)
    .sort((a, b) => a.tournoi.date_debut.localeCompare(b.tournoi.date_debut));
  const enCours = parts.filter((p) => p.tournoi.statut === "EN_COURS");
  const aVenir = parts.filter((p) => p.tournoi.statut === "OUVERT");
  const passes = parts.filter((p) => p.tournoi.statut === "TERMINE").reverse();
  const mesIds = new Set(parts.map((p) => p.tournoi.id));
  const ouverts = ((ouvertsData ?? []) as TournoiResume[]).filter((t) => !mesIds.has(t.id));

  const parental = etatAutorisationParentale(j.annee_naissance, j.consentement_parental_at, new Date().getFullYear());

  return (
    <div className="space-y-6">
      <div className={carte}>
        <p className="text-xs font-semibold uppercase tracking-widest text-arena-lilac">Ton pseudo</p>
        <p className="text-2xl font-black">{j.pseudo}</p>
        {j.profil_public ? (
          <a href={`/joueurs/${encodeURIComponent(j.pseudo)}`} className="text-sm text-arena-violet underline">
            Voir mon profil public (stats, badges, palmarès)
          </a>
        ) : (
          <p className="text-sm text-arena-muted">
            Profil restreint (joueur mineur) : tu n&apos;apparais dans aucun classement public.
          </p>
        )}
        {parental === "EN_ATTENTE" && (
          <p className="mt-3 rounded-lg bg-arena-gold-pale px-3 py-2 text-sm text-arena-gold">
            Tu as moins de 15 ans : tu peux réserver ta place, mais pour jouer,
            le staff doit recevoir l&apos;autorisation d&apos;un parent (papier signé
            ou parent présent le jour J).
          </p>
        )}
      </div>

      <Liste titre="En cours" vide={null} items={enCours.map((p) => p.tournoi)}
        lien={(t) => `/t/${t.qr_token}?moi=${encodeURIComponent(j.pseudo)}`} action="Mon match →" />
      <Liste titre="Mes prochains tournois" vide="Aucune inscription à venir." items={aVenir.map((p) => p.tournoi)}
        lien={(t) => `/t/${t.qr_token}`} action="Voir"
        note={(t) => (aVenir.find((p) => p.tournoi.id === t.id)?.check_in ? "pointé présent" : "place réservée")} />
      <Liste titre="Inscriptions en ligne ouvertes" vide="Aucun tournoi ouvert en ligne pour l'instant." items={ouverts}
        lien={(t) => `/t/${t.qr_token}`} action="S'inscrire →" />
      <Liste titre="Tournois joués" vide="Pas encore de tournoi terminé." items={passes.map((p) => p.tournoi)}
        lien={(t) => `/t/${t.qr_token}`} action="Résultats" />
    </div>
  );
}

function Liste({
  titre,
  vide,
  items,
  lien,
  action,
  note,
}: {
  titre: string;
  vide: string | null;
  items: TournoiResume[];
  lien: (t: TournoiResume) => string;
  action: string;
  note?: (t: TournoiResume) => string;
}) {
  if (items.length === 0 && vide === null) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-arena-faint">{titre}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-arena-faint">{vide}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-arena-border bg-arena-surface px-4 py-3">
              <div className="text-sm">
                <p className="font-semibold">{t.titre}</p>
                <p className="text-arena-muted">
                  {t.jeu} · {dateCourte(t.date_debut)}
                  {t.lieu ? ` · ${t.lieu}` : ""}
                  {note ? ` · ${note(t)}` : ""}
                </p>
              </div>
              <a href={lien(t)} className="shrink-0 text-sm font-semibold text-arena-violet hover:underline">
                {action}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SansProfil() {
  return (
    <div className="space-y-6">
      <div className={carte}>
        <h2 className="mb-1 text-lg font-black">Tu as déjà joué à un tournoi ARENA ?</h2>
        <p className="mb-4 text-sm text-arena-muted">
          Le staff t&apos;a inscrit sous un pseudo : demande à le relier à ton
          compte. Le staff valide, et tu récupères tout ton palmarès.
        </p>
        <form action={demanderRattachement} className="flex flex-wrap gap-2">
          <input name="pseudo" required minLength={2} maxLength={32} placeholder="Ton pseudo ARENA" aria-label="Ton pseudo ARENA" className={`${champ} flex-1`} />
          <button className={bouton}>C&apos;est mon pseudo</button>
        </form>
      </div>

      <div className={carte}>
        <h2 className="mb-1 text-lg font-black">Première fois ?</h2>
        <p className="mb-4 text-sm text-arena-muted">Crée ton profil joueur.</p>
        <form action={creerProfilJoueur} className="space-y-3">
          <input name="pseudo" required minLength={2} maxLength={32} placeholder="Pseudo" aria-label="Pseudo" className={champ} />
          <input
            name="annee_naissance"
            required
            inputMode="numeric"
            pattern="[0-9]{4}"
            placeholder="Année de naissance (ex. 2008)"
            aria-label="Année de naissance"
            title="Elle sert uniquement à protéger les mineurs, elle n'est jamais affichée"
            className={champ}
          />
          <p className="text-xs text-arena-faint">
            L&apos;année sert uniquement à protéger les mineurs : un mineur
            n&apos;apparaît dans aucun classement public. Elle n&apos;est jamais affichée.
          </p>
          <label className="flex items-start gap-2 text-sm text-arena-muted">
            <input type="checkbox" name="reglement" required className="mt-1" />
            <span>
              J&apos;ai lu et j&apos;accepte le{" "}
              <a href="/reglement" className="text-arena-violet underline">règlement ARENA</a>.
            </span>
          </label>
          <button className={bouton}>Créer mon profil</button>
        </form>
      </div>
    </div>
  );
}
