// The one VeriSite data layer: projects, reports, followed projects, the current user and updates.
// Synced with Supabase (DPWH projects, reports, photos storage, and Google OAuth) while keeping local state + judge demo account working.
// Client-only: import it from "use client" components.
import { useMemo, useSyncExternalStore } from "react";
import {
  supabase,
  DEMO_CENTER,
  signInWithOAuth,
  getUserDisplayName,
  normContractId,
  type ProjectStatusRow,
} from "@/lib/supabase";
import type { AiResult } from "./ai";
import { sample } from "./sample-data";
import {
  addAccount, addDays, addReport, badgeFor, checkSignup, confirmReports, findAccount, normMobile, readUpdate, seedState, setPassword, setSiteStatus, toggleFollowed, upgrade,
  type BadgeName, type ProjectRecord, type Report, type ReportStatus, type SignupErrors, type SignupInput, type State,
} from "./store";

const KEY = "verisite:v1";
const CHANGED = "verisite:changed";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const today = () => new Date().toLocaleDateString("sv"); // local YYYY-MM-DD

let cache: { raw: string | null; state: State } | null = null;
let memory: string | null = null; // used when localStorage is blocked (private mode)
let userCoords = { ...DEMO_CENTER };
let syncStarted = false;

function readRaw() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return memory;
  }
}
function writeRaw(raw: string) {
  try {
    localStorage.setItem(KEY, raw);
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") throw e;
    memory = raw;
  }
}

function inferCategory(title: string): { image: ProjectRecord["image"]; type: ProjectRecord["type"] } {
  const t = title.toLowerCase();
  if (/\b(bridge|tulay|flyover|overpass|viaduct)\b/.test(t)) return { image: "bridge", type: "tulay" };
  if (/\b(flood|drain|drainage|canal|kanal|river|dike|revetment|slope|sewer|waterway|culvert)\b/.test(t))
    return { image: "drain", type: "kanal" };
  if (/\b(building|school|multi-purpose|multipurpose|hospital|gymnasium|hall|facility|center|gusali)\b/.test(t))
    return { image: "road", type: "gusali" };
  return { image: "road", type: "kalsada" };
}

export function mapSupabaseProject(row: ProjectStatusRow, existing?: ProjectRecord): ProjectRecord {
  const { image, type } = inferCategory(row.title || "");
  const distKm = Math.hypot(row.lat - userCoords.lat, row.lng - userCoords.lng) * 111;
  const office = row.implementing_office || "DPWH District Office";
  const place = office.replace(/District Engineering Office|DEO/gi, "").trim() || row.contract_id || "DPWH";
  return {
    id: row.id,
    name: row.title,
    place,
    address: row.contract_id ? `${office} · ${row.contract_id}` : office,
    image,
    type,
    near: distKm <= 8,
    contractId: row.contract_id || "",
    contractor: row.contractor || "Unlisted",
    office,
    budget: Number(row.budget_php || 0),
    startDate: row.start_date || addDays(today(), -90),
    targetDate: row.target_date || addDays(today(), 30),
    postedAt: row.source_as_of || today(),
    progress: Math.round(Number(row.progress_pct || 0)),
    record: row.dpwh_status || (row.completed ? "Completed per DPWH" : "On-Going"),
    reportCount: Math.max(Number(row.total_reports || 0), existing?.reportCount ?? 0),
    lng: row.lng,
    lat: row.lat,
  };
}

function mergeProjectsIntoState(rows: ProjectStatusRow[]) {
  if (!rows.length) return;
  const s = load();
  const byId = new Map(s.projects.map((p) => [p.id, p]));
  for (const r of rows) {
    byId.set(r.id, mapSupabaseProject(r, byId.get(r.id)));
  }
  const merged = Array.from(byId.values()).slice(0, 500);
  save({ ...s, projects: merged });
}

export async function loadViewportProjects(bounds?: { south: number; north: number; west: number; east: number }) {
  const b = bounds || {
    south: userCoords.lat - 0.15,
    north: userCoords.lat + 0.15,
    west: userCoords.lng - 0.15,
    east: userCoords.lng + 0.15,
  };
  const { data } = await supabase
    .from("project_status")
    .select("*")
    .gte("lat", b.south)
    .lte("lat", b.north)
    .gte("lng", b.west)
    .lte("lng", b.east)
    .limit(300);
  if (data && data.length > 0) {
    mergeProjectsIntoState(data as ProjectStatusRow[]);
  }
}

export async function ensureProjectByContractId(rawCid?: string | null): Promise<ProjectRecord | null> {
  const cid = normContractId(rawCid);
  if (!cid) return null;

  const variants = [cid];
  if (cid.length >= 6) {
    const year = cid.slice(0, 2);
    const mid = cid.slice(2, -4);
    const seq = cid.slice(-4);
    const opts = [...mid].map((ch, idx) => {
      if (!"0OD".includes(ch)) return [ch];
      const pool = idx === 0 ? ["O", "D"] : ["0", "O", "D"];
      return [ch, ...pool.filter((x) => x !== ch)];
    });
    const prefixes = opts.reduce<string[]>(
      (acc, list) => acc.flatMap((p) => list.map((c) => p + c)),
      [""]
    );
    for (const m of prefixes) {
      const v = year + m + seq;
      if (!variants.includes(v)) variants.push(v);
    }
  }

  const { data: hits } = await supabase
    .from("project_status")
    .select("*")
    .in("contract_id", variants);

  let best = variants
    .map((v) => (hits as ProjectStatusRow[] | null)?.find((h) => h.contract_id === v))
    .find(Boolean);

  if (!best && cid.length >= 6) {
    const year = cid.slice(0, 2);
    const seq = cid.slice(-4);
    if (/^\d{2}$/.test(year) && /^\d{4}$/.test(seq)) {
      const { data: candidates } = await supabase
        .from("project_status")
        .select("*")
        .ilike("contract_id", `${year}%${seq}`)
        .limit(20);
      if (candidates && candidates.length > 0) {
        const midLetters = cid.slice(2, -4);
        best =
          (candidates as ProjectStatusRow[]).find((c) =>
            [...midLetters].some((ch) => c.contract_id?.slice(2, -4).includes(ch))
          ) || (candidates[0] as ProjectStatusRow);
      }
    }
  }

  if (best) {
    mergeProjectsIntoState([best]);
    return mapSupabaseProject(best);
  }
  return null;
}

function syncOAuthUser(sessionUser: any) {
  if (!sessionUser || sessionUser.is_anonymous) return;
  const rawName = getUserDisplayName(sessionUser)
    .replace(/[^A-Za-z0-9_.]/g, "_")
    .replace(/^[^A-Za-z]+/, "u_")
    .slice(0, 20);
  const username = rawName.length >= 3 ? rawName : `user_${rawName}`;
  const s = load();
  const existing = findAccount(s, username);
  if (!existing) {
    const nextAccounts = [
      ...s.accounts,
      { username, mobile: "09000000000", password: "oauth", streak: 1, lastReportDay: today(), followed: [] },
    ];
    save({ ...s, accounts: nextAccounts, me: username });
  } else if (s.me !== existing.username) {
    save({ ...s, me: existing.username });
  }
}

async function syncReportsFromSupabase() {
  const { data } = await supabase
    .from("reports")
    .select("id, project_id, note, photo_path, ai_flags, status, created_at, author_name")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!data || !data.length) return;
  const s = load();
  const existingIds = new Set(s.reports.map((r) => r.id));
  const statusMap: Record<string, ReportStatus> = {
    open: "bago",
    acknowledged: "tinitingnan",
    resolved: "naaksyunan",
  };
  const added: Report[] = [];
  for (const r of data as any[]) {
    if (existingIds.has(r.id)) continue;
    const user = r.author_name || "Citizen";
    const userCount = s.reports.filter((x) => x.user === user).length + 1;
    const badge: BadgeName = badgeFor(userCount) ?? "Baguhan";
    const photoUrl = r.photo_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${r.photo_path}`
      : "/verisite/rep-site.png";
    const issues: string[] = Array.isArray(r.ai_flags?.issues) && r.ai_flags.issues.length
      ? r.ai_flags.issues
      : ["Report mula sa mamamayan"];
    added.push({
      id: r.id,
      projectId: r.project_id,
      user,
      badge,
      createdAt: r.created_at,
      photo: photoUrl,
      issues,
      note: r.note || "",
      status: statusMap[r.status] || "bago",
      confirmed: r.status !== "open",
    });
  }
  if (added.length > 0) {
    save({ ...s, reports: [...added, ...s.reports] });
  }
}

function startBackgroundSync() {
  if (syncStarted || typeof window === "undefined") return;
  syncStarted = true;

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user && !session.user.is_anonymous) syncOAuthUser(session.user);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user && !session.user.is_anonymous) syncOAuthUser(session.user);
  });

  navigator.geolocation?.getCurrentPosition(
    (pos) => {
      userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      loadViewportProjects();
    },
    () => {
      loadViewportProjects();
    }
  );
  loadViewportProjects();
  syncReportsFromSupabase();
}

function load(): State {
  startBackgroundSync();
  const raw = readRaw();
  if (cache && cache.raw === raw) return cache.state;
  let state: State | null = null;
  try {
    const s = raw && JSON.parse(raw);
    // Stored data is untrusted: anything unexpected falls back to a fresh start.
    if ([1, 2, 3].includes(s?.version) && Array.isArray(s.projects) && Array.isArray(s.reports) && Array.isArray(s.updates) && (s.user || Array.isArray(s.accounts)))
      state = upgrade(s, sample);
  } catch {}
  if (!state) {
    state = seedState(sample, today());
    const fresh = JSON.stringify(state);
    writeRaw(fresh);
    cache = { raw: readRaw() ?? fresh, state };
    return state;
  }
  cache = { raw, state };
  return state;
}

function save(state: State) {
  const raw = JSON.stringify(state);
  writeRaw(raw);
  cache = { raw: readRaw() ?? raw, state };
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange); // other tabs
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// Current data, or null during the server render (screens show a placeholder until the browser loads it).
export const useData = () => useSyncExternalStore(subscribe, load, () => null);
export const getData = load;

export async function loginWithGoogle() {
  try {
    sessionStorage.setItem("oauth_return", "/verisite/home");
  } catch {}
  await signInWithOAuth();
}

// Saves the report locally and syncs to Supabase Storage + `public.reports` when reporting on a Supabase project.
export async function sendReport(input: Pick<Report, "projectId" | "photo" | "issues" | "note" | "draftId">): Promise<Report> {
  const shrunk = await shrink(input.photo);
  const current = load();
  const { state, report } = addReport(current, { ...input, photo: shrunk }, new Date());
  if (state !== current) save(state);

  if (UUID_RE.test(input.projectId)) {
    (async () => {
      try {
        const res = await fetch(shrunk);
        const blob = await res.blob();
        const uid = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const photoPath = `${uid}.jpg`;
        await supabase.storage.from("photos").upload(photoPath, blob, { contentType: "image/jpeg" });
        const base = {
          project_id: input.projectId,
          kind: "update",
          note: input.note.trim().slice(0, 500) || null,
          photo_path: photoPath,
          ai_flags: { issues: input.issues },
        };
        const { error } = await supabase.from("reports").insert({
          ...base,
          author_name: (state.me || "Citizen").slice(0, 80),
        });
        if (error) await supabase.from("reports").insert(base);
      } catch {}
    })();
  }

  return report;
}

export async function toggleFollow(projectId: string) {
  save(toggleFollowed(load(), projectId));
}

export async function markRead(updateId: string) {
  const next = readUpdate(load(), updateId);
  if (next !== load()) save(next);
}

async function hash(username: string, password: string) {
  if (!crypto.subtle) throw new Error("Insecure context");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${username.toLowerCase()}:${password}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function logIn(id: string, password: string) {
  const a = findAccount(load(), id);
  if (!a || a.password !== (await hash(a.username, password))) return false;
  save({ ...load(), me: a.username });
  return true;
}
export function logOut() {
  clearDraft();
  save({ ...load(), me: null });
  supabase.auth.signOut().catch(() => {});
}

// A signup or password reset waiting for its code (Verify screen), kept per tab like the scan draft.
export type Pending = { kind: "signup" | "reset"; username: string; mobile: string; password: string; code: string; sentAt: number };
const PENDING = "verisite:pending";
const newCode = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, "0");
const parsePending = (raw: string | null): Pending | null => {
  try {
    const p = JSON.parse(raw ?? "null");
    return typeof p?.code === "string" && typeof p.username === "string" ? p : null;
  } catch {
    return null;
  }
};
const pendingRaw = () => session(PENDING);
export function usePending() {
  const raw = useSyncExternalStore(subscribe, pendingRaw, () => undefined);
  return useMemo(() => (raw === undefined ? undefined : parsePending(raw)), [raw]);
}
function setPending(p: Pending | null) {
  if (p) sessionStorage.setItem(PENDING, JSON.stringify(p));
  else sessionStorage.removeItem(PENDING);
  window.dispatchEvent(new Event(CHANGED));
}

export async function startSignup(input: SignupInput): Promise<SignupErrors> {
  const errors = checkSignup(load(), input);
  if (Object.keys(errors).length) return errors;
  const username = input.username.trim();
  setPending({ kind: "signup", username, mobile: normMobile(input.mobile)!, password: await hash(username, input.password), code: newCode(), sentAt: Date.now() });
  return {};
}
export async function startReset(mobile: string, password: string): Promise<{ mobile?: string; password?: string }> {
  const m = normMobile(mobile);
  const a = m && load().accounts.find((x) => x.mobile === m);
  const e = {
    mobile: !m ? "Ilagay ang 11 digit na mobile number na nagsisimula sa 09." : !a ? "Walang account sa numerong ito." : undefined,
    password: password.length < 8 ? "Dapat 8 o higit pa ang letra o numero ng password." : undefined,
  };
  if (e.mobile || e.password || !a) return e;
  setPending({ kind: "reset", username: a.username, mobile: a.mobile, password: await hash(a.username, password), code: newCode(), sentAt: Date.now() });
  return {};
}
export function resendCode() {
  const p = parsePending(pendingRaw());
  if (p) setPending({ ...p, code: newCode(), sentAt: Date.now() });
}
export function verifyCode(code: string): string | null {
  const p = parsePending(pendingRaw());
  if (!p) return "Nag-expire na ang code. Magsimula ulit.";
  if (!/^\d{6}$/.test(code)) return "Ilagay ang 6 na numero ng code.";
  if (code !== p.code) return "Mali ang code. Tingnan ulit o pindutin ang Ipadala ulit.";
  const s = load();
  try {
    save(p.kind === "signup" ? addAccount(s, { username: p.username, mobile: p.mobile, password: p.password }) : { ...setPassword(s, p.username, p.password), me: p.username });
  } catch {
    setPending(null);
    return "May gumawa na ng account na ito. Mag-sign up ulit gamit ang ibang username o numero.";
  }
  setPending(null);
  return null;
}

const TEXT = "verisite:text";
export const useLargeText = () => useSyncExternalStore(subscribe, () => document.documentElement.dataset.text === "malaki", () => false);
export function setLargeText(on: boolean) {
  try {
    localStorage.setItem(TEXT, on ? "malaki" : "");
  } catch {}
  document.documentElement.dataset.text = on ? "malaki" : "";
  window.dispatchEvent(new Event(CHANGED));
}

export async function setStatus(projectId: string, status: ReportStatus) {
  const next = setSiteStatus(load(), projectId, status);
  if (next !== load()) save(next);
  if (UUID_RE.test(projectId)) {
    const dbStatus = status === "naaksyunan" ? "resolved" : status === "tinitingnan" ? "acknowledged" : "open";
    supabase.from("reports").update({ status: dbStatus }).eq("project_id", projectId).then(() => {});
  }
}
export async function confirmSite(projectId: string) {
  const next = confirmReports(load(), projectId);
  if (next !== load()) save(next);
}

async function shrink(src: string, max = 480) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

export type Draft = { id: string; photo: string; projectId?: string; ai?: AiResult };
const DRAFT = "verisite:draft";

function session(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
const draftRaw = () => session(DRAFT);
function parseDraft(raw: string | null): Draft | null {
  try {
    const d = JSON.parse(raw ?? "null");
    return typeof d?.id === "string" && typeof d.photo === "string" ? d : null;
  } catch {
    return null;
  }
}
export const getDraft = () => parseDraft(draftRaw());
export function useDraft() {
  const raw = useSyncExternalStore(subscribe, draftRaw, () => null);
  return useMemo(() => parseDraft(raw), [raw]);
}
export function setDraft(d: Draft) {
  sessionStorage.setItem(DRAFT, JSON.stringify(d));
  window.dispatchEvent(new Event(CHANGED));
}
export function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT);
  } catch {}
  window.dispatchEvent(new Event(CHANGED));
}
