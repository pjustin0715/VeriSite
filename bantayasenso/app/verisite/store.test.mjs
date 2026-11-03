// Run: node --test app/verisite/store.test.mjs (Node 23.6+ loads the .ts files directly).
import assert from "node:assert/strict";
import test from "node:test";
import { sample } from "./sample-data.ts";
import { addReport, confirmReports, matchProject, priorityOf, projectsOf, reportsFor, seedState, setSiteStatus, signChecks, upgrade, userOf } from "./store.ts";

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

const site = (s, id) => projectsOf(s, today).find((p) => p.id === id);

test("urgency score: reports + open hazards + days late, ranked on Priority", () => {
  const a = site(fresh(), "aguinaldo");
  assert.deepEqual(a.score, { reports: 42, hazard: 35, late: 20, total: 97, level: "Mataas", topHazard: "Bukas na hukay" });
  assert.deepEqual(priorityOf(projectsOf(fresh(), today)).map((p) => p.id), ["aguinaldo", "paliparan", "burol", "salawag"]);
  const more = addReport(fresh(), { ...input, projectId: "burol", issues: ["Bukas na hukay"] }, at(today)).state;
  assert.equal(site(more, "burol").urgency, 9 + 20, "a new hazard report raises the score");
});

test("LGU status: Tapos drops hazards and the rank; a new report reopens the site", () => {
  const done = setSiteStatus(fresh(), "aguinaldo", "naaksyunan");
  assert.equal(site(done, "aguinaldo").siteStatus, "naaksyunan");
  assert.equal(site(done, "aguinaldo").score.hazard, 0);
  assert.equal(priorityOf(projectsOf(done, today)).at(-1).id, "aguinaldo");
  assert.equal(setSiteStatus(done, "aguinaldo", "naaksyunan"), done, "same status changes nothing");
  assert.equal(setSiteStatus(fresh(), "salawag", "tinitingnan").reports.length, 3, "no reports, nothing to set");
  const reopened = addReport(done, input, at(today)).state;
  assert.equal(site(reopened, "aguinaldo").siteStatus, "bago");
  assert.throws(() => setSiteStatus(fresh(), "aguinaldo", "x"));
});

test("confirming reports happens once", () => {
  const once = confirmReports(fresh(), "aguinaldo");
  assert.equal(site(once, "aguinaldo").unconfirmed, 0);
  assert.equal(confirmReports(once, "aguinaldo"), once);
  assert.equal(site(once, "burol").unconfirmed, 0, "other sites untouched (none saved there)");
  assert.equal(site(addReport(once, input, at(today)).state, "aguinaldo").unconfirmed, 1);
});

test("version 1 data gets map coordinates", () => {
  const { version, ...rest } = fresh();
  const old = { ...rest, version: 1, projects: rest.projects.map((p) => ({ ...p, lng: undefined, lat: undefined })).concat({ id: "new" }) };
  const up = upgrade(old, sample);
  assert.equal(up.version, 2);
  assert.equal(up.projects[2].lng, sample.projects[2].lng);
  assert.equal(up.projects[4].lat, 14.32);
  assert.equal(version, 2);
});
