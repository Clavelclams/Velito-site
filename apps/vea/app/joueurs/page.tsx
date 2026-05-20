/**
 * Page /joueurs — Annuaire des joueurs VEA (V1 minimaliste).
 *
 * 20/05/2026 : page passe en PUBLIQUE. Decision Clavel : visibilite asso + SEO
 * + credibilite pour dossiers de subvention. Le visiteur non connecte voit la
 * liste des profils opt-in (is_public=true), avec un bandeau d'invitation a
 * s'inscrire pour acceder aux details (equipes, coequipiers, tournois detailles).
 *
 * RGPD : les mineurs (est_mineur=true) sont anonymises (prenom + initiale).
 * Le opt-in is_public par defaut FALSE -> aucun profil ne s'affiche sans accord
 * explicite du membre (toggle dans /profil).
 *
 * DA : style gaming sobre (cards avec accent rouge, jeu prefere en exergue,
 * pseudo et avatar). Pas overdrive, on garde la coherence visuelle du site.
 *
 * V2 (plus tard) :
 *  - Filtrage par jeu favori
 *  - Stats joueur (events participes, rang Arena)
 *  - Lien vers profil public detaille /joueurs/[pseudo]
 *  - Recherche par pseudo
 *  - Section tournois online (lecture vea.tournois + tournoi_participants)
 *  - Section equipes (vea.equipes) accessible aux connectes uniquement
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getConstructionUrl } from "@/lib/hub-url";
// Note : on n'utilise PAS next/image ici parce que les avatars peuvent venir
// d'URLs externes variees (Imgur, Discord, Twitch, etc.) que next/image
// rejette par defaut si pas whiteliste dans next.config.js. Un <img> standard
// gere n'importe quel host sans config.

interface ExternalLink {
  label: string;
  url: string;
}

interface ShowcaseBadge {
  slug: string;
  nom: string;
  emoji: string;
  rare: boolean;
}

interface PublicPlayer {
  id: string;
  prenom: string;
  nom: string;
  pseudo: string | null;
  jeu_prefere: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: string;
  external_links: ExternalLink[] | null;
  showcase_badges: ShowcaseBadge[];
}

export default async function JoueursPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 20/05/2026 : page passee en publique. On capture juste l'etat de connexion
  // pour afficher ou cacher les sections detaillees (equipes, tournois detaille).
  const isLoggedIn = user !== null;

  // Lecture des profils publics uniquement (policy RLS verifie aussi)
  const { data: playersRaw } = await supabase
    .schema("vea")
    .from("participants")
    .select(
      "id, prenom, nom, pseudo, jeu_prefere, bio, avatar_url, role, external_links"
    )
    .eq("is_public", true)
    .order("role", { ascending: true })
    .order("nom", { ascending: true });

  const playersBase = (playersRaw ?? []) as Omit<PublicPlayer, "showcase_badges">[];

  // === Fetch badges en vitrine pour tous les joueurs visibles en 1 query ===
  // On groupe ensuite cote front par participant_id (au lieu de N+1 queries).
  // RLS sur badges_joueurs autorise lecture si is_public=true OU c'est le user :
  // ici tous les players ont is_public=true donc OK.
  const playerIds = playersBase.map((p) => p.id);
  const { data: badgesRaw } = playerIds.length > 0
    ? await supabase
        .schema("vea")
        .from("badges_joueurs")
        .select("participant_id, badges(slug, nom, emoji, rare)")
        .eq("affiche_sur_profil", true)
        .in("participant_id", playerIds)
    : { data: [] };

  type BadgeRow = {
    participant_id: string;
    badges: { slug: string; nom: string; emoji: string; rare: boolean } | null;
  };
  const badgesByParticipant = new Map<string, ShowcaseBadge[]>();
  for (const row of (badgesRaw ?? []) as unknown as BadgeRow[]) {
    if (!row.badges) continue;
    const list = badgesByParticipant.get(row.participant_id) ?? [];
    list.push({
      slug: row.badges.slug,
      nom: row.badges.nom,
      emoji: row.badges.emoji,
      rare: row.badges.rare,
    });
    badgesByParticipant.set(row.participant_id, list);
  }

  // Combine base + showcase_badges
  const players: PublicPlayer[] = playersBase.map((p) => ({
    ...p,
    showcase_badges: badgesByParticipant.get(p.id) ?? [],
  }));

  // === Tournois recents publics (lecture vea.tournois) ===
  // 20/05/2026 : visible pour TOUS (lecture RLS publique). Sert a montrer
  // que l'asso a une activite competitive en ligne, meme aux non-connectes.
  type TournoiRow = {
    id: string;
    nom: string;
    jeu: string;
    date_debut: string;
    mode: string;
    resultat: string | null;
    representation_vea: boolean;
  };
  const { data: tournoisRaw } = await supabase
    .schema("vea")
    .from("tournois")
    .select("id, nom, jeu, date_debut, mode, resultat, representation_vea")
    .eq("representation_vea", true)
    .order("date_debut", { ascending: false })
    .limit(6);
  const tournoisRecents = (tournoisRaw ?? []) as TournoiRow[];

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* HERO */}
        <div className="text-center mb-12">
          <span className="badge-red mb-4 inline-block">Communaute</span>
          <h1 className="text-3xl sm:text-4xl font-black text-vea-text mb-3">
            Les <span className="text-vea-accent">joueurs</span> VEA
          </h1>
          <p className="text-sm text-vea-text-muted max-w-2xl mx-auto leading-relaxed">
            Les membres qui ont choisi de partager leur profil avec la
            communaute. Par defaut, ton profil est{" "}
            <strong className="text-vea-text">prive</strong> — tu peux le
            rendre public depuis{" "}
            <Link href="/profil" className="text-vea-accent hover:underline">
              ton profil
            </Link>
            .
          </p>
        </div>

        {/* BANDEAU INVITATION (visiteur non connecte uniquement) */}
        {/* 20/05/2026 : page /joueurs passee en publique. Ce bandeau invite a
            s'inscrire pour acceder aux details (equipes, coequipiers, tournois
            detailles). Visible UNIQUEMENT si l'user n'est pas connecte. */}
        {!isLoggedIn && (
          <div className="card-clean p-5 mb-10 max-w-3xl mx-auto border border-vea-accent/20 bg-vea-accent-soft/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-bold text-vea-text mb-1">
                  Tu veux voir les equipes et les coequipiers ?
                </p>
                <p className="text-xs text-vea-text-muted leading-relaxed">
                  Cree ton compte pour acceder aux details de chaque joueur,
                  voir avec qui ils jouent en tournoi, et rejoindre la
                  communaute.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href="/signup" className="btn-primary text-xs">
                  Cree mon compte
                </Link>
                <Link
                  href="/login"
                  className="text-xs px-4 py-2 rounded-full border border-vea-accent/30 text-vea-accent font-bold uppercase tracking-widest hover:bg-vea-accent hover:text-white transition-colors"
                >
                  Connexion
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* LISTE JOUEURS */}
        {players.length === 0 ? (
          <div className="card-clean p-10 text-center max-w-2xl mx-auto">
            <span className="text-4xl mb-4 block">🎮</span>
            <h2 className="text-xl font-bold text-vea-text mb-2">
              Aucun profil public pour le moment
            </h2>
            <p className="text-sm text-vea-text-muted mb-6">
              Sois le premier a rendre ton profil visible ! Va sur ton profil
              et active l&apos;option &laquo; Profil public &raquo;.
            </p>
            <Link href="/profil" className="btn-primary">
              Aller sur mon profil
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((p) => (
              <PlayerCard key={p.id} player={p} />
            ))}
          </div>
        )}

        {/* SECTION TOURNOIS RECENTS (lecture publique vea.tournois) */}
        {tournoisRecents.length > 0 && (
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-vea-text mb-2">
                Tournois <span className="text-vea-accent">VEA</span> recents
              </h2>
              <p className="text-xs text-vea-text-muted">
                Competitions ou des membres ont represente l&apos;asso
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tournoisRecents.map((t) => (
                <div key={t.id} className="card-clean p-4">
                  <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-vea-accent-soft text-vea-accent">
                      {t.jeu}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-vea-text-dim">
                      {t.mode === "online" ? "En ligne" : t.mode === "presentiel" ? "Presentiel" : "Hybride"}
                    </span>
                    {t.resultat === "champion" && (
                      <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                        Champion
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-vea-text leading-tight">{t.nom}</p>
                  <p className="text-xs text-vea-text-muted mt-1">
                    {new Date(t.date_debut).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
            {!isLoggedIn && (
              <p className="text-center text-xs text-vea-text-muted mt-4 italic">
                Connecte-toi pour voir les coequipiers de chaque tournoi.
              </p>
            )}
          </div>
        )}

        {/* TEASER ARENA */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="card-clean p-6 sm:p-8 opacity-90">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-vea-text">
                Vue gaming plus poussee a venir
              </h3>
              <span className="text-[10px] uppercase tracking-widest bg-vea-accent-soft border border-vea-accent/20 text-vea-accent px-2 py-0.5 rounded">
                Arena bientot
              </span>
            </div>
            <p className="text-sm text-vea-text-muted leading-relaxed">
              Quand l&apos;app{" "}
              {/* 19/05/2026 : URL dynamique via getConstructionUrl (cf lib/hub-url.ts)
                  -> localhost:3000 en dev, velito.com en prod. */}
              <a
                href={getConstructionUrl("arena")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-vea-accent hover:underline font-semibold"
              >
                Arena
              </a>{" "}
              sera deployee, cette page affichera aussi les stats par jeu, les
              classements internes, les challenges entre membres et les badges
              debloques.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ player }: { player: PublicPlayer }) {
  const displayName = player.pseudo || `${player.prenom} ${player.nom[0]}.`;
  const roleBadge = roleBadgeText(player.role);

  return (
    <div className="card-clean p-5 flex flex-col items-center text-center hover:shadow-card-hover transition-shadow">
      <div className="w-20 h-20 rounded-full bg-vea-accent-soft border-2 border-vea-accent/20 mb-3 flex items-center justify-center overflow-hidden">
        {player.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.avatar_url}
            alt={`Avatar de ${displayName}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          // Placeholder : initiale rouge
          <span className="text-3xl font-black text-vea-accent">
            {player.prenom[0]?.toUpperCase() ?? "?"}
          </span>
        )}
      </div>

      <h3 className="text-base font-bold text-vea-text mb-1 leading-tight">
        {displayName}
      </h3>

      {roleBadge && (
        <span
          className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${roleBadge.classes} mb-2`}
        >
          {roleBadge.label}
        </span>
      )}

      {player.jeu_prefere && (
        <p className="text-xs text-vea-text-muted mt-1">
          <span className="text-vea-text-dim">Jeu favori :</span>{" "}
          <strong className="text-vea-text">{player.jeu_prefere}</strong>
        </p>
      )}

      {player.bio && (
        <p className="text-xs text-vea-text-muted mt-3 italic leading-relaxed line-clamp-3">
          &laquo; {player.bio} &raquo;
        </p>
      )}

      {/* VITRINE BADGES — 3 max selectionnes par l'user dans /profil.
          Les badges rares (Avant-Garde, Legendes) ont une bordure doree.
          Cumulables : Maya peut avoir Vague + Etincelle + Piliers en vitrine. */}
      {player.showcase_badges.length > 0 && (
        <div className="mt-4 pt-3 border-t border-vea-border w-full">
          <p className="text-[9px] uppercase tracking-widest font-bold text-vea-text-dim mb-2 text-center">
            Badges
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {player.showcase_badges.map((badge) => (
              <div
                key={badge.slug}
                title={badge.nom}
                className={`flex flex-col items-center text-center rounded-lg px-2 py-1.5 border ${
                  badge.rare
                    ? "border-amber-400 bg-amber-50 shadow-sm"
                    : "border-vea-border bg-white"
                }`}
              >
                <span className="text-xl leading-none mb-0.5" aria-hidden="true">
                  {badge.emoji}
                </span>
                <span className="text-[9px] text-vea-text-muted leading-tight max-w-[80px] truncate">
                  {badge.nom}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liens externes (Discord, Twitch, etc.) — affiches en bas de la card.
          Cliquables, ouvrent dans nouvel onglet avec rel=noopener (securite). */}
      {Array.isArray(player.external_links) && player.external_links.length > 0 && (
        <div className="mt-4 pt-3 border-t border-vea-border w-full flex flex-wrap justify-center gap-1.5">
          {player.external_links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border border-vea-accent/30 text-vea-accent hover:bg-vea-accent hover:text-white transition-colors"
              title={link.url}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function roleBadgeText(role: string): { label: string; classes: string } | null {
  // Cote PUBLIC (/joueurs), on simplifie : superadmin et dirigeant -> "Dirigeant"
  // La distinction superadmin reste interne (permissions applicatives /admin).
  // Plus sobre pour les visiteurs externes que de leur balancer "SUPERADMIN".
  if (role === "superadmin" || role === "dirigeant") {
    return { label: "Dirigeant", classes: "bg-vea-accent text-white border-vea-accent" };
  }
  if (role === "benevole") {
    return { label: "Benevole", classes: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  return null; // pas de badge pour les joueurs simples
}
