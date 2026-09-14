/**
 * sitemap.xml — généré à la demande à partir de la base.
 *
 * Ce qu'on y met : les pages fixes, les fiches jeux, les tournois publiés et
 * les profils joueurs PUBLICS. Ce qu'on n'y met pas : les brouillons (la RLS
 * ne les renvoie de toute façon pas au client anonyme), les profils
 * restreints (mineurs) et les joueurs anonymisés — un moteur de recherche ne
 * doit pas indexer ce que la page elle-même refuse de lister.
 *
 * Client anonyme → RLS → seules les colonnes publiques de joueurs
 * (migration 009). Si la base est injoignable, le sitemap se limite aux pages
 * fixes plutôt que de renvoyer une 500 : un sitemap partiel vaut mieux
 * qu'un sitemap absent.
 */
import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { DISCIPLINES } from "@/lib/arena/disciplines";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arena.velito.fr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/classement`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/reglement`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/prevention`, changeFrequency: "monthly", priority: 0.3 },
    ...DISCIPLINES.map((d) => ({
      url: `${BASE}/jeux/${d.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];

  try {
    const supabase = await createClient();
    const [{ data: tournois }, { data: joueurs }] = await Promise.all([
      supabase
        .schema("arena")
        .from("tournois")
        .select("qr_token, created_at, statut")
        .neq("statut", "BROUILLON")
        .order("date_debut", { ascending: false })
        .limit(500),
      supabase
        .schema("arena")
        .from("joueurs")
        .select("pseudo, created_at")
        .eq("profil_public", true)
        .eq("anonymise", false)
        .limit(2000),
    ]);

    const pagesTournois: MetadataRoute.Sitemap = ((tournois ?? []) as {
      qr_token: string;
      created_at: string;
      statut: string;
    }[]).map((t) => ({
      url: `${BASE}/t/${t.qr_token}`,
      lastModified: t.created_at,
      changeFrequency: t.statut === "EN_COURS" ? "hourly" : "monthly",
      priority: t.statut === "TERMINE" ? 0.5 : 0.7,
    }));

    const pagesJoueurs: MetadataRoute.Sitemap = ((joueurs ?? []) as {
      pseudo: string;
      created_at: string;
    }[]).map((j) => ({
      url: `${BASE}/joueurs/${encodeURIComponent(j.pseudo)}`,
      lastModified: j.created_at,
      changeFrequency: "weekly",
      priority: 0.4,
    }));

    return [...fixes, ...pagesTournois, ...pagesJoueurs];
  } catch {
    return fixes;
  }
}
