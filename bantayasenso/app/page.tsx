"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import {
  supabase,
  DEMO_CENTER,
  requireAuth,
  signInWithOAuth,
  getUserDisplayName,
  authorBadge,
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

export default function HomePage() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const selectedRef = useRef<ProjectStatusRow | null>(null);
  const selectedMarkerRef = useRef<any>(null);
  const projectsRef = useRef<ProjectStatusRow[]>([]);
  const [projects, setProjects] = useState<ProjectStatusRow[]>([]);
  projectsRef.current = projects;
  const [selected, setSelected] = useState<ProjectStatusRow | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [showNearby, setShowNearby] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number }>(DEMO_CENTER);
  const [user, setUser] = useState<any>(null);

  async function loadProjects(
    bounds?: { south: number; north: number; west: number; east: number },
    checkUrlParam = false
  ) {
    const b = bounds || {
      south: DEMO_CENTER.lat - 0.15,
      north: DEMO_CENTER.lat + 0.15,
      west: DEMO_CENTER.lng - 0.15,
      east: DEMO_CENTER.lng + 0.15,
    };
    const { data } = await supabase
      .from("project_status")
      .select("*")
      .gte("lat", b.south)
      .lte("lat", b.north)
      .gte("lng", b.west)
      .lte("lng", b.east)
      .limit(1000);
    let list = (data || []) as ProjectStatusRow[];
    if (checkUrlParam) {
      const pid = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("project") : null;
      if (pid) {
        let hit = list.find((p) => p.id === pid);
        if (!hit) {
          const { data: single } = await supabase
            .from("project_status")
            .select("*")
            .eq("id", pid)
            .maybeSingle();
          if (single) {
            hit = single as ProjectStatusRow;
            list = [hit, ...list];
          }
        }
        if (hit) selectProject(hit);
      }
    } else if (selectedRef.current && !list.some((p) => p.id === selectedRef.current!.id)) {
      list = [selectedRef.current, ...list];
    }
    setProjects(list);
  }

  async function selectProject(p: ProjectStatusRow) {
    selectedRef.current = p;
    setSelected(p);
    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 17, pitch: 55, offset: [0, -140] });

    import("maplibre-gl").then((maplibregl) => {
      if (!mapRef.current) return;
      selectedMarkerRef.current?.remove();
      selectedMarkerRef.current = new maplibregl.Marker({ color: "#ef4444" })
        .setLngLat([p.lng, p.lat])
        .addTo(mapRef.current);
    });

    let { data, error } = await supabase
      .from("report_timeline")
      .select("id, project_id, note, photo_path, status, admin_response, created_at, created_by, author_name, likes, author_total_likes")
      .eq("project_id", p.id)
      .order("created_at", { ascending: false });
    if (error) {
      const fallback = await supabase
        .from("reports")
        .select("id, project_id, note, photo_path, status, admin_response, created_at")
        .eq("project_id", p.id)
        .order("created_at", { ascending: false });
      data = fallback.data as any;
    }
    setReports(data || []);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.is_anonymous) {
        supabase.auth.signOut();
      } else {
        setUser(session?.user ?? null);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.is_anonymous) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          const ret = sessionStorage.getItem("oauth_return");
          if (ret) {
            sessionStorage.removeItem("oauth_return");
            window.location.replace(ret);
          }
        } catch {}
      }
    });
    loadProjects(undefined, true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { }
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    let isMounted = true;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    import("maplibre-gl")
      .then((maplibregl) => {
        if (!isMounted || !mapEl.current || mapRef.current) return;
        try {
          // ?v=.cjs makes MapLibre's worker loader use a classic Worker instead of module worker
          maplibregl.setWorkerUrl?.("/maplibre-gl-worker.js?v=.cjs");
          const initialCenter = selectedRef.current
            ? [selectedRef.current.lng, selectedRef.current.lat]
            : [DEMO_CENTER.lng, DEMO_CENTER.lat];
          const map = new maplibregl.Map({
            container: mapEl.current,
            style: "https://tiles.openfreemap.org/styles/liberty",
            center: initialCenter as [number, number],
            zoom: selectedRef.current ? 17 : 16,
            pitch: 55,
            pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
            canvasContextAttributes: { powerPreference: "default" },
          });
          map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), "top-right");
          mapRef.current = map;
          requestAnimationFrame(() => map.resize());

          let loaded = false;
          const onReady = () => {
            if (loaded) return;
            loaded = true;
            if (fallbackTimer) clearTimeout(fallbackTimer);
            map.resize();
            renderProjects(map);
            if (selectedRef.current) {
              const p = selectedRef.current;
              map.flyTo({ center: [p.lng, p.lat], zoom: 17, pitch: 55, offset: [0, -140] });
              selectedMarkerRef.current?.remove();
              selectedMarkerRef.current = new maplibregl.Marker({ color: "#ef4444" })
                .setLngLat([p.lng, p.lat])
                .addTo(map);
            }
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
            loadProjects({
              south: b.getSouth(),
              north: b.getNorth(),
              west: b.getWest(),
              east: b.getEast(),
            });
          });
        } catch {
          setMapFailed(true);
          setShowNearby(true);
        }
      })
      .catch(() => {
        setMapFailed(true);
        setShowNearby(true);
      });

    return () => {
      isMounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      selectedMarkerRef.current?.remove();
      selectedMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  function renderProjects(map: MapLibreMap) {
    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: projectsRef.current.map((p) => ({
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
      const hit = projectsRef.current.find((x) => x.id === id);
      if (hit) selectProject(hit);
    });
    map.on("mouseenter", "pins", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "pins", () => {
      map.getCanvas().style.cursor = "";
    });
    map.on("click", "clusters", (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
      const clusterId = features[0]?.properties?.cluster_id;
      const source = map.getSource("projects") as any;
      source?.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err || !features[0]) return;
        const geom = features[0].geometry as GeoJSON.Point;
        map.easeTo({ center: geom.coordinates as [number, number], zoom });
      });
    });
    map.on("mouseenter", "clusters", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "clusters", () => {
      map.getCanvas().style.cursor = "";
    });
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) renderProjects(map);
    else map.once("load", () => renderProjects(map));
  }, [projects]);

  async function confirmProject(p: ProjectStatusRow) {
    await requireAuth();
    const { error } = await supabase.from("confirmations").insert({ project_id: p.id });
    if (!error) {
      const updated = { ...p, confirmations: p.confirmations + 1 };
      setSelected(updated);
      setProjects((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    }
  }

  async function likeReport(r: any) {
    const { user: currentUser } = await requireAuth();
    const { error } = await supabase.from("report_likes").insert({ report_id: r.id });
    if (!error) {
      setReports((prev) =>
        prev.map((x) =>
          x.id === r.id
            ? { ...x, likes: Number(x.likes || 0) + 1, author_total_likes: Number(x.author_total_likes || 0) + 1 }
            : x.created_by && x.created_by === r.created_by
            ? { ...x, author_total_likes: Number(x.author_total_likes || 0) + 1 }
            : x
        )
      );
    } else if (error.code === "23505" && currentUser) {
      const { error: delErr } = await supabase
        .from("report_likes")
        .delete()
        .eq("report_id", r.id)
        .eq("user_id", currentUser.id);
      if (!delErr) {
        setReports((prev) =>
          prev.map((x) =>
            x.id === r.id
              ? { ...x, likes: Math.max(0, Number(x.likes || 0) - 1), author_total_likes: Math.max(0, Number(x.author_total_likes || 0) - 1) }
              : x.created_by && x.created_by === r.created_by
              ? { ...x, author_total_likes: Math.max(0, Number(x.author_total_likes || 0) - 1) }
              : x
          )
        );
      }
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

  const centerLat = selected?.lat ?? userPos.lat;
  const centerLng = selected?.lng ?? userPos.lng;

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-slate-900 text-white"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", overflow: "hidden", backgroundColor: "#0f172a", color: "#ffffff" }}
    >
      <div
        ref={mapEl}
        className="absolute inset-0 h-full w-full"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }}
      />
      {mapFailed && (
        <iframe
          title="Map fallback"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${centerLng - 0.01},${centerLat - 0.01},${centerLng + 0.01},${centerLat + 0.01}&layer=mapnik&marker=${centerLat},${centerLng}`}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
        />
      )}

      {/* Top banner + legend */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-col gap-2">
        <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-xl bg-slate-900/90 px-3 py-2 text-xs shadow-lg backdrop-blur">
          <div className="truncate">
            <span className="font-bold text-sm">BantayAsenso</span>
            <span className="ml-2 hidden sm:inline text-slate-300">DPWH Transparency Portal snapshot</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <button
                onClick={() => supabase.auth.signOut()}
                className="rounded-lg bg-slate-800 px-2.5 py-1 font-medium text-slate-200"
              >
                {getUserDisplayName(user)} · Sign Out
              </button>
            ) : (
              <button
                onClick={() => signInWithOAuth()}
                className="rounded-lg bg-emerald-500 px-2.5 py-1 font-semibold text-slate-950"
              >
                Sign In
              </button>
            )}
            <button
              onClick={() => setShowNearby((v) => !v)}
              className="rounded-lg bg-slate-700 px-2.5 py-1 font-medium"
            >
              {showNearby ? "Hide Nearby" : "Nearby List"}
            </button>
          </div>
        </div>
        <div className="flex gap-3 self-start rounded-lg bg-slate-900/80 px-2.5 py-1 text-[11px]">
          <span>🟢 On track / Done</span>
          <span>🟡 ≤30d left</span>
          <span>🔴 Past target</span>
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
      <div className="absolute inset-x-0 bottom-6 flex justify-center">
        <Link
          href="/scan?mode=sign"
          className="rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-xl"
        >
          📷 Scan Sign
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
            <button
              onClick={() => {
                setSelected(null);
                selectedMarkerRef.current?.remove();
                selectedMarkerRef.current = null;
              }}
              className="text-slate-400 text-lg px-2"
            >
              ✕
            </button>
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
              href={`/scan?mode=update&project=${selected.id}`}
              className="rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-slate-950"
            >
              📸 Add Photo Report
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

          {/* Project Reports / Progress Timeline */}
          <div className="mt-4 border-t border-slate-800 pt-3 text-xs">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-slate-300">
                Project Progress Timeline ({reports.length})
              </span>
              <span className="text-[11px] text-slate-400">Earn badges from helpful photo likes</span>
            </div>

            {reports.length === 0 ? (
              <p className="rounded-lg bg-slate-800/50 p-3 text-slate-400">
                No photo reports yet — upload the first photo to start this project&apos;s timeline.
              </p>
            ) : (
              <div className="relative ml-2 space-y-4 border-l-2 border-slate-700 pl-4">
                {reports.map((r) => {
                  const badge = authorBadge(Number(r.author_total_likes || 0));
                  return (
                    <div key={r.id} className="relative rounded-xl bg-slate-800/75 p-3">
                      <span className="absolute -left-[23px] top-3.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-500" />
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white">{r.author_name || "Citizen"}</span>
                          {badge && (
                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                              {badge}
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400">
                          {new Date(r.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {r.photo_path && (
                        <img
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${r.photo_path}`}
                          alt="Project report"
                          className="mt-2 max-h-56 w-full rounded-lg object-cover"
                        />
                      )}

                      {r.note && <p className="mt-2 text-slate-200">{r.note}</p>}

                      {r.admin_response && (
                        <p className="mt-2 rounded bg-emerald-950/80 p-2 text-emerald-300">
                          <b>Official Response:</b> {r.admin_response}
                        </p>
                      )}

                      <div className="mt-2.5 flex items-center justify-between">
                        <button
                          onClick={() => likeReport(r)}
                          className="rounded-full bg-slate-700/80 px-3 py-1 text-[11px] font-semibold text-rose-300 hover:bg-slate-700"
                        >
                          ❤️ Helpful ({r.likes || 0})
                        </button>
                        <span className="text-[10px] uppercase text-slate-500">{r.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
