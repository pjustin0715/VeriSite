// VeriSite domain logic as pure functions over one State object. data.ts only loads and saves State
// (localStorage today, the backend later). Self-check: `node --test app/verisite/store.test.mjs`.
import type { Status } from "@/components/StatusLabel";
import type { SignReading } from "./ai";

export const badges = [
  { name: "Baguhan", min: 1, color: "#6FBF96" },
  { name: "Tanso", min: 10, color: "#C98A4B" },
  { name: "Pilak", min: 25, color: "#A3B2BA" },
  { name: "Ginto", min: 50, color: "#F6C744" },
  { name: "Diyamante", min: 100, color: "#58C4D6" },
] as const;
export type BadgeName = (typeof badges)[number]["name"];

// Dates are local calendar days, "YYYY-MM-DD".
export type ProjectRecord = {
  id: string;
  name: string;
  place: string;
  address: string;
  image: "road" | "bridge" | "drain";
  type: "kalsada" | "tulay" | "kanal" | "gusali";
  near: boolean; // shortcut: fixed flag for "Malapit sa akin"; compute from GPS once location is wired up
  contractId: string;
  contractor: string;
  office: string;
  budget: number; // pesos
  startDate: string;
  targetDate: string;
  postedAt: string;
  progress: number; // percent done
  record: string; // contractor's track record, e.g. "2 sa 6 ang lampas"
  reportCount: number;
  lng: number; // shortcut: fictional sample coordinates; the real DPWH/LGU feed brings the true location
  lat: number;
};

// How the LGU is handling a report. A site's status is its least-handled report, so a new report reopens it.
export type ReportStatus = "bago" | "tinitingnan" | "naaksyunan";
export type Score = { reports: number; hazard: number; late: number; total: number; level: "Mataas" | "Katamtaman" | "Mababa"; topHazard: string | null };
export type Project = ProjectRecord & {
  status: Status;
  daysLate: number;
  urgency: number;
  score: Score;
  siteStatus: ReportStatus;
  reportsShown: number; // reports saved here (reportCount also counts older ones not in this app)
  unconfirmed: number;
};

export type Report = {
  id: string; // e.g. VS-2026-1147
  projectId: string;
  user: string;
  badge: BadgeName;
  createdAt: string; // ISO date-time
  photo: string; // URL or data URL
  issues: string[]; // what was checked, e.g. ["Halaga", "Bukas na hukay"]
  note: string;
  draftId?: string; // the scan it came from; sending the same scan twice returns the first report
  status?: ReportStatus; // missing = "bago" (saved before LGU statuses existed)
  confirmed?: boolean;
};

export type Update = { id: string; projectId: string; text: string; createdAt: string; read: boolean };

export type State = {
  version: 2;
  user: { username: string; reportCount: number; streak: number; lastReportDay: string | null; followed: string[] };
  projects: ProjectRecord[];
  reports: Report[];
  updates: Update[];
  nextReportNo: number;
};

const DAY = 864e5;
export const addDays = (day: string, n: number) => new Date(Date.parse(day) + n * DAY).toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

export const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;
// Takes a day ("YYYY-MM-DD", local) or an ISO date-time.
const asDate = (d: string) => new Date(d.length > 10 ? d : `${d}T00:00`);
export const shortDate = (d: string) => asDate(d).toLocaleDateString("fil-PH", { month: "short", day: "numeric" });
export const longDate = (d: string) => asDate(d).toLocaleDateString("fil-PH", { month: "short", day: "numeric", year: "numeric" });

const badgeFor = (reportCount: number): BadgeName | null => badges.findLast((b) => reportCount >= b.min)?.name ?? null;
const badgeRank = (b: BadgeName) => badges.findIndex((x) => x.name === b);

// Hazards found in reports, with their weight in the urgency score (labels from the Result screen), heaviest first.
export const hazards: Record<string, number> = { "Bukas na hukay": 20, "Walang harang": 10, "Walang ilaw": 5 };
const statusOrder: ReportStatus[] = ["bago", "tinitingnan", "naaksyunan"];

// Urgency 0-100 = reports (max 45, full at 15) + hazards in reports not yet acted on (max 35) + days late (max 20, full at 30).
// It only ranks sites for attention; it is not a promise of LGU action.
export function scoreOf(reportCount: number, open: Report[], daysLate: number): Score {
  const found = Object.keys(hazards).filter((h) => open.some((r) => r.issues.includes(h)));
  const reports = Math.round((45 * Math.min(reportCount, 15)) / 15);
  const hazard = Math.min(35, found.reduce((sum, h) => sum + hazards[h], 0));
  const late = Math.round((20 * Math.min(Math.max(daysLate, 0), 30)) / 30);
  const total = reports + hazard + late;
  return { reports, hazard, late, total, level: total >= 70 ? "Mataas" : total >= 40 ? "Katamtaman" : "Mababa", topHazard: found[0] ?? null };
}

export function projectsOf(s: State, today: string): Project[] {
  return s.projects
    .map((p) => {
      const daysLate = p.progress < 100 ? -daysBetween(today, p.targetDate) : 0;
      const status: Status = p.progress >= 100 ? "tapos" : daysLate > 0 ? "lampas" : daysLate >= -30 ? "malapit" : "ayon";
      const mine = s.reports.filter((r) => r.projectId === p.id);
      const siteStatus = statusOrder[Math.min(2, ...mine.map((r) => statusOrder.indexOf(r.status ?? "bago")))];
      const score = scoreOf(p.reportCount, mine.filter((r) => r.status !== "naaksyunan"), daysLate);
      const unconfirmed = mine.filter((r) => !r.confirmed).length;
      return { ...p, status, daysLate, score, urgency: score.total, siteStatus: mine.length ? siteStatus : "bago", reportsShown: mine.length, unconfirmed };
    })
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt)); // newest first; filters.ts relies on this
}

export function userOf(s: State, today: string) {
  const u = s.user;
  // A streak counts only while the last report was today or yesterday.
  const alive = u.lastReportDay !== null && daysBetween(u.lastReportDay, today) <= 1;
  return { ...u, streak: alive ? u.streak : 0, badge: badgeFor(u.reportCount), unread: s.updates.filter((x) => !x.read).length };
}

// Public reports on a project: higher badge first, then newest (CLAUDE.md).
export const reportsFor = (s: State, projectId: string) =>
  s.reports
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => badgeRank(b.badge) - badgeRank(a.badge) || b.createdAt.localeCompare(a.createdAt));

export function addReport(s: State, input: Pick<Report, "projectId" | "photo" | "issues" | "note" | "draftId">, now: Date) {
  const existing = input.draftId && s.reports.find((r) => r.draftId === input.draftId);
  if (existing) return { state: s, report: existing };
  if (!s.projects.some((p) => p.id === input.projectId)) throw new Error("Unknown project");
  if (!input.issues.length) throw new Error("Nothing to report");

  const day = now.toLocaleDateString("sv"); // local YYYY-MM-DD
  const last = s.user.lastReportDay;
  const streak = last === day ? s.user.streak : last && daysBetween(last, day) === 1 ? s.user.streak + 1 : 1;
  const reportCount = s.user.reportCount + 1;
  const report: Report = {
    ...input,
    note: input.note.trim().slice(0, 500),
    id: `VS-${now.getFullYear()}-${s.nextReportNo}`,
    user: s.user.username,
    badge: badgeFor(reportCount)!,
    createdAt: now.toISOString(),
    status: "bago",
    confirmed: false,
  };
  return {
    report,
    state: {
      ...s,
      user: { ...s.user, reportCount, streak, lastReportDay: day },
      projects: s.projects.map((p) => (p.id === input.projectId ? { ...p, reportCount: p.reportCount + 1 } : p)),
      reports: [...s.reports, report],
      nextReportNo: s.nextReportNo + 1,
    },
  };
}

// Priority list: most urgent first; sites whose reports are all acted on go last.
export const priorityOf = (projects: Project[]) =>
  projects.toSorted((a, b) => +(a.siteStatus === "naaksyunan") - +(b.siteStatus === "naaksyunan") || b.urgency - a.urgency);

// LGU sets how a site's reports are handled (Bago, Tinitingnan, Tapos). Returns the same state when nothing changes.
export function setSiteStatus(s: State, projectId: string, status: ReportStatus): State {
  if (!statusOrder.includes(status)) throw new Error("Unknown status");
  const mine = s.reports.filter((r) => r.projectId === projectId);
  if (!mine.length || mine.every((r) => (r.status ?? "bago") === status)) return s;
  return { ...s, reports: s.reports.map((r) => (r.projectId === projectId ? { ...r, status } : r)) };
}

// Confirms the site's unconfirmed reports. Doing it again changes nothing.
export function confirmReports(s: State, projectId: string): State {
  if (!s.reports.some((r) => r.projectId === projectId && !r.confirmed)) return s;
  return { ...s, reports: s.reports.map((r) => (r.projectId === projectId ? { ...r, confirmed: true } : r)) };
}

export const toggleFollowed = (s: State, id: string): State => ({
  ...s,
  user: { ...s.user, followed: s.user.followed.includes(id) ? s.user.followed.filter((x) => x !== id) : [...s.user.followed, id] },
});

// The paskil as read by the AI next to the project's record. `wrong` = the AI read a value that differs.
export function signChecks(p: ProjectRecord, sign: SignReading | null) {
  const rows: [keyof SignReading, string, string | number, (v: never) => string][] = [
    ["contract_id", "Contract ID", p.contractId, String],
    ["title", "Pangalan ng proyekto", p.name, String],
    ["contractor", "Kontratista", p.contractor, String],
    ["implementing_office", "Opisina", p.office, String],
    ["budget_php", "Halaga", p.budget, peso],
    ["start_date", "Petsa ng simula", p.startDate, shortDate],
    ["target_date", "Petsa ng pagtatapos", p.targetDate, shortDate],
  ];
  return rows.map(([key, label, record, show]) => {
    const read = sign?.[key] ?? null;
    const wrong = read !== null && read !== record;
    return { key, label, wrong, detail: wrong ? `Paskil: ${show(read as never)} • Rekord: ${show(record as never)}` : undefined };
  });
}

// shortcut: matches on Contract ID only; add "nearest project by GPS" when location is wired up.
export const matchProject = (projects: ProjectRecord[], sign: SignReading | null) =>
  projects.find((p) => sign?.contract_id && p.contractId === sign.contract_id);

// Turns sample data (dates as day offsets) into a fresh State for `today`.
type Offsets = { start: number; target: number; posted: number };
export type Sample = {
  user: Omit<State["user"], "lastReportDay"> & { lastReport: number };
  nextReportNo: number;
  projects: (Omit<ProjectRecord, "startDate" | "targetDate" | "postedAt"> & Offsets)[];
  reports: (Omit<Report, "id" | "createdAt"> & { daysAgo: number })[];
  updates: { projectId: string; text: string; daysAgo: number }[];
};

// Version 1 saved data had no map coordinates: take them from the sample (same ids), else the map center.
export function upgrade(s: Omit<State, "version"> & { version: number }, sample: Sample): State {
  if (s.version === 2) return s as State;
  const at = (id: string) => sample.projects.find((p) => p.id === id) ?? { lng: 120.945, lat: 14.32 };
  return { ...s, version: 2, projects: s.projects.map((p) => ({ ...p, lng: p.lng ?? at(p.id).lng, lat: p.lat ?? at(p.id).lat })) };
}

export function seedState(sample: Sample, today: string): State {
  const { lastReport, ...user } = sample.user;
  return {
    version: 2,
    user: { ...user, lastReportDay: addDays(today, lastReport) },
    projects: sample.projects.map(({ start, target, posted, ...p }) => ({
      ...p,
      startDate: addDays(today, start),
      targetDate: addDays(today, target),
      postedAt: addDays(today, posted),
    })),
    reports: sample.reports.map(({ daysAgo, ...r }, i) => ({ ...r, id: `seed-${i}`, createdAt: `${addDays(today, -daysAgo)}T09:00:00.000Z` })),
    updates: sample.updates.map(({ daysAgo, ...u }, i) => ({ ...u, id: `seed-${i}`, createdAt: `${addDays(today, -daysAgo)}T09:00:00.000Z`, read: false })),
    nextReportNo: sample.nextReportNo,
  };
}
