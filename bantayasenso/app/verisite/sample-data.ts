// Sample data for the clickable VeriSite frontend. Taken from the mockups in docs/verisite-design/screens.
// shortcut: hard-coded, no Supabase/Gemini; replace with real queries when the backend is wired up.
import type { Status } from "@/components/StatusLabel";

export const badges = [
  { name: "Baguhan", min: 1, color: "#6FBF96" },
  { name: "Tanso", min: 10, color: "#C98A4B" },
  { name: "Pilak", min: 25, color: "#A3B2BA" },
  { name: "Ginto", min: 50, color: "#F6C744" },
  { name: "Diyamante", min: 100, color: "#58C4D6" },
] as const;

export type BadgeName = (typeof badges)[number]["name"];

export const user = {
  username: "maria_s",
  streak: 7,
  reportCount: 32,
  badge: "Pilak" as BadgeName,
  followedProjects: 3,
  newUpdates: 2,
};

export type Project = {
  id: string;
  name: string;
  place: string;
  date: string;
  image: "road" | "bridge" | "drain";
  status: Status;
  progress: number; // percent done
  reports: number;
};

// Home feed, newest first.
export const projects: Project[] = [
  { id: "burol", name: "Kalsada sa Burol", place: "Burol Main", date: "Nob 1", image: "road", status: "malapit", progress: 18, reports: 2 },
  { id: "salawag", name: "Tulay sa Salawag", place: "Salawag Rd", date: "Okt 28", image: "bridge", status: "ayon", progress: 25, reports: 0 },
  { id: "aguinaldo", name: "Kanal sa Aguinaldo", place: "Salitran II", date: "Okt 20", image: "drain", status: "lampas", progress: 65, reports: 14 },
];

// Project detail screen (W-Project).
export const projectDetail = {
  name: "Kalsada, Aguinaldo Hwy",
  address: "Brgy. Salitran II, Dasmariñas",
  statusLabel: "Lampas 30 araw",
  status: "lampas" as Status,
  progress: 65,
  reports: 14,
  urgency: 92,
  summary: "Lampas na ito sa nakapaskil na petsa. Maaaring may aprubadong dagdag na panahon, kaya tinitingnan pa ng LGU.",
  budget: "₱4,850,000",
  contractor: "Sample Builders Inc.",
  started: "Ene 15, 2026",
  target: "Okt 4, 2026",
  office: "Sample District Office",
  record: "2 sa 6 ang lampas",
  publicReports: [
    { user: "jun_delacruz", image: "rep-hole", date: "Nob 2", text: "May malaking bukas na hukay sa gilid ng kalsada at walang harang kaya delikado sa mga dumadaan, lalo na sa gabi." },
    { user: "maria_s", image: "rep-dark", date: "Okt 26", text: "Sobrang dilim dito tuwing gabi dahil walang ilaw ang bahaging ginagawa at hirap makita ang kalsada." },
    { user: "ana.reyes", image: "rep-site", date: "Okt 21", text: "Iniwan ang makina sa tabi ng kalsada at walang harang o babala para sa mga naglalakad." },
  ],
};

// Map pins and the LGU priority list (W-Map, W-Priority), most urgent first.
export const priority = [
  { place: "Aguinaldo Hwy", level: "Mataas", issue: "Bukas na hukay", reports: 14, status: "lampas" as Status },
  { place: "Salawag Rd", level: "Mataas", issue: "Walang ilaw", reports: 6, status: "malapit" as Status },
  { place: "Paliparan III", level: "Katamtaman", issue: "Walang harang", reports: 3, status: "ayon" as Status },
  { place: "Burol Main", level: "Mababa", issue: "Lampas sa petsa", reports: 2, status: "lampas" as Status },
  { place: "Governor's Dr", level: "Mababa", issue: "Di pa kumpirmado", reports: 1, status: "di-kumpirmado" as Status },
];

// Aking mga report (W-MyReports). The first one shows its progress steps.
export const myReports = [
  { place: "Aguinaldo Hwy", issue: "Bukas na hukay", date: "Nob 3", status: "bago" as Status },
  { place: "Paliparan III", issue: "Walang harang", date: "Okt 28", status: "naaksyunan" as Status },
  { place: "Salawag Rd", issue: "Walang ilaw", date: "Okt 20", status: "naaksyunan" as Status },
  { place: "Governor's Drive", issue: "Lampas sa petsa", date: "Okt 12", status: "tinitingnan" as Status },
];
