/**
 * Page /profil — Espace membre avec distinction des roles.
 *
 * Detecte le scope du user sur les organisations :
 *   - owner sur toutes (vea + hub_velito + vena) -> SUPERADMIN
 *   - owner/editor sur vea seulement              -> ADMIN VEA
 *   - owner/editor sur hub_velito ou vena         -> ADMIN VENA/HUB
 *   - aucune permission                            -> JOUEUR / MEMBRE
 *
 * Affiche un panneau d'acces adapte :
 *   - Superadmin/admin VEA : bouton "Espace admin VEA" -> /admin
 *   - Joueur lambda        : bouton "Aller sur Arena (bientot)" -> /arena
 *
 * Le but : preparer le pont VEA <-> Arena (l'app gamers a venir partagera
 * les memes shared.users et shared.user_permissions).
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProfileEditForm from "./ProfileEditForm";
import ProgressionDashboard from "./ProgressionDashboard";
import NotifToggle from "./NotifToggle";
import BadgesSection from "./BadgesSection";
import DotationsSection, { type DotationARéclamer } from "./DotationsSection";
import TournoisSection from "./TournoisSection";
import XpBar from "@/components/XpBar";
import type { BadgeData } from "@/components/BadgeCard";

/**
 * force-dynamic : on desactive le cache Next.js sur cette page parce que :
 *   1. Les permissions superadmin peuvent changer entre 2 visites
 *   2. Le profil joueur (pseudo/bio) est edite via Server Action et doit
 *      etre relu a chaque chargement
 *   3. /profil est strictement personnel, pas de gain a cacher
 * Sans ca, Next.js peut servir une version stale du Server Component
 * meme apres un revalidatePath, ce qui explique pourquoi les badges
 * Superadmin n'apparaissaient pas apres l'execution du SQL.
 */
export const dynamic = "force-dynamic";

interface UserPermission {
  scope: "owner" | "editor" | "viewer";
  organization_id: string;
  organizations: { slug: string; name: string } | null;
}

interface UserBadge {
  label: string;
  color: "red" | "blue" | "neutral";
  description: string;
}

function computeUserBadges(
  perms: UserPermission[],
  participantRole: "joueur" | "benevole" | "dirigeant" | "superadmin" = "joueur"
): UserBadge[] {
  // Architecture badges cumulatifs (decision 18/05/2026) :
  //   - "Joueur" est TOUJOURS present (la base de tout membre VEA)
  //   - On AJOUTE par-dessus les badges specifiques selon le role BDD et les permissions
  //   - Ex Clavel ex-licencie + superadmin BDD -> [Dirigeant, Joueur]
  //   - Ex Anthony DUPONT dirigeant BDD sans perms -> [Dirigeant, Joueur]
  //   - Ex Berstelien benevole BDD -> [Benevole, Joueur]
  //   - Ex clavelndemamoussa@ avec perms owner vea+hub -> [Superadmin, Joueur]
  //   - Ex nouveau signup sans rien -> [Joueur] seul
  const badges: UserBadge[] = [];

  // 1) Badge ROLE BDD (priorite max, le plus visible)
  if (participantRole === "superadmin") {
    // Cas Clavel ex-licencie Yapla : sa fiche vea.participants est marquee
    // 'superadmin' meme s'il n'a pas de permissions applicatives sur ce compte.
    badges.push({
      label: "Dirigeant",
      color: "red",
      description: "President / fondateur de VEA.",
    });
  } else if (participantRole === "dirigeant") {
    badges.push({
      label: "Dirigeant",
      color: "red",
      description: "Membre du bureau ou du CA de VEA.",
    });
  } else if (participantRole === "benevole") {
    badges.push({
      label: "Benevole",
      color: "blue",
      description: "A donne du temps a VEA (animation, logistique, com').",
    });
  }

  // 2) Badge PERMISSIONS APPLICATIVES (Superadmin / Admin VEA / Admin VENA)
  // Indépendant du role BDD : on peut etre dirigeant BDD ET superadmin perms.
  const orgsByScope: Record<string, string[]> = { owner: [], editor: [], viewer: [] };
  perms.forEach((p) => {
    const slug = p.organizations?.slug ?? "?";
    (orgsByScope[p.scope] ??= []).push(slug);
  });

  const allOwnerSlugs = orgsByScope.owner ?? [];
  const isSuperadmin =
    allOwnerSlugs.includes("vea") &&
    allOwnerSlugs.includes("hub_velito");

  if (isSuperadmin) {
    badges.push({
      label: "Superadmin",
      color: "red",
      description: `Acces total : ${allOwnerSlugs.join(", ")}. Tu peux administrer toutes les apps Velito.`,
    });
  } else {
    if (allOwnerSlugs.includes("vea") || (orgsByScope.editor ?? []).includes("vea")) {
      badges.push({
        label: "Admin VEA",
        color: "red",
        description: "Tu peux gerer les events, participants et presences VEA.",
      });
    }
    if (
      allOwnerSlugs.includes("hub_velito") ||
      allOwnerSlugs.includes("vena") ||
      (orgsByScope.editor ?? []).includes("hub_velito") ||
      (orgsByScope.editor ?? []).includes("vena")
    ) {
      badges.push({
        label: "Admin VENA / Hub",
        color: "blue",
        description: "Tu peux administrer les apps Velito hors VEA.",
      });
    }
  }

  // 3) Badge JOUEUR — TOUJOURS present (la base de tout membre VEA)
  // Place en dernier pour que les roles eleves apparaissent en premier visuellement.
  badges.push({
    label: "Joueur",
    color: "neutral",
    description: "Membre de la communaute VEA. Acces a ton profil et a Arena (bientot).",
  });

  return badges;
}

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/profil");
  }

  // === Lecture profile ===
  const { data: profile } = await supabase
    .schema("shared")
    .from("users")
    .select("email, prenom, nom, created_at")
    .eq("id", user.id)
    .maybeSingle();

  // === Lecture permissions ===
  const { data: permsRaw } = await supabase
    .schema("shared")
    .from("user_permissions")
    .select("scope, organization_id, organizations(slug, name)")
    .eq("user_id", user.id);

  const perms = (permsRaw ?? []) as unknown as UserPermission[];

  // === Lecture du record vea.participants lie a ce user (auto-lie via trigger
  // pour les ex-licencies Yapla) — contient role + heures benevolat + champs
  // editables (pseudo / jeu_prefere / bio / avatar_url / is_public) ===
  // IMPORTANT : necessite GRANT USAGE ON SCHEMA vea TO authenticated + GRANT SELECT
  // (sans ca, RLS n'est meme pas evaluee et la query retourne erreur 42501)
  const { data: participant } = await supabase
    .schema("vea")
    .from("participants")
    .select(
      "id, prenom, nom, role, benevole_hours, benevole_hours_2026_2027, pseudo, jeu_prefere, bio, avatar_url, is_public, external_links, events_old, events_2026_2027, xp_saison_actuelle, points_vena, saison_actuelle, notif_events_active"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  // === Lecture gamification (badges, dotations) ===
  // Tout le catalogue des badges (pour afficher locked + unlocked)
  const { data: allBadgesRaw } = await supabase
    .schema("vea")
    .from("badges")
    .select("id, slug, nom, description, emoji, type, saison, niveau_required, rare");
  const allBadges = (allBadgesRaw ?? []) as BadgeData[];

  // Badges debloques par le user + flag affiche_sur_profil
  // Sera vide tant que le participant n'existe pas (compte tout neuf sans fiche)
  const { data: badgesJoueurs } = participant?.id
    ? await supabase
        .schema("vea")
        .from("badges_joueurs")
        .select("badge_id, affiche_sur_profil, badges(slug)")
        .eq("participant_id", participant.id)
    : { data: [] };

  type BadgeJoueurRow = {
    badge_id: string;
    affiche_sur_profil: boolean;
    badges: { slug: string } | null;
  };
  const badgesJoueursTyped = (badgesJoueurs ?? []) as unknown as BadgeJoueurRow[];
  const unlockedSlugs = badgesJoueursTyped
    .map((bj) => bj.badges?.slug)
    .filter((s): s is string => Boolean(s));
  const showcaseSlugs = badgesJoueursTyped
    .filter((bj) => bj.affiche_sur_profil && bj.badges?.slug)
    .map((bj) => bj.badges!.slug);

  // Dotations a reclamer (pending / reclamee / livree)
  const { data: dotationsRaw } = participant?.id
    ? await supabase
        .schema("vea")
        .from("dotations_a_reclamer")
        .select(
          "id, statut, raison_attribution, attribue_le, reclamee_le, livree_le, dotations(nom, description, emoji, valeur_estimee_eur)"
        )
        .eq("participant_id", participant.id)
        .order("attribue_le", { ascending: false })
    : { data: [] };

  type DotationRow = {
    id: string;
    statut: "pending" | "reclamee" | "livree" | "annulee";
    raison_attribution: string | null;
    attribue_le: string;
    reclamee_le: string | null;
    livree_le: string | null;
    dotations: { nom: string; description: string; emoji: string; valeur_estimee_eur: number | null } | null;
  };
  const dotations: DotationARéclamer[] = ((dotationsRaw ?? []) as unknown as DotationRow[])
    .filter((d) => d.dotations !== null)
    .map((d) => ({
      id: d.id,
      dotation_nom: d.dotations!.nom,
      dotation_description: d.dotations!.description,
      dotation_emoji: d.dotations!.emoji,
      dotation_valeur_eur: d.dotations!.valeur_estimee_eur,
      statut: d.statut,
      raison_attribution: d.raison_attribution,
      attribue_le: d.attribue_le,
      reclamee_le: d.reclamee_le,
      livree_le: d.livree_le,
    }));

  // === Tournois online / presentiel auxquels ce user a participe ===
  // 20/05/2026 : recupere via vea.tournoi_participants + jointure tournois.
  // Le composant TournoisSection se masque tout seul (return null) si liste vide,
  // donc pas besoin de gate ici. Si la fiche participant n'existe pas (compte
  // tout neuf sans encore de fiche vea.participants), on saute la query.
  const { data: participationsRaw } = participant?.id
    ? await supabase
        .schema("vea")
        .from("tournoi_participants")
        .select(
          "tournoi_id, role_dans_equipe, pseudo_utilise, tournois(id, nom, jeu, date_debut, mode, format, resultat, representation_vea, cash_prize)"
        )
        .eq("participant_id", participant.id)
    : { data: [] };

  type TournoiParticipationRow = {
    tournoi_id: string;
    role_dans_equipe: string;
    pseudo_utilise: string | null;
    tournois: {
      id: string;
      nom: string;
      jeu: string;
      date_debut: string;
      mode: string;
      format: string;
      resultat: string | null;
      representation_vea: boolean;
      cash_prize: number | null;
    } | null;
  };
  const participations = (participationsRaw ?? []) as unknown as TournoiParticipationRow[];

  // XP saison actuelle + nom saison pour XpBar
  const xpTotal = Number(participant?.xp_saison_actuelle ?? 0);
  const saisonActuelle = participant?.saison_actuelle ?? "2026/27";
  const saisonNom = saisonActuelle === "2026/27" ? "L'Éveil" : saisonActuelle === "2027/28" ? "L'Ascension" : saisonActuelle;

  const benevoleHoursTotal = Number(participant?.benevole_hours ?? 0);
  // Heures benevolat split par saison sportive :
  //   - benevole_hours_2026_2027 : saison en cours (sept 2026 -> juillet 2027)
  //   - heuresBenevolatOld = total - 2026_2027 (= cumul historique avant cette saison)
  const heuresBenevolatCurrent = Number(participant?.benevole_hours_2026_2027 ?? 0);
  const heuresBenevolatOld = benevoleHoursTotal - heuresBenevolatCurrent;

  // Events participes : separe Old VEA (avant saison 2026/2027) vs saison sportive en cours.
  // events_old = estimation manuelle depuis Notion pour les anciens membres.
  // events_2026_2027 = increment automatique via scan QR (Chantier 2.5 a venir).
  const eventsOld = Number(participant?.events_old ?? 0);
  const eventsCurrent = Number(participant?.events_2026_2027 ?? 0);

  const participantRole = (participant?.role ?? "joueur") as
    | "joueur"
    | "benevole"
    | "dirigeant"
    | "superadmin";

  const badges = computeUserBadges(perms, participantRole);

  const displayName = profile?.prenom
    ? `${profile.prenom}`
    : user.email?.split("@")[0] ?? "Membre";

  // Determinations pour le panneau Acces
  const hasVeaAccess = perms.some(
    (p) =>
      p.organizations?.slug === "vea" &&
      (p.scope === "owner" || p.scope === "editor")
  );

  function badgeClasses(color: UserBadge["color"]) {
    if (color === "red") {
      return "bg-vea-accent text-white border-vea-accent";
    }
    if (color === "blue") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    return "bg-vea-bg text-vea-text-muted border-vea-border";
  }

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* ===== HEADER =====
            Badge "Espace membre" (categorisation page) + "Salut [Prenom]"
            + email en mono (sobre, identifie le compte connecte)
            + badges cumulatifs (Dirigeant + Joueur, ou Benevole + Joueur, etc.) */}
        <div className="mb-10">
          <span className="badge-red mb-4 inline-block">Espace membre</span>
          <h1 className="text-3xl sm:text-4xl font-black text-vea-text mb-1 mt-2">
            Salut <span className="text-vea-accent">{displayName}</span>
          </h1>
          <p className="text-sm text-vea-text-muted mb-4 font-mono">
            {user.email}
          </p>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b.label}
                className={`text-xs uppercase tracking-widest font-bold px-3 py-1 rounded-full border ${badgeClasses(
                  b.color
                )}`}
              >
                {b.label}
              </span>
            ))}
          </div>
        </div>

        {/* ===== ACCES SELON ROLE ===== */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-vea-text mb-6">Tes accès</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bouton Admin VEA — visible si scope vea editor+ */}
            {hasVeaAccess && (
              <div className="card-clean p-6 border-l-4 border-l-vea-accent">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-vea-text">
                    Espace admin VEA
                  </h3>
                  <span className="text-[10px] uppercase tracking-widest bg-vea-accent text-white px-2 py-0.5 rounded font-bold">
                    Admin
                  </span>
                </div>
                <p className="text-sm text-vea-text-muted leading-relaxed mb-4">
                  Crée des events, gère les participants, exporte les rapports
                  d&apos;impact pour les subventions.
                </p>
                <Link href="/admin" className="btn-primary text-sm">
                  Accéder à /admin
                </Link>
              </div>
            )}

            {/* Page joueur — annuaire public des membres VEA.
                Remplace l'ancienne card "Arena Beta" qui faisait doublon avec
                la Navbar. Arena reste un teaser ailleurs ; ici on pousse vers
                /joueurs qui est la VRAIE page communaute. */}
            <div className="card-clean p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-vea-text">
                  Page joueur
                </h3>
                <span className="text-[10px] uppercase tracking-widest bg-vea-accent-soft border border-vea-accent/20 text-vea-accent px-2 py-0.5 rounded font-bold">
                  Communauté
                </span>
              </div>
              <p className="text-sm text-vea-text-muted leading-relaxed mb-4">
                Découvre les autres joueurs VEA : leur pseudo, leur jeu préféré
                et leur niveau. Une section Arena y sera intégrée prochainement
                pour suivre la progression de toute la communaute.
              </p>
              <Link href="/joueurs" className="btn-outline text-sm">
                Voir les joueurs
              </Link>
            </div>
          </div>
        </section>

        {/* ===== EDITION PROFIL JOUEUR =====
            Form pour personnaliser son profil public : pseudo, jeu favori,
            bio, avatar URL et toggle is_public. Submit via Server Action
            updateProfileAction qui upsert dans vea.participants. */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-vea-text mb-6">
            Mon profil
          </h2>
          <ProfileEditForm
            initialPseudo={participant?.pseudo ?? ""}
            initialJeuPrefere={participant?.jeu_prefere ?? ""}
            initialBio={participant?.bio ?? ""}
            initialAvatarUrl={participant?.avatar_url ?? ""}
            initialIsPublic={participant?.is_public ?? false}
            initialExternalLinks={
              Array.isArray(participant?.external_links)
                ? participant.external_links
                : []
            }
          />
        </section>

        {/* ===== STATS — Ta progression =====
            Dashboard interactif avec dropdown saison (2026/27 par defaut + Old VEA).
            4 cards qui changent par saison : Events / Heures / Niveau VEA / Niveau Arena.
            Liste des events marquants de la saison selectionnee en dessous.
            La section "Tes participations" precedente est integree dans ce dashboard. */}
        <ProgressionDashboard
          eventsOld={eventsOld}
          eventsCurrent={eventsCurrent}
          heuresBenevolatCurrent={heuresBenevolatCurrent}
          heuresBenevolatOld={heuresBenevolatOld}
          xpCurrent={xpTotal}
        />

        {/* Toggle notifs events (19/05/2026) — chaque user peut activer/desactiver
            les notifs auto a chaque nouvel event cree par les admins. */}
        <NotifToggle
          initialValue={Boolean(participant?.notif_events_active)}
        />

        {/* ===== XP BAR =====
            Barre de progression XP de la saison en cours.
            Saison 1 "L'Eveil" = 2026/27, Saison 2 "L'Ascension" = 2027/28.
            Formule niveau : niv N->N+1 = 50*N XP, cumul niv 10 = 2250 XP. */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-vea-text mb-4">
            Saison de {saisonNom}{" "}
            <span className="text-vea-text-dim font-normal">
              ({saisonActuelle})
            </span>
          </h2>
          <XpBar xpTotal={xpTotal} saisonNom={saisonNom} />
        </section>

        {/* ===== DOTATIONS A RECLAMER =====
            Visible uniquement si l'user a des recompenses en attente.
            Les fondateurs (Old VEA) peuvent recevoir un Coffret Fondateur attribue
            manuellement par les admins. */}
        <DotationsSection dotations={dotations} />

        {/* ===== MES TOURNOIS =====
            20/05/2026 : section qui liste les competitions ou ce user a represente VEA.
            Distinct du systeme events terrain : pas d'XP civique, juste palmares.
            Le composant se masque tout seul si participations vide. */}
        <TournoisSection participations={participations} isAdmin={hasVeaAccess} />

        {/* ===== BADGES (vitrine 3 + grille complete avec verrous) =====
            Affiche TOUS les badges du catalogue. Les debloques sont en couleur
            (cliquables pour vitrine), les verrouilles sont grises avec la
            condition pour debloquer. La vitrine accepte 3 badges max. */}
        <BadgesSection
          allBadges={allBadges}
          unlockedSlugs={unlockedSlugs}
          initialShowcaseSlugs={showcaseSlugs}
        />
      </div>
    </div>
  );
}
