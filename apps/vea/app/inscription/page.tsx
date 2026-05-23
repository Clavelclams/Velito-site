/**
 * Page /inscription
 *
 * - SANS ?event=  : redirige vers /signup (creation de compte membre) — comportement historique.
 * - AVEC ?event=<slug> : flow PREVISIONNEL ("monde attendu") pour un evenement a venir.
 *     Connecte -> 1 clic "Je serai present" / "Je ne viens plus".
 *     Non connecte -> mini formulaire (prenom, nom, telephone). AUCUN XP.
 *   Le jour J, la presence reelle + l'XP se font via le scan QR (/scan/[token]).
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PreinscriptionFlow from "./PreinscriptionFlow";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ event?: string }>;
}

export default async function InscriptionPage({ searchParams }: PageProps) {
  const { event } = await searchParams;

  // Pas d'event cible -> inscription "membre" classique (compte).
  if (!event) redirect("/signup");

  const supabase = await createClient();

  const { data: ev } = await supabase
    .schema("vea")
    .from("evenements")
    .select("nom, event_slug, date, statut")
    .eq("event_slug", event)
    .maybeSingle();

  // Event inconnu ou annule -> on bascule sur la creation de compte.
  if (!ev || ev.statut === "annule") redirect("/signup");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let mode: "connected" | "guest" = "guest";
  let initialIn = false;

  if (user) {
    mode = "connected";
    const { data: p } = await supabase
      .schema("vea")
      .from("participants")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (p?.id) {
      const { data: existing } = await supabase
        .schema("vea")
        .from("preinscriptions_event")
        .select("id")
        .eq("event_slug", event)
        .eq("participant_id", p.id)
        .maybeSingle();
      initialIn = !!existing;
    }
  }

  const dateLabel = ev.date
    ? new Date(ev.date).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <section className="hero-bg pt-28 pb-20 px-4 min-h-screen">
      <div className="max-w-xl mx-auto">
        <span className="kicker mb-3 block">Je compte venir</span>
        <h1 className="text-3xl sm:text-4xl font-black text-vea-text leading-tight mb-2">
          S&apos;inscrire à <span className="text-vea-accent">{ev.nom}</span>
        </h1>
        {dateLabel && (
          <p className="text-sm text-vea-text-muted mb-8">{dateLabel}</p>
        )}

        <PreinscriptionFlow
          eventSlug={ev.event_slug}
          eventNom={ev.nom}
          mode={mode}
          initialIn={initialIn}
        />

        <p className="text-xs text-vea-text-dim mt-6 leading-relaxed">
          Le prévisionnel aide l&apos;équipe à s&apos;organiser. Tes points VEA, eux,
          se gagnent uniquement le jour de l&apos;événement en scannant le QR sur place.
        </p>
      </div>
    </section>
  );
}
