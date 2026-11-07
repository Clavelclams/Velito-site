/**
 * Dossier d'AG d'une entité : Server Component (07/11/2026).
 *
 * Charge les listes brutes (repository dossier-ag, lecture seule), laisse le
 * service pur construire le dossier, puis passe l'objet au composant
 * d'affichage imprimable. Exercice choisi par ?exercice=AAAA (année civile),
 * par défaut l'année en cours.
 *
 * Accès : le layout a déjà vérifié l'entité ; on la relit ici pour son nom et
 * sa forme juridique (même requête, servie par la RLS).
 */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEntite } from "@/lib/repositories/entites";
import { chargerEntreesDossierAg } from "@/lib/repositories/dossier-ag";
import { listerClotures } from "@/lib/repositories/cloture";
import { construireDossierAg, lireExercice } from "@/lib/services/dossier-ag";
import { DossierAg } from "@/components/DossierAg";

export default async function DossierAgPage({
  params,
  searchParams,
}: {
  params: Promise<{ entiteId: string }>;
  searchParams: Promise<{ exercice?: string | string[] }>;
}) {
  const { entiteId } = await params;
  const { exercice: brut } = await searchParams;
  const supabase = await createClient();

  const entite = await getEntite(supabase, entiteId);
  if (!entite) notFound();

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const exercice = lireExercice(Array.isArray(brut) ? brut[0] : brut, aujourdHui);
  const entrees = await chargerEntreesDossierAg(supabase, entite, exercice, aujourdHui);
  const dossier = construireDossierAg(entrees);

  // [07/11/2026] Exercices proposés : les années qui ont des opérations, plus
  // l'année en cours et l'exercice affiché (même vide), du plus récent au plus ancien.
  const annees = new Set<number>([Number(aujourdHui.slice(0, 4)), exercice]);
  for (const t of entrees.transactions) annees.add(Number(t.date_transaction.slice(0, 4)));
  const exercicesDisponibles = [...annees].sort((a, b) => b - a);

  // [07/11/2026] Clôture active de l'exercice (sql/10) : null = non clôturé.
  // Une clôture rouverte ne compte plus : seul le statut « cloture » vaut clôture.
  const active = (await listerClotures(supabase, entiteId)).find((c) => c.exercice === exercice && c.statut === "cloture");
  const cloture = active ? { cloture_le: active.cloture_le, motif: active.motif } : null;

  return <DossierAg dossier={dossier} entiteId={entiteId} exercicesDisponibles={exercicesDisponibles} cloture={cloture} />;
}
