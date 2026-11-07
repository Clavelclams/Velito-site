/**
 * /projets/nouveau — Création d'un projet (admin hub seulement, 07/11/2026).
 * Formulaire HTML simple + server action : fonctionne même sans JavaScript.
 * La base refuse la création à quiconque n'est pas admin (RLS).
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { creerProjetAction } from "../actions";

export const dynamic = "force-dynamic";

const ERREURS: Record<string, string> = {
  nom: "Le nom est obligatoire.",
  doublon: "Un projet porte déjà ce nom ou cette adresse.",
  droits: "Création refusée : seul l'admin du hub crée des projets.",
};

export default async function NouveauProjetPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?return=/projets/nouveau");
  const { data: estAdmin } = await supabase.schema("shared").rpc("est_admin_hub");
  if (estAdmin !== true) redirect("/projets");

  const champ = "w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-[#a78bfa]";

  return (
    <main className="min-h-screen bg-[#04040e] text-white pt-[110px] pb-20 px-4">
      <div className="max-w-xl mx-auto">
        <Link href="/projets" className="text-sm text-white/50 hover:text-white">← Projets</Link>
        <h1 className="font-[Orbitron] text-3xl font-black mt-3 mb-6">Nouveau projet</h1>
        {erreur && ERREURS[erreur] && (
          <p className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{ERREURS[erreur]}</p>
        )}
        <form action={creerProjetAction} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <label className="block">
            <span className="mb-1 block text-sm text-white/70">Nom</span>
            <input name="nom" required maxLength={80} className={champ} placeholder="ex. Venaball Club" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-white/70">Adresse (optionnel)</span>
            <input name="slug" maxLength={60} className={champ} placeholder="déduite du nom si vide" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-white/70">Résumé</span>
            <textarea name="resume" maxLength={500} rows={3} className={champ} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-white/70">Stack</span>
            <input name="stack" maxLength={200} className={champ} placeholder="ex. Expo SDK 54, Symfony 7.4" />
          </label>
          <button type="submit" className="rounded-full bg-white text-[#04040e] px-5 py-2 text-sm font-medium hover:bg-white/90">
            Créer le projet
          </button>
        </form>
      </div>
    </main>
  );
}
