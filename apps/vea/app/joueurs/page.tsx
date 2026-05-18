/**
 * Page /joueurs — Annuaire des joueurs VEA (V1 minimaliste).
 *
 * Accessible UNIQUEMENT aux connectes. Affiche les membres qui ont
 * explicitement rendu leur profil public via /profil (vea.participants.is_public).
 *
 * Par defaut tous les profils sont prives (RGPD opt-in). L'user toggle
 * lui-meme depuis son /profil.
 *
 * DA : style gaming sobre (cards avec accent rouge, jeu prefere en exergue,
 * pseudo et avatar). Pas overdrive, on garde la coherence visuelle du site.
 *
 * V2 (plus tard) :
 *  - Filtrage par jeu favori
 *  - Stats joueur (events participes, rang Arena)
 *  - Lien vers profil public detaille /joueurs/[pseudo]
 *  - Recherche par pseudo
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

interface PublicPlayer {
  id: string;
  prenom: string;
  nom: string;
  pseudo: string | null;
  jeu_prefere: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: string;
}

export default async function JoueursPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/joueurs");
  }

  // Lecture des profils publics uniquement (policy RLS verifie aussi)
  const { data: playersRaw } = await supabase
    .schema("vea")
    .from("participants")
    .select("id, prenom, nom, pseudo, jeu_prefere, bio, avatar_url, role")
    .eq("is_public", true)
    .order("role", { ascending: true })
    .order("nom", { ascending: true });

  const players = (playersRaw ?? []) as PublicPlayer[];

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
              <Link
                href="/arena"
                className="text-vea-accent hover:underline font-semibold"
              >
                Arena
              </Link>{" "}
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
          <Image
            src={player.avatar_url}
            alt={`Avatar de ${displayName}`}
            width={80}
            height={80}
            className="w-full h-full object-cover"
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
    </div>
  );
}

function roleBadgeText(role: string): { label: string; classes: string } | null {
  if (role === "superadmin") {
    return { label: "Superadmin", classes: "bg-vea-accent text-white border-vea-accent" };
  }
  if (role === "dirigeant") {
    return { label: "Dirigeant", classes: "bg-vea-accent text-white border-vea-accent" };
  }
  if (role === "benevole") {
    return { label: "Benevole", classes: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  return null; // pas de badge pour les joueurs simples
}
