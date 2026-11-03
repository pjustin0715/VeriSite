// Run: node --test app/verisite/filters.test.mjs (Node 23.6+ loads the .ts file directly).
import assert from "node:assert/strict";
import test from "node:test";
import { applyFilters, noFilters, parseFilters, toQuery } from "./filters.ts";

const projects = [
  { id: "a", status: "malapit", type: "kalsada", near: true, reportCount: 2 },
  { id: "b", status: "ayon", type: "tulay", near: true, reportCount: 0 },
  { id: "c", status: "lampas", type: "kanal", near: false, reportCount: 14 },
  { id: "d", status: "tapos", type: "kalsada", near: false, reportCount: 3 },
];
const ids = (f) => applyFilters(projects, f).map((p) => p.id).join("");

test("no filters shows everything, newest first", () => {
  assert.equal(ids(noFilters), "abcd");
});

test("filters combine; several picks in one group widen it", () => {
  assert.equal(ids({ ...noFilters, type: ["kalsada"] }), "ad");
  assert.equal(ids({ ...noFilters, status: ["lampas", "ayon"] }), "bc");
  assert.equal(ids({ ...noFilters, type: ["kalsada"], near: true }), "a");
  assert.equal(ids({ ...noFilters, type: ["gusali"] }), "");
});

test("sorting", () => {
  assert.equal(ids({ ...noFilters, sort: "luma" }), "dcba");
  assert.equal(ids({ ...noFilters, sort: "report" }), "cdab");
});

test("URL round trip drops unknown values and defaults", () => {
  const f = parseFilters({ sort: "report", status: ["lampas", "bogus"], type: "tulay", near: "1" });
  assert.deepEqual(f, { sort: "report", status: ["lampas"], type: ["tulay"], near: true });
  assert.deepEqual(parseFilters(Object.fromEntries(new URLSearchParams(toQuery(f)))), { ...f, status: ["lampas"] });
  assert.equal(toQuery(noFilters), "");
  assert.deepEqual(parseFilters({ sort: "x" }), noFilters);
  // Home reads the URL with getAll(), so every value can arrive as a list.
  assert.deepEqual(parseFilters({ sort: ["luma"], near: ["1"], type: ["kanal"] }), { ...noFilters, sort: "luma", near: true, type: ["kanal"] });
});

