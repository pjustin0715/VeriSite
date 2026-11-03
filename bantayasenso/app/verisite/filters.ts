// Home feed filters, kept in the URL (?sort=&status=&type=&near=1) so Home and the Filter sheet share them.
// Nothing picked = no filter. Self-check: `node --test app/verisite/filters.test.mjs`.
import type { Project } from "./sample-data";

export const sorts = { bago: "Pinakabago", luma: "Pinakaluma", report: "Pinakamaraming report" };
export const statuses = { lampas: "Lampas sa petsa", malapit: "Malapit na", ayon: "Ayon sa plano", tapos: "Tapos na" };
export const types = { kalsada: "Kalsada", tulay: "Tulay", kanal: "Kanal", gusali: "Gusali" };

export type Filters = {
  sort: keyof typeof sorts;
  status: (keyof typeof statuses)[];
  type: (keyof typeof types)[];
  near: boolean;
};
export const noFilters: Filters = { sort: "bago", status: [], type: [], near: false };

type Params = Record<string, string | string[] | undefined>;

// URL values are user input: keep only known options.
function pick<T extends object>(options: T, value: string | string[] | undefined) {
  return [value ?? []].flat().filter((v): v is Extract<keyof T, string> => Object.hasOwn(options, v));
}

export function parseFilters(p: Params): Filters {
  return {
    sort: pick(sorts, p.sort)[0] ?? "bago",
    status: pick(statuses, p.status),
    type: pick(types, p.type),
    near: p.near === "1",
  };
}

// Query string without the leading "?"; defaults are left out so a clean feed has a clean URL.
export function toQuery(f: Filters) {
  const q = new URLSearchParams();
  if (f.sort !== "bago") q.set("sort", f.sort);
  f.status.forEach((s) => q.append("status", s));
  f.type.forEach((t) => q.append("type", t));
  if (f.near) q.set("near", "1");
  return q.toString();
}

export function applyFilters(projects: Project[], f: Filters) {
  const shown = projects.filter(
    (p) =>
      (!f.status.length || f.status.includes(p.status as Filters["status"][number])) &&
      (!f.type.length || f.type.includes(p.type)) &&
      (!f.near || p.near),
  );
  // `projects` is already newest first.
  if (f.sort === "luma") shown.reverse();
  if (f.sort === "report") shown.sort((a, b) => b.reports - a.reports);
  return shown;
}
