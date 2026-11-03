"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import {
  supabase,
  DEMO_CENTER,
  ensureAnonSession,
  ProjectStatusRow,
  statusCopy,
  buildComplaintMailto,
} from "@/lib/supabase";

const COLOR_HEX: Record<ProjectStatusRow["status"], string> = {
  red: "#ef4444",
  yellow: "#eab308",
  green: "#22c55e",
  gray: "#9ca3af",
};

export default function HomePage() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [projects, setProjects] = useState<ProjectStatusRow[]>([]);
  const [selected, setSelected] = useState<ProjectStatusRow | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [showNearby, setShowNearby] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number }>(DEMO_CENTER);

  async function loadProjects() {
    const { data } = await supabase
      .from("project_status")
      .select("*")
      .gte("lat", DEMO_CENTER.lat - 0.15)
      .lte("lat", DEMO_CENTER.lat + 0.15)
      .gte("lng", DEMO_CENTER.lng - 0.15)
      .lte("lng", DEMO_CENTER.lng + 0.15);
    if (data) {
      setProjects(data as ProjectStatusRow[]);
      const pid = new URLSearchParams(window.location.search).get("project");
      if (pid) {
        const hit = (data as ProjectStatusRow[]).find((p) => p.id === pid);
        if (hit) selectProject(hit);
      }
    }
  }

  async function selectProject(p: ProjectStatusRow) {
    setSelected(p);
    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 17, pitch: 55 });
    const { data } = await supabase
      .from("reports")
      .select("id, kind, note, photo_path, ai_flags, status, admin_response, created_at")
      .eq("project_id", p.id)
      .order("created_at", { ascending: false });
    setReports(data || []);
  }

  useEffect(() => {
    ensureAnonSession().catch(() => { });
    loadProjects();
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { }
    );
  }, []);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    let isMounted = true;

    import("maplibre-gl").then((maplibregl) => {
      if (!isMounted || !mapEl.current || mapRef.current) return;
      const map = new maplibregl.Map({
        container: mapEl.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [DEMO_CENTER.lng, DEMO_CENTER.lat],
        zoom: 16,
        pitch: 55,
      });
      map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), "top-right");
      mapRef.current = map;
      map.on("load", () => {
        renderProjects(map);
      });
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function renderProjects(map: MapLibreMap) {
    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: projects.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: { id: p.id, color: COLOR_HEX[p.status] },
      })),
    };
    const src = map.getSource("projects") as GeoJSONSource | undefined;
    if (src) {
      src.setData(geojson);
      return;
    }
    map.addSource("projects", {
      type: "geojson",
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 40,
    });
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "projects",
      filter: ["has", "point_count"],
      paint: { "circle-color": "#334155", "circle-radius": 18, "circle-stroke-width": 2, "circle-stroke-color": "#fff" },
    });
    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "projects",
      filter: ["has", "point_count"],
      layout: { "text-field": "{point_count_abbreviated}", "text-size": 12 },
      paint: { "text-color": "#ffffff" },
    });
    map.addLayer({
      id: "pins",
      type: "circle",
      source: "projects",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": 11,
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
      },
    });
    map.on("click", "pins", (e) => {
      const id = e.features?.[0]?.properties?.id;
      const hit = projects.find((x) => x.id === id);
      if (hit) selectProject(hit);
    });
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) renderProjects(map);
    else map.once("load", () => renderProjects(map));
  }, [projects]);

  async function confirmProject(p: ProjectStatusRow) {
    await ensureAnonSession();
    const { error } = await supabase.from("confirmations").insert({ project_id: p.id });
    if (!error) {
      const updated = { ...p, confirmations: p.confirmations + 1 };
      setSelected(updated);
      setProjects((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    }
  }

  function shareProject(p: ProjectStatusRow) {
    // Must run synchronously inside onClick for iOS Safari
    const url = `${window.location.origin}/?project=${p.id}`;
    const text = `${p.title} (${statusCopy(p)})`;
    if (navigator.share) navigator.share({ title: p.title, text, url }).catch(() => { });
    else window.location.href = buildComplaintMailto(p, window.location.origin);
  }

  const nearby = [...projects]
    .map((p) => ({
      ...p,
      distKm: Math.hypot(p.lat - userPos.lat, p.lng - userPos.lng) * 111,
    }))
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, 15);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-900 text-white">
      <div ref={mapEl} className="absolute inset-0 h-full w-full" />

      {/* Top banner + legend */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-col gap-2">
        <div className="pointer-events-auto flex items-center justify-between rounded-xl bg-slate-900/90 px-3 py-2 text-xs shadow-lg backdrop-blur">
          <div>
            <span className="font-bold text-sm">BantayAsenso</span>
            <span className="ml-2 text-slate-300">DPWH Transparency Portal snapshot</span>
          </div>
          <button
            onClick={() => setShowNearby((v) => !v)}
            className="rounded-lg bg-slate-700 px-2.5 py-1 font-medium"
          >
            {showNearby ? "Hide Nearby" : "Nearby List"}
          </button>
        </div>
        <div className="flex gap-3 self-start rounded-lg bg-slate-900/80 px-2.5 py-1 text-[11px]">
          <span>🟢 On track / Done</span>
          <span>🟡 ≤30d left</span>
          <span>🔴 Past target / Hazard</span>
          <span>⚪ Unverified citizen</span>
        </div>
      </div>

      {/* Nearby drawer (F10) */}
      {showNearby && (
        <div className="absolute inset-x-3 top-24 max-h-72 overflow-y-auto rounded-xl bg-slate-900/95 p-3 text-xs shadow-xl">
          <div className="mb-2 font-semibold">Nearest projects (no billboard needed)</div>
          {nearby.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setShowNearby(false);
                selectProject(p);
              }}
              className="flex w-full items-center justify-between border-b border-slate-800 py-2 text-left"
            >
              <span className="truncate pr-2">{p.title}</span>
              <span className="shrink-0 text-slate-400">{p.distKm.toFixed(2)} km</span>
            </button>
          ))}
        </div>
      )}

      {/* Primary Scan FAB */}
      <div className="absolute inset-x-0 bottom-6 flex justify-center gap-3">
        <Link
          href="/scan?mode=sign"
          className="rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-xl"
        >
          📷 Scan Sign
        </Link>
        <Link
          href="/scan?mode=hazard"
          className="rounded-full bg-red-500 px-5 py-3.5 text-sm font-bold text-white shadow-xl"
        >
          ⚠️ Report Hazard
        </Link>
      </div>

      {/* Bottom sheet project card (F2) */}
      {selected && (
        <div className="absolute inset-x-0 bottom-0 z-20 max-h-[75dvh] overflow-y-auto rounded-t-2xl bg-slate-900 p-4 shadow-2xl border-t border-slate-700">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs uppercase text-slate-400">
                {selected.contract_id ?? "No Contract ID"} · {selected.source.toUpperCase()}
              </span>
              <h2 className="text-base font-bold leading-snug">{selected.title}</h2>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-400 text-lg px-2">✕</button>
          </div>

          <p className="mt-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-amber-300">
            {statusCopy(selected)}
          </p>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div>Contractor: <b>{selected.contractor ?? "Unlisted"}</b></div>
            <div>Budget: <b>{selected.budget_php ? `₱${Number(selected.budget_php).toLocaleString()}` : "Unlisted"}</b></div>
            <div>Target Date: <b>{selected.target_date ?? "Unlisted"}</b></div>
            <div>DPWH Progress: <b>{selected.progress_pct}%</b></div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => confirmProject(selected)}
              className="rounded-lg bg-slate-800 px-3 py-2 font-semibold"
            >
              👍 I see this too ({selected.confirmations})
            </button>
            <Link
              href={`/scan?mode=hazard&project=${selected.id}`}
              className="rounded-lg bg-red-600 px-3 py-2 font-semibold"
            >
              ⚠️ Flag Hazard
            </Link>
            <Link
              href={`/scan?mode=update&project=${selected.id}`}
              className="rounded-lg bg-slate-800 px-3 py-2 font-semibold"
            >
              📝 Post Update
            </Link>
            <a
              href={buildComplaintMailto(selected, typeof window !== "undefined" ? window.location.origin : "")}
              className="rounded-lg bg-amber-500 px-3 py-2 font-semibold text-slate-950"
            >
              ✉️ Email DPWH
            </a>
            <button
              onClick={() => shareProject(selected)}
              className="rounded-lg bg-slate-800 px-3 py-2 font-semibold"
            >
              Share
            </button>
          </div>

          {reports.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-slate-800 pt-3 text-xs">
              <div className="font-semibold text-slate-400">Citizen reports ({reports.length})</div>
              {reports.map((r) => (
                <div key={r.id} className="rounded-lg bg-slate-800/70 p-2.5">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{r.kind.toUpperCase()} · {r.status}</span>
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.note && <p className="mt-1">{r.note}</p>}
                  {r.ai_flags?.summary && (
                    <p className="mt-1 text-amber-300">
                      AI check: {r.ai_flags.summary} <i>(Automated check, please verify.)</i>
                    </p>
                  )}
                  {r.photo_path && (
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${r.photo_path}`}
                      alt="report"
                      className="mt-2 max-h-40 rounded"
                    />
                  )}
                  {r.admin_response && (
                    <p className="mt-1.5 rounded bg-emerald-950/80 p-1.5 text-emerald-300">
                      <b>Official Response:</b> {r.admin_response}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
