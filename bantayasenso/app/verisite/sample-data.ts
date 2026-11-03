// What a fresh install starts with (data.ts writes it to localStorage once). All projects and people are fictional.
// Dates are day offsets from that first day, so statuses (lampas, malapit...) come out the same on any day.
import type { Sample } from "./store";

export const sample: Sample = {
  user: { username: "maria_s", reportCount: 32, streak: 7, lastReport: -1, followed: ["aguinaldo", "burol"] },
  nextReportNo: 1147,
  projects: [
    {
      id: "burol", name: "Kalsada sa Burol", place: "Burol Main", address: "Brgy. Burol Main, Dasmariñas", image: "road", type: "kalsada", near: true,
      contractId: "26KC0011", contractor: "Sample Road Works Co.", office: "Sample District Office", budget: 3_200_000,
      start: -60, target: 20, posted: -2, progress: 18, record: "0 sa 3 ang lampas", reportCount: 2,
    },
    {
      id: "salawag", name: "Tulay sa Salawag", place: "Salawag Rd", address: "Brgy. Salawag, Dasmariñas", image: "bridge", type: "tulay", near: true,
      contractId: "26KC0027", contractor: "Sample Bridge Builders", office: "Sample District Office", budget: 12_500_000,
      start: -40, target: 150, posted: -6, progress: 25, record: "1 sa 8 ang lampas", reportCount: 0,
    },
    {
      id: "aguinaldo", name: "Kanal sa Aguinaldo", place: "Salitran II", address: "Brgy. Salitran II, Dasmariñas", image: "drain", type: "kanal", near: false,
      contractId: "26KC0042", contractor: "Sample Builders Inc.", office: "Sample District Office", budget: 4_850_000,
      start: -292, target: -30, posted: -14, progress: 65, record: "2 sa 6 ang lampas", reportCount: 14,
    },
    {
      id: "paliparan", name: "Kalsada sa Paliparan", place: "Paliparan III", address: "Brgy. Paliparan III, Dasmariñas", image: "road", type: "kalsada", near: false,
      contractId: "26KC0008", contractor: "Sample Paving Corp.", office: "Sample District Office", budget: 2_750_000,
      start: -200, target: -25, posted: -22, progress: 100, record: "0 sa 4 ang lampas", reportCount: 3,
    },
  ],
  reports: [
    {
      projectId: "aguinaldo", user: "jun_delacruz", badge: "Ginto", daysAgo: 1, photo: "/verisite/rep-hole.png", issues: ["Bukas na hukay", "Walang harang"],
      note: "May malaking bukas na hukay sa gilid ng kalsada at walang harang kaya delikado sa mga dumadaan, lalo na sa gabi.",
    },
    {
      projectId: "aguinaldo", user: "maria_s", badge: "Pilak", daysAgo: 8, photo: "/verisite/rep-dark.png", issues: ["Walang ilaw"],
      note: "Sobrang dilim dito tuwing gabi dahil walang ilaw ang bahaging ginagawa at hirap makita ang kalsada.",
    },
    {
      projectId: "aguinaldo", user: "ana.reyes", badge: "Tanso", daysAgo: 13, photo: "/verisite/rep-site.png", issues: ["Walang harang"],
      note: "Iniwan ang makina sa tabi ng kalsada at walang harang o babala para sa mga naglalakad.",
    },
  ],
  updates: [
    { projectId: "aguinaldo", text: "May bagong report sa Kanal sa Aguinaldo.", daysAgo: 1 },
    { projectId: "burol", text: "Malapit na ang petsa ng pagtatapos ng Kalsada sa Burol.", daysAgo: 2 },
  ],
};
