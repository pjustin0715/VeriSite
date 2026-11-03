import Image from "next/image";
import Link from "next/link";
import ButtonLink from "@/components/ButtonLink";
import Card from "@/components/Card";
import Icon, { type IconName } from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import { scanResult } from "../sample-data";

const bigBox = "size-[26px] flex-none accent-ayon";

function Tile({ icon, className }: { icon: IconName; className: string }) {
  return (
    <span className={`flex size-10 flex-none items-center justify-center rounded-[14px] bg-[#7C8B90] ${className}`}>
      <Icon name={icon} size={23} color="#FFFFFF" strokeWidth={2.1} />
    </span>
  );
}

function Text({ title, note }: { title: string; note: string }) {
  return (
    <span className="grow text-[17px] leading-[1.2] font-semibold">
      {title}
      <span className="block text-[15px] font-medium text-muted">{note}</span>
    </span>
  );
}

// One checkable finding. Checked = red tile and outline; unchecked = gray, no outline (pure CSS via :has).
function CheckCard({ icon, title, note, checked }: { icon: IconName; title: string; note: string; checked: boolean }) {
  return (
    <label className={`group flex cursor-pointer items-center gap-[11px] rounded-card bg-white px-3 py-2.5 shadow-card has-checked:shadow-[inset_0_0_0_1.5px_#F2B8B2,0_10px_20px_rgba(201,52,43,.08)]`}>
      <Tile icon={icon} className="group-has-checked:bg-lampas" />
      <Text title={title} note={note} />
      <input type="checkbox" defaultChecked={checked} className={bigBox} />
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-1 text-base font-bold">{children}</h2>;
}

// Scan result (W-Result): project match, AI checks, the user's own description, then send.
export default function ResultPage() {
  const { project, signFields, hazards } = scanResult;
  const mismatches = signFields.filter((f) => f.sign).length;
  return (
    <>
      <PageHeader image="head-worry" back="/verisite/scan" backIcon="close" title={<>May nakita ang<br />AI</>}>
        <Card className="flex items-center gap-[11px] py-2 pr-3 pl-2">
          <Image src={`/verisite/${project.image}.png`} alt="" width={128} height={112} className="h-14 w-16 flex-none rounded-[13px] object-cover" />
          <Text title={project.name} note={project.distance} />
          {/* shortcut: no project picker yet; links back to Scan to retake. */}
          <Link href="/verisite/scan" className="text-base font-bold text-link no-underline">
            Palitan
          </Link>
        </Card>

        <SectionTitle>Paskil</SectionTitle>
        <details
          open
          className={`group overflow-hidden rounded-card bg-white px-3 pb-1 shadow-card has-[>summary_input:checked]:shadow-[inset_0_0_0_1.5px_#F2B8B2,0_10px_20px_rgba(201,52,43,.08)]`}
        >
          <summary className="flex cursor-pointer list-none items-center gap-[11px] py-2.5 [&::-webkit-details-marker]:hidden">
            <Tile icon="sign" className="group-has-[>summary_input:checked]:bg-lampas" />
            <Text title="Mali ang impormasyon" note={`${mismatches} ang hindi tugma sa rekord`} />
            <Icon name="chevron" size={20} color="#5F6E74" strokeWidth={2.4} />
            <input type="checkbox" defaultChecked={mismatches > 0} aria-label="Mali ang impormasyon" className={bigBox} />
          </summary>
          {signFields.map((f) => (
            <label
              key={f.label}
              className={`flex cursor-pointer items-center gap-2.5 border-t border-line py-[9px] text-base leading-[1.2] ${f.sign ? "font-semibold" : ""}`}
            >
              <input type="checkbox" defaultChecked={!!f.sign} className="size-6 flex-none accent-ayon" />
              <span>
                {f.label}
                {f.sign && (
                  <span className="block text-[14px] font-medium text-muted">
                    Paskil: {f.sign} • Rekord: {f.record}
                  </span>
                )}
              </span>
            </label>
          ))}
        </details>
        <CheckCard icon="warning" title="Walang paskil sa lugar" note="Piliin kung wala kang nakita" checked={false} />

        <SectionTitle>Sa lugar ng proyekto</SectionTitle>
        {hazards.map((h) => (
          <CheckCard key={h.label} icon={h.icon} title={h.label} note={h.note} checked={h.found} />
        ))}

        <label htmlFor="description" className="mt-1 text-base font-bold">
          Ilarawan ang nakita mo <span className="font-medium text-muted">(opsyonal)</span>
        </label>
        <textarea
          id="description"
          placeholder="Ikomento ang iyong reklamo"
          className="h-24 w-full resize-none rounded-2xl border-[1.5px] border-[#D8E6EF] bg-white px-3.5 py-3 text-base text-ink placeholder:text-muted focus:border-primary focus:outline-none"
        />
        {/* Keeps the last field clear of the fixed action bar. */}
        <div aria-hidden="true" className="h-16 flex-none" />
      </PageHeader>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto grid max-w-[480px] grid-cols-[1fr_1.35fr] gap-2.5 rounded-t-3xl bg-white px-5 pt-3 pb-[max(30px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(20,80,120,.12)]">
        <ButtonLink href="/verisite/home" variant="white">
          Huwag i-report
        </ButtonLink>
        <ButtonLink href="/verisite/sent">I-report sa LGU</ButtonLink>
      </div>
    </>
  );
}
