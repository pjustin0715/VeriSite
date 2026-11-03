"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import SitePin from "@/components/SitePin";
import { statuses } from "@/components/StatusLabel";
import { DEMO_CENTER } from "@/lib/supabase";
import { loadViewportProjects } from "@/app/verisite/data";
import type { Project } from "@/app/verisite/store";

const box = { west: 120.9, east: 120.99, north: 14.36, south: 14.28 };

const RASTER_FALLBACK_STYLE = {
  version: 8 as const,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

export default function IllustratedMap({
  projects,
  selected,
  onSelect,
  inset,
}: {
  projects: Project[];
  selected?: string;
  onSelect: (id: string) => void;
  inset: { top: string; bottom: string };
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const projectsRef = useRef<Project[]>(projects);
  projectsRef.current = projects;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [mapFailed, setMapFailed] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  function syncGeoJSON(map: MapLibreMap) {
    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: projectsRef.current.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          color: statuses[p.status]?.solid || "#1C86CC",
          reports: p.reportCount,
        },
      })),
    };
    const src = map.getSource("verisite-projects") as GeoJSONSource | undefined;
    if (src) {
      src.setData(geojson);
      return;
    }
    map.addSource("verisite-projects", {
      type: "geojson",
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 40,
    });
    map.addLayer({
      id: "vs-clusters",
      type: "circle",
      source: "verisite-projects",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#1C86CC",
        "circle-radius": 20,
        "circle-stroke-width": 3,
        "circle-stroke-color": "#FFFFFF",
      },
    });
    map.addLayer({
      id: "vs-cluster-count",
      type: "symbol",
      source: "verisite-projects",
      filter: ["has", "point_count"],
      layout: { "text-field": "{point_count_abbreviated}", "text-size": 13 },
      paint: { "text-color": "#FFFFFF" },
    });
    map.addLayer({
      id: "vs-pins",
      type: "circle",
      source: "verisite-projects",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": 13,
        "circle-stroke-width": 3,
        "circle-stroke-color": "#FFFFFF",
      },
    });
    map.on("click", "vs-pins", (e) => {
      const id = e.features?.[0]?.properties?.id;
      if (id) onSelectRef.current(String(id));
    });
    map.on("mouseenter", "vs-pins", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "vs-pins", () => {
      map.getCanvas().style.cursor = "";
    });
    map.on("click", "vs-clusters", (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["vs-clusters"] });
      const clusterId = features[0]?.properties?.cluster_id;
      const source = map.getSource("verisite-projects") as any;
      source?.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err || !features[0]) return;
        const geom = features[0].geometry as GeoJSON.Point;
        map.easeTo({ center: geom.coordinates as [number, number], zoom });
      });
    });
    map.on("mouseenter", "vs-clusters", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "vs-clusters", () => {
      map.getCanvas().style.cursor = "";
    });
  }

  useEffect(() => {
    if (!mapEl.current || mapRef.current || mapFailed) return;
    let isMounted = true;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    import("maplibre-gl")
      .then((maplibregl) => {
        if (!isMounted || !mapEl.current || mapRef.current) return;
        try {
          maplibregl.setWorkerUrl?.("/maplibre-gl-worker.js?v=.cjs");
          const sel = projectsRef.current.find((p) => p.id === selected) ?? projectsRef.current[0];
          const center: [number, number] = sel ? [sel.lng, sel.lat] : [DEMO_CENTER.lng, DEMO_CENTER.lat];
          const map = new maplibregl.Map({
            container: mapEl.current,
            style: "https://tiles.openfreemap.org/styles/liberty",
            center,
            zoom: 15,
            pitch: 45,
            pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
            canvasContextAttributes: { powerPreference: "default" },
          });
          mapRef.current = map;
          requestAnimationFrame(() => map.resize());

          let loaded = false;
          const onReady = () => {
            if (loaded) return;
            loaded = true;
            if (fallbackTimer) clearTimeout(fallbackTimer);
            map.resize();
            syncGeoJSON(map);
          };

          map.on("load", onReady);
          fallbackTimer = setTimeout(() => {
            if (!loaded && isMounted) {
              map.setStyle(RASTER_FALLBACK_STYLE);
              map.once("styledata", onReady);
            }
          }, 6000);

          map.on("moveend", () => {
            const b = map.getBounds();
            loadViewportProjects({
              south: b.getSouth(),
              north: b.getNorth(),
              west: b.getWest(),
              east: b.getEast(),
            });
          });
        } catch {
          setMapFailed(true);
        }
      })
      .catch(() => setMapFailed(true));

    return () => {
      isMounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapFailed]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) syncGeoJSON(map);
    else map.once("load", () => syncGeoJSON(map));
  }, [projects]);

  useEffect(() => {
    if (!selected) return;
    const hit = projectsRef.current.find((p) => p.id === selected);
    if (hit && mapRef.current) {
      mapRef.current.flyTo({ center: [hit.lng, hit.lat], zoom: Math.max(mapRef.current.getZoom(), 15), offset: [0, -60] });
    }
  }, [selected]);

  if (mapFailed) {
    return (
      <div
        ref={scroller}
        className="absolute inset-0 isolate overflow-auto overscroll-none bg-[#9ADBA0] [scrollbar-width:none]"
        style={{ scrollPaddingTop: inset.top, scrollPaddingBottom: inset.bottom }}
      >
        <div className="w-[max(470px,100%)]" style={{ paddingBottom: inset.bottom }}>
          <div className="relative aspect-[780/1352] overflow-hidden">
            <Image src="/verisite/zmap.png" alt="Mapa ng Dasmariñas" width={780} height={1688} preload className="absolute bottom-0 h-auto w-full" />
            {projects.slice(0, 20).map((p) => {
              const x = Math.min(95, Math.max(5, ((p.lng - box.west) / (box.east - box.west)) * 100));
              const y = Math.min(95, Math.max(5, ((box.north - p.lat) / (box.north - box.south)) * 100));
              const on = p.id === selected;
              return (
                <button
                  key={p.id}
                  type="button"
                  data-id={p.id}
                  onClick={() => onSelect(p.id)}
                  aria-pressed={on}
                  aria-label={`${p.place}: ${p.reportCount} report, ${statuses[p.status].label}`}
                  className={`absolute flex w-[126px] -translate-x-1/2 -translate-y-[23px] cursor-pointer flex-col items-center gap-1 ${on ? "z-[2]" : "z-[1]"}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <SitePin project={p} ring={on} />
                  <span
                    className={`rounded-[9px] px-[9px] py-[3px] text-[14px] font-semibold whitespace-nowrap shadow-[0_3px_7px_rgba(20,60,90,.22)] ${on ? "bg-ink text-white" : "bg-white text-ink"}`}
                  >
                    {p.place}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapEl}
      className="absolute inset-0 h-full w-full bg-[#9ADBA0]"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }}
    />
  );
}
