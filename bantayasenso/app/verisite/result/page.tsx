"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ButtonLink from "@/components/ButtonLink";
import Card from "@/components/Card";
import Icon, { type IconName } from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import type { HazardReading } from "../ai";
import { clearDraft, getDraft, sendReport, today, useData, useDraft, type Draft } from "../data";
import { matchProject, projectsOf, signChecks, type Project, type State } from "../store";

const bigBox = "size-[26px] flex-none cursor-pointer accent-ayon disabled:cursor-not-allowed";
const redWhenChecked = "has-checked:shadow-[inset_0_0_0_1.5px_#F2B8B2,0_10px_20px_rgba(201,52,43,.08)]";

// Hazard rows. `bad` = the reading that means a problem; null from the AI = not sure.
const hazardRows: { key: keyof HazardReading; label: string; icon: IconName; bad: boolean }[] = [
  { key: "open_excavation", label: "Bukas na hukay", icon: "hole", bad: true },
  { key: "barricade_visible", label: "Walang harang", icon: "barrier", bad: false },
  { key: "warning_light_visible", label: "Walang ilaw", icon: "bulb", bad: false },
];
const hazardNote = (v: boolean | null, bad: boolean) => (v === null ? "Hindi sigurado ang AI" : v === bad ? "Nakita sa litrato" : "Hindi nakita ng AI");

function Tile({ icon, className }: { icon: IconName; className: string }) {
  return (
    <span className={`flex size-10 flex-none items-center justify-center rounded-[14px] bg-[#7C8B90] ${className}`}>
      <Icon name={icon} size={23} color="#FFFFFF" strokeWidth={2.1} />
    </span>
  );
}

function Text({ title, note }: { title: string; note: string }) {
  return (
    <span className="grow text-17 leading-[1.2] font-semibold">
      {title}
      <span className="block text-15 font-medium text-muted">{note}</span>
    </span>
  );
}

// One checkable finding. Checked = red tile and outline; unchecked = gray, no outline.
function CheckCard({ icon, title, note, checked, onChange }: { icon: IconName; title: string; note: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className={`group flex cursor-pointer items-center gap-[11px] rounded-card bg-white px-3 py-2.5 shadow-card ${redWhenChecked}`}>
      <Tile icon={icon} className="group-has-checked:bg-lampas" />
      <Text title={title} note={note} />
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className={bigBox} />
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-1 text-base font-bold">{children}</h2>;
}

// Scan result (W-Result): project match, AI checks, the user's own description, then send.
export default function ResultPage() {
  const router = useRouter();
  const data = useData();
  const draft = useDraft();

  // Runs on load and each time Next shows this kept-alive page again; reads storage directly, not render state.
  useEffect(() => {
    if (!getDraft()?.ai) router.replace("/verisite/scan"); // nothing scanned (or already sent)
  }, [router]);

  // key: a new scan gets a fresh form, even when Next reuses this page.
  return data && draft?.ai ? <ResultForm key={draft.id} data={data} draft={draft as Required<Pick<Draft, "ai">> & Draft} /> : null;
}

function ResultForm({ data, draft }: { data: State; draft: Draft & Required<Pick<Draft, "ai">> }) {
  const router = useRouter();
  const projects = projectsOf(data, today());
  const { sign, hazard } = draft.ai;
  const wrongKeys = (p?: Project) => new Set(p ? signChecks(p, sign).filter((r) => r.wrong).map((r) => r.key) : []);

  const [projectId, setProjectId] = useState(draft.projectId ?? matchProject(projects, sign)?.id);
  const project = projects.find((p) => p.id === projectId);
  const [signPicked, setSignPicked] = useState(() => wrongKeys(project));
  const [signOpen, setSignOpen] = useState(true);
  const [noSign, setNoSign] = useState(false);
  const [hazards, setHazards] = useState(() => new Set(hazardRows.filter((h) => hazard[h.key] === h.bad).map((h) => h.label)));
  const [note, setNote] = useState("");
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = project ? signChecks(project, sign) : [];
  const aiWrong = rows.filter((r) => r.wrong).length;
  const found = aiWrong > 0 || hazardRows.some((h) => hazard[h.key] === h.bad);
  const toggle = <T,>(set: Set<T>, value: T, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(value);
    else next.delete(value);
    return next;
  };

  function pickProject(p: Project) {
    setProjectId(p.id);
    setSignPicked(wrongKeys(p)); // the paskil is now compared with this project's record
    setPicking(false);
    setError("");
  }

  // "Mali ang impormasyon": on = the AI's mismatches (or open the list to choose), off = clear every field.
  function toggleWrongInfo(on: boolean) {
    if (!on) return setSignPicked(new Set());
    const wrong = wrongKeys(project);
    if (wrong.size) setSignPicked(wrong);
    setSignOpen(true);
  }

  function toggleNoSign(on: boolean) {
    setNoSign(on);
    if (on) setSignPicked(new Set()); // no paskil means nothing on it can be wrong
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!project) return setError("Pumili muna ng proyekto.");
    const issues = [
      ...(noSign ? ["Walang paskil sa lugar"] : rows.filter((r) => signPicked.has(r.key)).map((r) => `Mali sa paskil: ${r.label}`)),
      ...hazardRows.filter((h) => hazards.has(h.label)).map((h) => h.label),
    ];
    if (!issues.length) return setError("Pumili ng kahit isang problema.");
    setError("");
    setSaving(true);
    try {
      const report = await sendReport({ projectId: project.id, photo: draft.photo, issues, note, draftId: draft.id });
      clearDraft();
      router.replace(`/verisite/sent?id=${report.id}`);
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "QuotaExceededError"
          ? "Puno na ang storage ng app sa phone na ito. Hindi naipadala ang report."
          : "Hindi naipadala ang report. Subukan ulit.",
      );
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        image={found ? "head-worry" : "head-happy"}
        back="/verisite/scan"
        backIcon="close"
        title={found ? <>May nakita ang<br />AI</> : <>Walang nakita<br />ang AI</>}
      >
        <Card className="flex items-center gap-[11px] py-2 pr-3 pl-2">
          <Image src={draft.photo} alt="Ang litratong kinuha mo" width={128} height={112} unoptimized className="h-14 w-16 flex-none rounded-[13px] object-cover" />
          <Text title={project?.name ?? "Walang tugmang proyekto"} note={project ? project.place : "Pumili ng proyekto"} />
          <button type="button" onClick={() => setPicking(true)} className="cursor-pointer text-base font-bold text-link">
            {project ? "Palitan" : "Pumili"}
          </button>
        </Card>

        <SectionTitle>Paskil</SectionTitle>
        <div
          className={`group overflow-hidden rounded-card bg-white px-3 pb-1 shadow-card has-[>div>input:checked]:shadow-[inset_0_0_0_1.5px_#F2B8B2,0_10px_20px_rgba(201,52,43,.08)] ${noSign ? "opacity-50" : ""}`}
        >
          <div className="flex items-center gap-[11px] py-2.5">
            <Tile icon="sign" className="group-has-[>div>input:checked]:bg-lampas" />
            <Text
              title="Mali ang impormasyon"
              note={!sign ? "Walang nabasang paskil" : aiWrong ? `${aiWrong} ang hindi tugma sa rekord` : "Tugma sa rekord ang nabasa"}
            />
            <button
              type="button"
              onClick={() => setSignOpen(!signOpen)}
              aria-expanded={signOpen}
              aria-controls="sign-fields"
              aria-label={signOpen ? "Itago ang mga detalye" : "Ipakita ang mga detalye"}
              disabled={noSign || !project}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed"
            >
              <span className={signOpen ? "rotate-180" : ""}>
                <Icon name="chevron" size={20} color="#5F6E74" strokeWidth={2.4} />
              </span>
            </button>
            <input
              type="checkbox"
              checked={signPicked.size > 0}
              onChange={(e) => toggleWrongInfo(e.target.checked)}
              disabled={noSign || !project}
              aria-label="Mali ang impormasyon"
              className={bigBox}
            />
          </div>
          {signOpen && !noSign && project && (
            <div id="sign-fields">
              {rows.map((r) => (
                <label key={r.key} className={`flex cursor-pointer items-center gap-2.5 border-t border-line py-[9px] text-base leading-[1.2] ${r.wrong ? "font-semibold" : ""}`}>
                  <input
                    type="checkbox"
                    checked={signPicked.has(r.key)}
                    onChange={(e) => setSignPicked(toggle(signPicked, r.key, e.target.checked))}
                    className="size-6 flex-none cursor-pointer accent-ayon"
                  />
                  <span>
                    {r.label}
                    {r.detail && <span className="block text-14 font-medium text-muted">{r.detail}</span>}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        <CheckCard icon="warning" title="Walang paskil sa lugar" note="Piliin kung wala kang nakita" checked={noSign} onChange={toggleNoSign} />

        <SectionTitle>Sa lugar ng proyekto</SectionTitle>
        {hazardRows.map((h) => (
          <CheckCard
            key={h.key}
            icon={h.icon}
            title={h.label}
            note={hazardNote(hazard[h.key], h.bad)}
            checked={hazards.has(h.label)}
            onChange={(on) => setHazards(toggle(hazards, h.label, on))}
          />
        ))}

        <label htmlFor="description" className="mt-1 text-base font-bold">
          Ilarawan ang nakita mo <span className="font-medium text-muted">(opsyonal)</span>
        </label>
        <textarea
          id="description"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="Ikomento ang iyong reklamo"
          className="h-24 w-full resize-none rounded-2xl border-[1.5px] border-[#D8E6EF] bg-white px-3.5 py-3 text-base text-ink placeholder:text-muted focus:border-primary focus:outline-none"
        />
        <p className="-mt-1 text-right text-14 text-muted">{note.length}/500</p>
        {/* Keeps the last field clear of the fixed action bar. */}
        <div aria-hidden="true" className="h-20 flex-none" />
      </PageHeader>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[480px] rounded-t-3xl bg-white px-5 pt-3 pb-[max(30px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(20,80,120,.12)]">
        {error && (
          <p role="alert" className="mb-2.5 text-center text-base font-semibold text-lampas">
            {error}
          </p>
        )}
        <div className="grid grid-cols-[1fr_1.35fr] gap-2.5">
          <ButtonLink href="/verisite/home" variant="white" onClick={clearDraft}>
            Huwag <span className="whitespace-nowrap">i-report</span>
          </ButtonLink>
          <ButtonLink disabled={saving}>{saving ? "Ipinapadala..." : "I-report sa LGU"}</ButtonLink>
        </div>
      </div>

      {picking && (
        <>
          <button type="button" aria-label="Isara" onClick={() => setPicking(false)} className="fixed inset-0 z-20 cursor-default bg-[rgba(8,30,28,.55)]" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pick-title"
            onKeyDown={(e) => e.key === "Escape" && setPicking(false)}
            className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-h-[80dvh] max-w-[480px] flex-col rounded-t-sheet bg-white px-5 pt-3 pb-[max(34px,env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto mb-3.5 h-[5px] w-11 flex-none rounded-[3px] bg-[#D5DEDE]" />
            <h2 id="pick-title" className="mb-3 text-[26px] font-bold tracking-[-0.4px]">
              Pumili ng proyekto
            </h2>
            <div className="flex flex-col gap-2 overflow-y-auto pb-1">
              {projects.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  autoFocus={i === 0}
                  onClick={() => pickProject(p)}
                  aria-pressed={p.id === projectId}
                  className={`flex cursor-pointer items-center gap-3 rounded-card px-3 py-2.5 text-left ${p.id === projectId ? "bg-soft" : "bg-white shadow-[inset_0_0_0_1.5px_#D8E6EF]"}`}
                >
                  <Image src={`/verisite/${p.image}.png`} alt="" width={128} height={112} className="h-12 w-14 flex-none rounded-xl object-cover" />
                  <Text title={p.name} note={p.place} />
                  {p.id === projectId && <Icon name="check" size={22} color="#2E9E6B" strokeWidth={2.6} />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </form>
  );
}
