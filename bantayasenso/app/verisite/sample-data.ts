// What a fresh install starts with (data.ts writes it to localStorage once). All projects and people are fictional.
// Dates are day offsets from that first day, so statuses (lampas, malapit...) come out the same on any day.
import type { Sample } from "./store";

export const sample: Sample = {
  // Demo account for judges: maria_s / verisite123 (password stored as SHA-256 of "maria_s:verisite123").
  // 9 reports, so one more report earns Tanso; reports 1, 2 and 3 days ago make a 3-day streak.
  accounts: [
    {
      username: "maria_s", mobile: "09171231234", password: "bfa169945abe11f727d14e4be7e895045319da6f8016502d9c3929aac9519806",
      streak: 3, lastReport: -1, followed: ["aguinaldo", "burol"],
    },
  ],
  nextReportNo: 1147,
  projects: [
    {
      id: "burol", name: "Kalsada sa Burol", place: "Burol Main", address: "Brgy. Burol Main, Dasmariñas", image: "road", type: "kalsada", near: true,
      contractId: "26KC0011", contractor: "Sample Road Works Co.", office: "Sample District Office", budget: 3_200_000,
      start: -60, target: 20, posted: -2, progress: 18, record: "0 sa 3 ang lampas", reportCount: 2, lng: 120.9198, lat: 14.3136,
    },
    {
      id: "salawag", name: "Tulay sa Salawag", place: "Salawag Rd", address: "Brgy. Salawag, Dasmariñas", image: "bridge", type: "tulay", near: true,
      contractId: "26KC0027", contractor: "Sample Bridge Builders", office: "Sample District Office", budget: 12_500_000,
      start: -40, target: 150, posted: -6, progress: 25, record: "1 sa 8 ang lampas", reportCount: 0, lng: 120.963, lat: 14.3332,
    },
    {
      id: "aguinaldo", name: "Kanal sa Aguinaldo", place: "Salitran II", address: "Brgy. Salitran II, Dasmariñas", image: "drain", type: "kanal", near: false,
      contractId: "26KC0042", contractor: "Sample Builders Inc.", office: "Sample District Office", budget: 4_850_000,
      start: -292, target: -30, posted: -14, progress: 65, record: "2 sa 6 ang lampas", reportCount: 14, lng: 120.9213, lat: 14.3365,
    },
    {
      id: "paliparan", name: "Kalsada sa Paliparan", place: "Paliparan III", address: "Brgy. Paliparan III, Dasmariñas", image: "road", type: "kalsada", near: false,
      contractId: "26KC0008", contractor: "Sample Paving Corp.", office: "Sample District Office", budget: 2_750_000,
      start: -200, target: -25, posted: -22, progress: 100, record: "0 sa 4 ang lampas", reportCount: 3, lng: 120.9339, lat: 14.323,
    },
  ],
  reports: [
    {
      projectId: "aguinaldo", user: "jun_delacruz", badge: "Ginto", daysAgo: 1, photo: "/verisite/rep-hole.png", issues: ["Bukas na hukay", "Walang harang"],
      note: "May malaking bukas na hukay sa gilid ng kalsada at walang harang kaya delikado sa mga dumadaan, lalo na sa gabi.",
    },
    {
      projectId: "aguinaldo", user: "maria_s", badge: "Baguhan", daysAgo: 1, photo: "/verisite/rep-dark.png", issues: ["Walang ilaw"],
      note: "Sobrang dilim dito tuwing gabi dahil walang ilaw ang bahaging ginagawa at hirap makita ang kalsada.",
    },
    {
      projectId: "aguinaldo", user: "ana.reyes", badge: "Tanso", daysAgo: 13, photo: "/verisite/rep-site.png", issues: ["Walang harang"],
      note: "Iniwan ang makina sa tabi ng kalsada at walang harang o babala para sa mga naglalakad.",
    },
    { projectId: "aguinaldo", user: "maria_s", badge: "Baguhan", daysAgo: 16, photo: "/verisite/rep-site.png", issues: ["Mali sa paskil: Petsa ng pagtatapos"], note: "" },
    { projectId: "aguinaldo", user: "maria_s", badge: "Baguhan", daysAgo: 30, photo: "/verisite/rep-hole.png", issues: ["Walang harang"], note: "" },
    {
      projectId: "burol", user: "maria_s", badge: "Baguhan", daysAgo: 2, photo: "/verisite/rep-dark.png", issues: ["Walang ilaw"],
      note: "Walang ilaw sa may kanto ng ginagawang kalsada.", status: "tinitingnan", statusDaysAgo: { tinitingnan: 0 },
    },
    { projectId: "burol", user: "maria_s", badge: "Baguhan", daysAgo: 21, photo: "/verisite/rep-site.png", issues: ["Walang paskil sa lugar"], note: "", status: "tinitingnan", statusDaysAgo: { tinitingnan: 0 } },
    {
      projectId: "paliparan", user: "maria_s", badge: "Baguhan", daysAgo: 3, photo: "/verisite/rep-hole.png", issues: ["Walang harang"],
      note: "Walang harang sa tabi ng hukay.", status: "naaksyunan", statusDaysAgo: { tinitingnan: 2, naaksyunan: 1 },
    },
    { projectId: "paliparan", user: "maria_s", badge: "Baguhan", daysAgo: 26, photo: "/verisite/rep-site.png", issues: ["Walang harang"], note: "", status: "naaksyunan", statusDaysAgo: { tinitingnan: 2, naaksyunan: 1 } },
    { projectId: "paliparan", user: "maria_s", badge: "Baguhan", daysAgo: 41, photo: "/verisite/rep-dark.png", issues: ["Walang ilaw"], note: "", status: "naaksyunan", statusDaysAgo: { tinitingnan: 2, naaksyunan: 1 } },
    { projectId: "aguinaldo", user: "maria_s", badge: "Baguhan", daysAgo: 45, photo: "/verisite/rep-dark.png", issues: ["Walang ilaw"], note: "" },
  ],
  updates: [
    { user: "maria_s", projectId: "burol", kind: "tinitingnan", daysAgo: 0 },
    { user: "maria_s", projectId: "paliparan", kind: "naaksyunan", daysAgo: 1 },
    { user: "maria_s", projectId: "aguinaldo", kind: "sinusundan", daysAgo: 1, read: true },
  ],
};
