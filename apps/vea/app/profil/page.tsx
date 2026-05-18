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

function computeUserBadges(perms: UserPermission[]): UserBadge[] {
  if (perms.length === 0) {
    return [
      {
        label: "Joueur",
        color: "neutral",
        description: "Membre de la communaute VEA. Acces a ton profil et a Arena (bientot).",
      },
    ];
  }

  const orgsByScope: Record<string, string[]> = { owner: [], editor: [], viewer: [] };
  perms.forEach((p) => {
    const slug = p.organizations?.slug ?? "?";
    orgsByScope[p.scope].push(slug);
  });

  const allOwnerSlugs = orgsByScope.owner ?? [];
  const isSuperadmin =
    allOwnerSlugs.includes("vea") &&
    allOwnerSlugs.includes("hub_velito");

  const badges: UserBadge[] = [];
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

  if (badges.length === 0) {
    badges.push({
      label: "Joueur",
      color: "neutral",
      description: "Membre de la communaute VEA.",
    });
  }
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
  const badges = computeUserBadges(perms);

  const displayName = profile?.prenom
    ? `${profile.prenom}`
    : user.email?.split("@")[0] ?? "Membre";

  // Determinations pour le panneau Acces
  const hasVeaAccess = perms.some(
    (p) =>
      p.organizations?.slug === "vea" &&
      (p.scope === "owner" || p.scope === "editor")
  );

  const presences: never[] = [];
  const totalEvents = presences.length;

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
        {/* ===== HEADER ===== */}
        <div className="mb-10">
          <span className="badge-red mb-4 inline-block">Espace membre</span>
          <h1 className="text-3xl sm:text-4xl font-black text-vea-text mb-2">
            Salut <span className="text-vea-accent">{displayName}</span>
          </h1>
          <p className="text-sm text-vea-text-muted">
            Connecte avec <span className="font-mono">{user.email}</span>{" "}
            {profile?.created_at &&
              `· Compte cree le ${new Date(profile.created_at).toLocaleDateString("fr-FR")}`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
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
          <h2 className="text-xl font-bold text-vea-text mb-6">Tes acces</h2>

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
                  Cree des events, gere les participants, exporte les rapports
                  d&apos;impact pour les subventions.
                </p>
                <Link href="/admin" className="btn-primary text-sm">
                  Acceder a /admin
                </Link>
              </div>
            )}

            {/* Bouton Arena -- visible pour tous (joueur ou admin) */}
            <div className="card-clean p-6 opacity-90">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-vea-text">
                  {hasVeaAccess ? "Espace joueur (Arena)" : "Espace joueur"}
                </h3>
                <span className="text-[10px] uppercase tracking-widest bg-vea-bg border border-vea-border text-vea-text-dim px-2 py-0.5 rounded">
                  Bientot
                </span>
              </div>
              <p className="text-sm text-vea-text-muted leading-relaxed mb-4">
                {hasVeaAccess
                  ? "Vue joueur : voir tes events, ta progression, tes badges. L'app Arena partagera ce compte."
                  : "Suis ta progression, debloque des badges, retrouve tes events. Arena fera le lien entre VEA et l'app gamers."}
              </p>
              <Link href="/arena" className="btn-outline text-sm">
                Aller sur Arena
              </Link>
            </div>
          </div>
        </section>

        {/* ===== STATS ===== */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-vea-text mb-6">
            Ta progression
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-clean p-6 text-center">
              <p className="text-3xl font-black text-vea-accent leading-none mb-2">
                {totalEvents}
              </p>
              <p className="text-xs text-vea-text-dim uppercase tracking-wider font-medium">
                Events participes
              </p>
            </div>
            <div className="card-clean p-6 text-center">
              <p className="text-3xl font-black text-vea-accent leading-none mb-2">
                —
              </p>
              <p className="text-xs text-vea-text-dim uppercase tracking-wider font-medium">
                Niveau
              </p>
              <p className="text-[10px] text-vea-text-dim mt-1 italic">
                Active avec Arena
              </p>
            </div>
            <div className="card-clean p-6 text-center">
              <p className="text-3xl font-black text-vea-accent leading-none mb-2">
                —
              </p>
              <p className="text-xs text-vea-text-dim uppercase tracking-wider font-medium">
                Badges debloques
              </p>
              <p className="text-[10px] text-vea-text-dim mt-1 italic">
                Active avec Arena
              </p>
            </div>
          </div>
        </section>

        {/* ===== PRESENCES ===== */}
        <section>
          <h2 className="text-xl font-bold text-vea-text mb-6">
            Tes participations
          </h2>
          <div className="card-clean p-10 text-center">
            <p className="text-vea-text-muted text-sm mb-2">
              Tu n&apos;as pas encore participe a un event sous ce compte.
            </p>
            <p className="text-vea-text-dim text-xs mb-6">
              Tes presences seront automatiquement listees ici quand tu
              scanneras un QR code lors d&apos;un event VEA.
            </p>
            <Link href="/agenda" className="btn-primary">
              Decouvrir l&apos;agenda
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
