// Run: node --test app/verisite/store.test.mjs (Node 23.6+ loads the .ts files directly).
import assert from "node:assert/strict";
import test from "node:test";
import { sample } from "./sample-data.ts";
import { addReport, matchProject, projectsOf, reportsFor, seedState, signChecks, userOf } from "./store.ts";

const today = "2026-11-03";
const fresh = () => seedState(sample, today);
const at = (day) => new Date(`${day}T10:00`);
const input = { projectId: "aguinaldo", photo: "x", issues: ["Halaga"], note: "  hi  ", draftId: "d1" };

test("statuses and order come from dates and progress", () => {
  const ps = projectsOf(fresh(), today);
  assert.deepEqual(ps.map((p) => `${p.id}:${p.status}`), ["burol:malapit", "salawag:ayon", "aguinaldo:lampas", "paliparan:tapos"]);
  assert.equal(ps.find((p) => p.id === "aguinaldo").daysLate, 30);
});

test("a report saves once, counts, and grows the streak", () => {
  const { state, report } = addReport(fresh(), input, at(today));
  assert.equal(report.id, "VS-2026-1147");
  assert.equal(report.note, "hi");
  assert.equal(state.projects.find((p) => p.id === "aguinaldo").reportCount, 15);
  assert.deepEqual([state.user.reportCount, state.user.streak, state.user.lastReportDay], [33, 8, today]);
  const again = addReport(state, input, at(today));
  assert.equal(again.state, state, "same draft must not save twice");
  assert.equal(again.report.id, report.id);
  const second = addReport(state, { ...input, draftId: "d2" }, at(today));
  assert.deepEqual([second.report.id, second.state.user.streak], ["VS-2026-1148", 8], "same day keeps the streak");
});

test("streak resets after a missed day", () => {
  assert.equal(userOf(fresh(), "2026-11-05").streak, 0);
  assert.equal(addReport(fresh(), input, at("2026-11-05")).state.user.streak, 1);
});

test("rejects unknown projects and empty reports", () => {
  assert.throws(() => addReport(fresh(), { ...input, projectId: "nope" }, at(today)));
  assert.throws(() => addReport(fresh(), { ...input, issues: [] }, at(today)));
});

test("public reports: higher badge first", () => {
  assert.deepEqual(reportsFor(fresh(), "aguinaldo").map((r) => r.badge), ["Ginto", "Pilak", "Tanso"]);
});

test("paskil vs record, and matching on Contract ID", () => {
  const p = fresh().projects.find((x) => x.id === "aguinaldo");
  const sign = { contract_id: p.contractId, title: p.name, contractor: p.contractor, implementing_office: null, budget_php: 5_200_000, start_date: p.startDate, target_date: p.targetDate };
  assert.deepEqual(signChecks(p, sign).filter((r) => r.wrong).map((r) => r.label), ["Halaga"]);
  assert.equal(signChecks(p, null).some((r) => r.wrong), false);
  assert.equal(matchProject(fresh().projects, sign).id, "aguinaldo");
  assert.equal(matchProject(fresh().projects, null), undefined);
});
