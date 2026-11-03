// Run: node --test app/verisite/store.test.mjs (Node 23.6+ loads the .ts files directly).
import assert from "node:assert/strict";
import test from "node:test";
import { sample } from "./sample-data.ts";
import {
  addAccount, addReport, badgeFor, checkSignup, confirmReports, findAccount, matchProject, normMobile, priorityOf, projectsOf, readUpdate, reportsFor,
  seedState, setSiteStatus, signChecks, toggleFollowed, updatesOf, upgrade, userOf,
} from "./store.ts";

const today = "2026-11-03";
// Fresh install with the demo account logged in.
const fresh = () => ({ ...seedState(sample, today), me: "maria_s" });
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
  const u = userOf(state, today);
  assert.deepEqual([u.reportCount, u.streak, u.badge], [10, 4, "Tanso"], "the 10th report earns Tanso");
  assert.equal(report.badge, "Tanso");
  const again = addReport(state, input, at(today));
  assert.equal(again.state, state, "same draft must not save twice");
  assert.equal(again.report.id, report.id);
  const second = addReport(state, { ...input, draftId: "d2" }, at(today));
  assert.deepEqual([second.report.id, userOf(second.state, today).streak], ["VS-2026-1148", 4], "same day keeps the streak");
  const tomorrow = addReport(second.state, { ...input, draftId: "d3" }, at("2026-11-04")).state;
  assert.equal(userOf(tomorrow, "2026-11-04").streak, 5, "next day adds one");
});

test("streak resets after a missed day", () => {
  assert.equal(userOf(fresh(), "2026-11-05").streak, 0);
  assert.equal(userOf(addReport(fresh(), input, at("2026-11-05")).state, "2026-11-05").streak, 1);
});

test("rejects unknown projects, empty reports and logged-out users", () => {
  assert.throws(() => addReport({ ...fresh(), me: null }, input, at(today)));
  assert.throws(() => addReport(fresh(), { ...input, projectId: "nope" }, at(today)));
  assert.throws(() => addReport(fresh(), { ...input, issues: [] }, at(today)));
});

test("public reports: higher badge first", () => {
  const list = reportsFor(fresh(), "aguinaldo");
  assert.deepEqual(list.map((r) => r.badge), ["Ginto", "Tanso", "Baguhan", "Baguhan", "Baguhan", "Baguhan"]);
  assert.ok(list[2].createdAt > list[3].createdAt, "same badge: newest first");
});

test("paskil vs record, and matching on Contract ID", () => {
  const p = fresh().projects.find((x) => x.id === "aguinaldo");
  const sign = { contract_id: p.contractId, title: p.name, contractor: p.contractor, implementing_office: null, budget_php: 5_200_000, start_date: p.startDate, target_date: p.targetDate };
  assert.deepEqual(signChecks(p, sign).filter((r) => r.wrong).map((r) => r.label), ["Halaga"]);
  assert.equal(signChecks(p, null).some((r) => r.wrong), false);
  assert.equal(matchProject(fresh().projects, sign).id, "aguinaldo");
  assert.equal(matchProject(fresh().projects, { ...sign, contract_id: "26KCDO42" }).id, "aguinaldo");
  assert.equal(matchProject(fresh().projects, null), undefined);
});

const site = (s, id) => projectsOf(s, today).find((p) => p.id === id);

test("urgency score: reports + open hazards + days late, ranked on Priority", () => {
  const a = site(fresh(), "aguinaldo");
  assert.deepEqual(a.score, { reports: 42, hazard: 35, late: 20, total: 97, level: "Mataas", topHazard: "Bukas na hukay" });
  assert.deepEqual(priorityOf(projectsOf(fresh(), today)).map((p) => p.id), ["aguinaldo", "burol", "salawag", "paliparan"]);
  const more = addReport(fresh(), { ...input, projectId: "burol", issues: ["Bukas na hukay"] }, at(today)).state;
  assert.equal(site(more, "burol").urgency, 9 + 25, "a new hazard report raises the score");
});

test("LGU status: Tapos drops hazards and the rank; a new report reopens the site", () => {
  const done = setSiteStatus(fresh(), "aguinaldo", "naaksyunan");
  assert.equal(site(done, "aguinaldo").siteStatus, "naaksyunan");
  assert.equal(site(done, "aguinaldo").score.hazard, 0);
  assert.deepEqual(priorityOf(projectsOf(done, today)).map((p) => p.id), ["burol", "salawag", "aguinaldo", "paliparan"], "acted-on sites go last");
  assert.equal(setSiteStatus(done, "aguinaldo", "naaksyunan"), done, "same status changes nothing");
  const f = fresh();
  assert.equal(setSiteStatus(f, "salawag", "tinitingnan"), f, "no reports, nothing to set");
  const reopened = addReport(done, input, at(today)).state;
  assert.equal(site(reopened, "aguinaldo").siteStatus, "bago");
  assert.throws(() => setSiteStatus(fresh(), "aguinaldo", "x"));
});

test("confirming reports happens once", () => {
  const once = confirmReports(fresh(), "aguinaldo");
  assert.equal(site(once, "aguinaldo").unconfirmed, 0);
  assert.equal(confirmReports(once, "aguinaldo"), once);
  assert.equal(site(once, "burol").unconfirmed, 2, "other sites untouched");
  assert.equal(site(addReport(once, input, at(today)).state, "aguinaldo").unconfirmed, 1);
});

test("version 1 data gets map coordinates and its user becomes the demo account", () => {
  const { version, accounts, me, ...rest } = seedState(sample, today);
  const user = { username: "maria_s", reportCount: 32, streak: 7, lastReportDay: today, followed: ["burol"] };
  const old = {
    ...rest,
    version: 1,
    user,
    updates: [{ id: "u", projectId: "burol", text: "x", createdAt: today, read: false }],
    projects: rest.projects.map((p) => ({ ...p, lng: undefined, lat: undefined })).concat({ id: "new" }),
  };
  const up = upgrade(old, sample);
  assert.equal(up.version, 3);
  assert.equal(up.projects[2].lng, sample.projects[2].lng);
  assert.equal(up.projects[4].lat, 14.32);
  assert.equal(up.user, undefined);
  assert.deepEqual([up.me, up.accounts[0].username, up.accounts[0].password, up.accounts[0].streak], [null, "maria_s", accounts[0].password, 7]);
  assert.deepEqual([up.updates[0].user, up.updates[0].kind], ["maria_s", "sinusundan"]);
  assert.equal(version, 3);
  assert.equal(me, null, "a fresh install starts logged out");
});

test("badges by report count", () => {
  assert.deepEqual([0, 1, 9, 10, 25, 49, 50, 100].map(badgeFor), [null, "Baguhan", "Baguhan", "Tanso", "Pilak", "Pilak", "Ginto", "Diyamante"]);
});

const ok = { username: "juan.dc", mobile: "0918 555 1234", password: "12345678", terms: true };

test("signup checks each field; usernames and numbers are unique", () => {
  const s = fresh();
  assert.deepEqual(checkSignup(s, ok), {});
  assert.deepEqual(Object.keys(checkSignup(s, { username: "", mobile: "123", password: "short", terms: false })).sort(), ["mobile", "password", "terms", "username"]);
  assert.ok(checkSignup(s, { ...ok, username: "MARIA_S" }).username, "taken, any letter case");
  assert.ok(checkSignup(s, { ...ok, username: "09181234567" }).username, "must have a letter");
  assert.ok(checkSignup(s, { ...ok, username: "a b" }).username);
  assert.ok(checkSignup(s, { ...ok, mobile: "+63 917 123 1234" }).mobile, "the demo's number is taken");
  assert.equal(normMobile("+63 918-555-1234"), "09185551234");
  assert.equal(normMobile("0918555123"), null);
});

const juan = (s) => addAccount(s, { username: "juan.dc", mobile: "09185551234", password: "h" });

test("new account: logged in, empty numbers, findable by name or number", () => {
  const s = juan(fresh());
  assert.equal(s.me, "juan.dc");
  assert.deepEqual(userOf(s, today), { username: "juan.dc", mobile: "09185551234", followed: [], reportCount: 0, streak: 0, badge: null, unread: 0 });
  assert.deepEqual(updatesOf(s), []);
  assert.equal(findAccount(s, "JUAN.DC").username, "juan.dc");
  assert.equal(findAccount(s, "0918 555 1234").username, "juan.dc");
  assert.throws(() => juan(s), "no duplicates");
  const first = addReport(s, { ...input, draftId: "j1" }, at(today)).state;
  const u = userOf(first, today);
  assert.deepEqual([u.reportCount, u.badge, u.streak], [1, "Baguhan", 1]);
  assert.equal(userOf({ ...first, me: "maria_s" }, today).reportCount, 9, "other accounts unchanged");
});

test("updates: LGU status moves and followed projects", () => {
  // juan follows burol; maria reported there.
  const s = toggleFollowed(juan(fresh()), "burol");
  const done = setSiteStatus(s, "burol", "naaksyunan", at(today));
  const forMaria = updatesOf({ ...done, me: "maria_s" }).filter((u) => !u.id.startsWith("seed"));
  assert.deepEqual(forMaria.map((u) => [u.kind, u.projectId]), [["naaksyunan", "burol"]], "one update, not one per report");
  assert.deepEqual(updatesOf(done).map((u) => u.kind), ["sinusundan"], "follower gets news");
  assert.ok(done.reports.filter((r) => r.projectId === "burol").every((r) => r.statusAt.naaksyunan), "timeline date saved");
  assert.equal(setSiteStatus(s, "burol", "bago", at(today)).updates.length, s.updates.length, "moving back sends nothing");

  // juan reports on aguinaldo, which maria follows.
  const reported = addReport(s, { ...input, draftId: "j2" }, at(today)).state;
  const news = updatesOf({ ...reported, me: "maria_s" }).filter((u) => !u.id.startsWith("seed"));
  assert.deepEqual(news.map((u) => [u.kind, u.projectId]), [["sinusundan", "aguinaldo"]]);
  assert.equal(updatesOf(reported).length, 0, "no update about your own report");

  const unread = userOf({ ...done, me: "maria_s" }, today).unread;
  const read = readUpdate({ ...done, me: "maria_s" }, forMaria[0].id);
  assert.equal(userOf(read, today).unread, unread - 1);
  assert.equal(readUpdate(read, forMaria[0].id), read, "reading twice changes nothing");
});
