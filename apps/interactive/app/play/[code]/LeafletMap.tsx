/**
 * <LeafletMap /> — Carte interactive utilisée par le joueur côté téléphone pour
 * placer un pin (jeu Géo).
 *
 * Pourquoi un composant séparé :
 *  - Leaflet utilise window/document → impossible à rendre en SSR
 *  - On l'isole dans un Client Component pour permettre `dynamic({ ssr: false })`
 *  - Le CSS Leaflet est importé via le bundler côté client uniquement
 *
 * Usage :
 *   <LeafletMap
 *     initialCenter={[46.7, 2.5]}
 *     initialZoom={5}
 *     pinPosition={pin}
 *     onPinChange={(latlng) => setPin(latlng)}
 *   />
 */
"use client";

import { useEffect, useRef } from "react";
import type * as L from "leaflet";

interface LeafletMapProps {
  initialCenter: [number, number];
  initialZoom: number;
  pinPosition: [number, number] | null;
  onPinChange: (latlng: [number, number]) => void;
  /** Mode lecture seule (reveal) — pas de clic, juste affichage. */
  readonly?: boolean;
  /** Marqueurs additionnels à afficher (ex: vraie cible au reveal + pins des autres joueurs). */
  extraMarkers?: Array<{
    lat: number;
    lng: number;
    label?: string;
    color?: string; // hex
    /**
     * true = étiquette affichée EN PERMANENCE (pas seulement au survol).
     * Indispensable sur une TV : personne ne "survole" un écran de télé
     * (fix reveal Pin point, playtest 07/2026).
     */
    labelPermanent?: boolean;
  }>;
}

export default function LeafletMap({
  initialCenter,
  initialZoom,
  pinPosition,
  onPinChange,
  readonly = false,
  extraMarkers = [],
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinRef = useRef<L.Marker | null>(null);
  const extraLayerRef = useRef<L.LayerGroup | null>(null);

  // Init carte au mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      // Import dynamique côté client uniquement
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: true,
        attributionControl: false,
      });

      // Tuiles CartoDB "Voyager No Labels" — épurées SANS noms de villes/pays
      // (l'intérêt du jeu c'est de chercher sans avoir la réponse écrite).
      // Gratuit, pas d'API key. Fallback OSM si CARTO down.
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 18,
          minZoom: 2,
          subdomains: "abcd",
        }
      ).addTo(map);

      // Layer pour les marqueurs extras
      const extraLayer = L.layerGroup().addTo(map);
      extraLayerRef.current = extraLayer;

      // Clic sur la carte → place/déplace le pin (sauf si readonly)
      if (!readonly) {
        map.on("click", (e) => {
          onPinChange([e.latlng.lat, e.latlng.lng]);
        });
      }

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        pinRef.current = null;
        extraLayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Met à jour le pin du joueur quand pinPosition change
  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapRef.current) return;

      // Retire l'ancien pin
      if (pinRef.current) {
        pinRef.current.remove();
        pinRef.current = null;
      }

      if (pinPosition) {
        const icon = L.divIcon({
          html: `<div style="background:#22d3ee;border:3px solid #fff;border-radius:50%;width:24px;height:24px;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
          className: "",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        pinRef.current = L.marker(pinPosition, { icon }).addTo(mapRef.current);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pinPosition]);

  // Met à jour les marqueurs extras (reveal)
  useEffect(() => {
    if (!mapRef.current || !extraLayerRef.current) return;
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !extraLayerRef.current) return;

      extraLayerRef.current.clearLayers();

      for (const m of extraMarkers) {
        const color = m.color ?? "#f43f5e";
        const icon = L.divIcon({
          html: `<div style="background:${color};border:3px solid #fff;border-radius:50%;width:20px;height:20px;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
          className: "",
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(extraLayerRef.current);
        if (m.label) {
          marker.bindTooltip(m.label, {
            permanent: m.labelPermanent ?? false,
            direction: "top",
          });
        }
      }

      // FIX reveal Pin point (playtest 07/2026) : recadrer la carte pour que
      // TOUS les pins soient dans le champ. Avant, un placement hors du
      // cadre initial était simplement invisible → "on voit pas les
      // placements effectués".
      if (extraMarkers.length > 0 && mapRef.current) {
        const bounds = L.latLngBounds(
          extraMarkers.map((m) => [m.lat, m.lng] as [number, number])
        );
        mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 10 });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [extraMarkers]);

  return (
    <div
      ref={containerRef}
      className="h-[55vh] w-full overflow-hidden rounded-2xl border border-white/15"
      style={{ minHeight: 320 }}
    />
  );
}
