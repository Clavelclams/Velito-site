/**
 * Export CSV de la liste des factures et avoirs (GET, 09/11/2026), avec les
 * mêmes filtres que la page (?statut=…&exercice=…&client=…).
 *
 * Même principe que budgets/comparaison/csv : on renvoie un FICHIER. La RLS
 * filtre par structure ; une structure inconnue répond 404 neutre.
 */
import { createClient } from "@/lib/supabase/server";
import { getEntite } from "@/lib/repositories/entites";
import { listerClients, listerFactures, listerLignesFactureEntite, listerPaiementsEntite } from "@/lib/repositories/facturation";
import { nomFichierExport } from "@/lib/services/export";
import {
  avoirsParFacture,
  encaissementsParFacture,
  filtrerFactures,
  genererCsvFactures,
  resteAEncaisser,
  statutFacture,
  totauxFacture,
} from "@/lib/services/facturation";
import type { LigneFacture } from "@/types/facturation";

export async function GET(request: Request, { params }: { params: Promise<{ entiteId: string }> }) {
  const { entiteId } = await params;
  const supabase = await createClient();
  const entite = await getEntite(supabase, entiteId);
  if (!entite) {
    return new Response("Entité introuvable.", { status: 404 });
  }
  const url = new URL(request.url);
  const filtre = {
    statut: url.searchParams.get("statut") ?? "",
    exercice: url.searchParams.get("exercice") ?? "",
    clientId: url.searchParams.get("client") ?? "",
  };

  const [factures, lignes, paiements, clients] = await Promise.all([
    listerFactures(supabase, entiteId),
    listerLignesFactureEntite(supabase, entiteId),
    listerPaiementsEntite(supabase, entiteId),
    listerClients(supabase, entiteId),
  ]);
  const parFacture = new Map<string, LigneFacture[]>();
  for (const l of lignes) parFacture.set(l.facture_id, [...(parFacture.get(l.facture_id) ?? []), l]);
  const encaisse = encaissementsParFacture(paiements);
  const avoirs = avoirsParFacture(factures);
  const nomClient = new Map(clients.map((c) => [c.id, c.nom]));

  const enrichies = factures.map((f) => ({ ...f, statutAffiche: statutFacture(f, encaisse.get(f.id) ?? 0, avoirs.get(f.id) ?? 0) }));
  const csv =
    "﻿" +
    genererCsvFactures(
      filtrerFactures(enrichies, filtre).map((f) => {
        const t = totauxFacture(f, parFacture.get(f.id) ?? []);
        const e = encaisse.get(f.id) ?? 0;
        return {
          numero: f.numero,
          sens: f.sens,
          dateEmission: f.date_emission,
          client: f.statut === "emise" && f.acheteur ? f.acheteur.nom : (nomClient.get(f.client_id) ?? ""),
          statut: f.statutAffiche,
          htCentimes: t.totalHtCentimes,
          tvaCentimes: t.totalTvaCentimes,
          ttcCentimes: t.totalTtcCentimes,
          encaisseCentimes: e,
          resteCentimes: resteAEncaisser(f, e, avoirs.get(f.id) ?? 0),
          echeance: f.date_echeance,
        };
      }),
    );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichierExport(entite.nom).replace(/^compta_/, "factures_")}"`,
      "Cache-Control": "no-store",
    },
  });
}
