/**
 * Carte + liste des boîtes (13/11/2026). Composant CLIENT : Leaflet a besoin
 * de `window`, et la géolocalisation ne se fait que dans le navigateur.
 *
 * Choix :
 *  - Fond de carte OpenStreetMap : sans clé, gratuit, attribution affichée
 *    (obligatoire). Pas de CARTO ici : pas besoin d'une carte sans noms, au
 *    contraire, il faut les noms de rues pour trouver la boîte.
 *  - La LISTE est la vraie interface accessible : un lecteur d'écran ou un
 *    clavier y trouve tout ce que montre la carte. La carte est un plus.
 *  - « La plus proche de moi » : la position reste dans le téléphone, elle
 *    sert seulement à trier la liste et centrer la carte. Rien n'est envoyé.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type * as L from "leaflet";
import type { BoitePublique } from "@/lib/livres/types";
import { distanceMetres, formaterDistance, LIBELLE_ETAT, type EtatBoite } from "@/lib/livres/regles";

const COULEUR_ETAT: Record<EtatBoite, string> = {
  bon: "#1F6B4A",
  a_remplir: "#8A5A08",
  abimee: "#A3262A",
  inconnu: "#5E5243",
};
const CENTRE_AMIENS: [number, number] = [49.894, 2.2957];

export default function CarteEtListe({ boites }: { boites: BoitePublique[] }) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<L.Map | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [geoErreur, setGeoErreur] = useState<string | null>(null);
  const [geoEnCours, setGeoEnCours] = useState(false);

  // Carte, une seule fois.
  useEffect(() => {
    if (!conteneur.current || carte.current) return;
    let annule = false;
    (async () => {
      const Lf = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (annule || !conteneur.current) return;
      const m = Lf.map(conteneur.current, { center: CENTRE_AMIENS, zoom: 13, scrollWheelZoom: false });
      Lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">les contributeurs OpenStreetMap</a>',
      }).addTo(m);
      for (const b of boites) {
        const icone = Lf.divIcon({
          className: "",
          html: `<div style="background:${COULEUR_ETAT[b.etat]};width:22px;height:22px;border-radius:6px;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        const lien = document.createElement("a");
        lien.href = `/boite/${b.slug}`;
        lien.textContent = `${b.nom} · ${LIBELLE_ETAT[b.etat]}`;
        lien.style.fontWeight = "600";
        Lf.marker([b.lat, b.lng], { icon: icone, title: b.nom }).addTo(m).bindPopup(lien);
      }
      if (boites.length > 1) {
        m.fitBounds(Lf.latLngBounds(boites.map((b) => [b.lat, b.lng] as [number, number])), { padding: [30, 30], maxZoom: 15 });
      }
      carte.current = m;
    })();
    return () => {
      annule = true;
      carte.current?.remove();
      carte.current = null;
    };
  }, [boites]);

  // Recentre sur moi quand la position arrive.
  useEffect(() => {
    if (position && carte.current) carte.current.setView([position.lat, position.lng], 15);
  }, [position]);

  const triees = useMemo(() => {
    const avecDistance = boites.map((b) => ({ b, d: position ? distanceMetres(position, b) : null }));
    if (position) avecDistance.sort((x, y) => (x.d ?? 0) - (y.d ?? 0));
    return avecDistance;
  }, [boites, position]);

  function trouverLaPlusProche() {
    if (!("geolocation" in navigator)) {
      setGeoErreur("Ton navigateur ne permet pas de trouver ta position.");
      return;
    }
    setGeoEnCours(true);
    setGeoErreur(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGeoEnCours(false);
      },
      () => {
        setGeoErreur("Position refusée ou introuvable. Tu peux chercher sur la carte.");
        setGeoEnCours(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_340px]">
      <div
        ref={conteneur}
        className="h-[55vh] min-h-[320px] w-full overflow-hidden rounded-xl border border-livre-trait md:h-[70vh]"
        role="region"
        aria-label="Carte des boîtes à livres"
      />
      <section aria-labelledby="titre-liste">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="titre-liste" className="text-lg font-bold">
            {boites.length} boîte{boites.length > 1 ? "s" : ""}
          </h2>
          <button
            type="button"
            onClick={trouverLaPlusProche}
            disabled={geoEnCours}
            className="min-h-[44px] rounded-lg bg-livre-vert px-3 py-2 text-sm font-semibold text-white hover:bg-livre-vert-fonce disabled:opacity-60"
          >
            {geoEnCours ? "Recherche…" : "La plus proche de moi"}
          </button>
        </div>
        {geoErreur && <p className="mb-3 text-sm text-livre-abimee">{geoErreur}</p>}
        <ul className="space-y-2">
          {triees.map(({ b, d }) => (
            <li key={b.id}>
              <Link
                href={`/boite/${b.slug}`}
                className="block rounded-lg border border-livre-trait bg-livre-carte px-3 py-2 hover:border-livre-vert"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{b.nom}</span>
                  {d !== null && <span className="shrink-0 text-sm text-livre-doux">{formaterDistance(d)}</span>}
                </span>
                <span className="mt-0.5 flex items-center gap-2 text-sm text-livre-doux">
                  <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: COULEUR_ETAT[b.etat] }} />
                  {LIBELLE_ETAT[b.etat]}
                  {b.quartier ? ` · ${b.quartier}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
