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
  statusAt?: Partial<Record<ReportStatus, string>>; // when the LGU last set each status (ISO), for the report timeline
  confirmed?: boolean;
};

// "tinitingnan"/"naaksyunan": the LGU moved one of your reports; "sinusundan": news on a project you follow.
export type UpdateKind = "tinitingnan" | "naaksyunan" | "sinusundan";
export type Update = { id: string; user: string; projectId: string; kind: UpdateKind; createdAt: string; read: boolean };

// shortcut: local mock accounts (password = SHA-256 of "username:password", made in data.ts); replace with Supabase Auth later.
export type Account = { username: string; mobile: string; password: string; streak: number; lastReportDay: string | null; followed: string[] };

export type State = {
  version: 3;
  accounts: Account[];
  me: string | null; // username of the logged-in account
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

export const badgeFor = (reportCount: number): BadgeName | null => badges.findLast((b) => reportCount >= b.min)?.name ?? null;
const badgeRank = (b: BadgeName) => badges.findIndex((x) => x.name === b);

// Hazards found in reports, with their weight in the urgency score (labels from the Result screen), heaviest first.
export const hazards: Record<string, number> = { "Bukas na hukay": 20, "Walang harang": 10, "Walang ilaw": 5 };
export const statusOrder: ReportStatus[] = ["bago", "tinitingnan", "naaksyunan"];

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

// The logged-in account with its numbers (report count = its saved reports), or null when logged out.
export function userOf(s: State, today: string) {
  const a = s.accounts.find((x) => x.username === s.me);
  if (!a) return null;
  const reportCount = s.reports.filter((r) => r.user === a.username).length;
  // A streak counts only while the last report was today or yesterday.
  const alive = a.lastReportDay !== null && daysBetween(a.lastReportDay, today) <= 1;
  const unread = s.updates.filter((u) => u.user === a.username && !u.read).length;
  return { username: a.username, mobile: a.mobile, followed: a.followed, reportCount, streak: alive ? a.streak : 0, badge: badgeFor(reportCount), unread };
}
export type User = NonNullable<ReturnType<typeof userOf>>;

// Updates for the logged-in account, newest first.
export const updatesOf = (s: State) => s.updates.filter((u) => u.user === s.me).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const readUpdate = (s: State, id: string): State =>
  s.updates.some((u) => u.id === id && !u.read) ? { ...s, updates: s.updates.map((u) => (u.id === id ? { ...u, read: true } : u)) } : s;

// One update per user, skipping users who aren't accounts (sample reporters).
function notify(s: State, users: Iterable<string>, projectId: string, kind: UpdateKind, now: Date): Update[] {
  return [...new Set(users)]
    .filter((user) => s.accounts.some((a) => a.username === user))
    .map((user) => ({ id: `${kind}-${projectId}-${user}-${now.getTime()}`, user, projectId, kind, createdAt: now.toISOString(), read: false }));
}
const followers = (s: State, projectId: string, except: string[]) =>
  s.accounts.filter((a) => a.followed.includes(projectId) && !except.includes(a.username)).map((a) => a.username);

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
  const me = s.accounts.find((a) => a.username === s.me);
  if (!me) throw new Error("Not logged in");

  const day = now.toLocaleDateString("sv"); // local YYYY-MM-DD
  const last = me.lastReportDay;
  // Several reports on one day count as one streak day.
  const streak = last === day ? me.streak : last && daysBetween(last, day) === 1 ? me.streak + 1 : 1;
  const reportCount = s.reports.filter((r) => r.user === me.username).length + 1;
  const report: Report = {
    ...input,
    note: input.note.trim().slice(0, 500),
    id: `VS-${now.getFullYear()}-${s.nextReportNo}`,
    user: me.username,
    badge: badgeFor(reportCount)!,
    createdAt: now.toISOString(),
    status: "bago",
    confirmed: false,
  };
  return {
    report,
    state: {
      ...s,
      accounts: s.accounts.map((a) => (a === me ? { ...a, streak, lastReportDay: day } : a)),
      projects: s.projects.map((p) => (p.id === input.projectId ? { ...p, reportCount: p.reportCount + 1 } : p)),
      reports: [...s.reports, report],
      updates: [...s.updates, ...notify(s, followers(s, input.projectId, [me.username]), input.projectId, "sinusundan", now)],
      nextReportNo: s.nextReportNo + 1,
    },
  };
}

// Priority list: most urgent first; sites whose reports are all acted on go last.
export const priorityOf = (projects: Project[]) =>
  projects.toSorted((a, b) => +(a.siteStatus === "naaksyunan") - +(b.siteStatus === "naaksyunan") || b.urgency - a.urgency);

// LGU sets how a site's reports are handled (Bago, Tinitingnan, Tapos). Returns the same state when nothing changes.
// Moving reports forward sends an update to their reporters and to the project's followers.
export function setSiteStatus(s: State, projectId: string, status: ReportStatus, now = new Date()): State {
  if (!statusOrder.includes(status)) throw new Error("Unknown status");
  const changed = s.reports.filter((r) => r.projectId === projectId && (r.status ?? "bago") !== status);
  if (!changed.length) return s;
  const owners = changed.map((r) => r.user);
  const updates =
    status === "bago" ? [] : [...notify(s, owners, projectId, status, now), ...notify(s, followers(s, projectId, owners), projectId, "sinusundan", now)];
  return {
    ...s,
    reports: s.reports.map((r) => (changed.includes(r) ? { ...r, status, statusAt: { ...r.statusAt, [status]: now.toISOString() } } : r)),
    updates: [...s.updates, ...updates],
  };
}

// Confirms the site's unconfirmed reports. Doing it again changes nothing.
export function confirmReports(s: State, projectId: string): State {
  if (!s.reports.some((r) => r.projectId === projectId && !r.confirmed)) return s;
  return { ...s, reports: s.reports.map((r) => (r.projectId === projectId ? { ...r, confirmed: true } : r)) };
}

export const toggleFollowed = (s: State, id: string): State => ({
  ...s,
  accounts: s.accounts.map((a) => (a.username !== s.me ? a : { ...a, followed: a.followed.includes(id) ? a.followed.filter((x) => x !== id) : [...a.followed, id] })),
});

// Accounts. Mobile numbers are kept as "09XXXXXXXXX"; "+63 917..." and spaces are accepted.
export function normMobile(m: string) {
  const n = m.replace(/[\s-]/g, "").replace(/^\+?63(?=9)/, "0");
  return /^09\d{9}$/.test(n) ? n : null;
}
// Login takes a username (any letter case) or a mobile number.
export function findAccount(s: State, id: string) {
  const name = id.trim().toLowerCase();
  const mobile = normMobile(id);
  return s.accounts.find((a) => a.username.toLowerCase() === name || a.mobile === mobile);
}

export type SignupInput = { username: string; mobile: string; password: string; terms: boolean };
export type SignupErrors = Partial<Record<keyof SignupInput, string>>;
export function checkSignup(s: State, input: SignupInput): SignupErrors {
  const e: SignupErrors = {};
  const username = input.username.trim();
  const mobile = normMobile(input.mobile);
  // At least one letter, so a username can never look like a mobile number at login.
  if (!/^[A-Za-z0-9_.]{3,20}$/.test(username) || !/[A-Za-z]/.test(username))
    e.username = "Gumamit ng 3 hanggang 20 letra o numero (puwede ang _ at .), may kahit isang letra.";
  else if (findAccount(s, username)) e.username = "May gumagamit na ng username na ito. Pumili ng iba.";
  if (!mobile) e.mobile = "Ilagay ang 11 digit na mobile number na nagsisimula sa 09.";
  else if (s.accounts.some((a) => a.mobile === mobile)) e.mobile = "May account na sa numerong ito. Mag-login na lang.";
  if (input.password.length < 8) e.password = "Dapat 8 o higit pa ang letra o numero ng password.";
  if (!input.terms) e.terms = "Kailangang pumayag sa Terms at Privacy Policy.";
  return e;
}

// Adds a verified account and logs it in. Checks uniqueness again: another tab may have taken the name meanwhile.
export function addAccount(s: State, a: Pick<Account, "username" | "mobile" | "password">): State {
  if (findAccount(s, a.username) || s.accounts.some((x) => x.mobile === a.mobile)) throw new Error("Account exists");
  return { ...s, me: a.username, accounts: [...s.accounts, { ...a, streak: 0, lastReportDay: null, followed: [] }] };
}
export const setPassword = (s: State, username: string, password: string): State => ({
  ...s,
  accounts: s.accounts.map((a) => (a.username === username ? { ...a, password } : a)),
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
  accounts: (Omit<Account, "lastReportDay"> & { lastReport: number })[];
  nextReportNo: number;
  projects: (Omit<ProjectRecord, "startDate" | "targetDate" | "postedAt"> & Offsets)[];
  reports: (Omit<Report, "id" | "createdAt" | "statusAt"> & { daysAgo: number; statusDaysAgo?: Partial<Record<ReportStatus, number>> })[];
  updates: (Omit<Update, "id" | "createdAt" | "read"> & { daysAgo: number; read?: boolean })[];
};

type Old = Omit<State, "version" | "accounts" | "me" | "updates"> & {
  version: number;
  accounts?: Account[];
  me?: string | null;
  user?: Omit<Account, "mobile" | "password">;
  updates: (Omit<Update, "user" | "kind"> & Partial<Update>)[];
};
// Version 1 saved data had no map coordinates: take them from the sample (same ids), else the map center.
// Version 2 had one built-in user and no login: it becomes the demo account, and its updates become "sinusundan".
export function upgrade(s: Old, sample: Sample): State {
  if (s.version === 3) return s as State;
  const at = (id: string) => sample.projects.find((p) => p.id === id) ?? { lng: 120.945, lat: 14.32 };
  if (s.version === 1) s = { ...s, version: 2, projects: s.projects.map((p) => ({ ...p, lng: p.lng ?? at(p.id).lng, lat: p.lat ?? at(p.id).lat })) };
  const demo = sample.accounts[0];
  const { user, ...rest } = s;
  const owner = user?.username ?? demo.username;
  return {
    ...rest,
    version: 3,
    me: null,
    accounts: [{ username: owner, mobile: demo.mobile, password: demo.password, streak: user?.streak ?? 0, lastReportDay: user?.lastReportDay ?? null, followed: user?.followed ?? [] }],
    updates: s.updates.map((u) => ({ ...u, user: owner, kind: u.kind ?? "sinusundan" })),
  };
}

export function seedState(sample: Sample, today: string): State {
  const at = (daysAgo: number) => `${addDays(today, -daysAgo)}T09:00:00.000Z`;
  return {
    version: 3,
    me: null,
    accounts: sample.accounts.map(({ lastReport, ...a }) => ({ ...a, lastReportDay: addDays(today, lastReport) })),
    projects: sample.projects.map(({ start, target, posted, ...p }) => ({
      ...p,
      startDate: addDays(today, start),
      targetDate: addDays(today, target),
      postedAt: addDays(today, posted),
    })),
    reports: sample.reports.map(({ daysAgo, statusDaysAgo, ...r }, i) => ({
      ...r,
      id: `seed-${i}`,
      createdAt: at(daysAgo),
      ...(statusDaysAgo && { statusAt: Object.fromEntries(Object.entries(statusDaysAgo).map(([k, d]) => [k, at(d)])) }),
    })),
    updates: sample.updates.map(({ daysAgo, read = false, ...u }, i) => ({ ...u, id: `seed-${i}`, createdAt: at(daysAgo), read })),
    nextReportNo: sample.nextReportNo,
  };
}
