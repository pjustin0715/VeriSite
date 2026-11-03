import Link from "next/link";
import ButtonLink from "@/components/ButtonLink";
import HomePage from "../home/page";
import { projects } from "../sample-data";

// First option of each group starts selected.
const groups = [
  { name: "Ayusin ayon sa", options: ["Pinakabago", "Pinakaluma", "Pinakamaraming report"] },
  { name: "Status", options: ["Lahat", "Lampas sa petsa", "Malapit na", "Ayon sa plano", "Tapos na"] },
  { name: "Uri ng proyekto", options: ["Lahat", "Kalsada", "Tulay", "Kanal", "Gusali"] },
  { name: "Lugar", options: ["Malapit sa akin", "Buong lungsod"] },
];

// Filter sheet over the Home feed (W-Filter).
// shortcut: choices are not applied to the feed yet; pass them as search params when Home filters real data.
export default function FilterPage() {
  return (
    <>
      <HomePage />
      <Link href="/verisite/home" aria-label="Isara ang filter" className="fixed inset-0 z-20 bg-[rgba(8,30,28,.55)]" />
      <section
        aria-labelledby="filter-title"
        className="fixed inset-x-0 top-[max(84px,env(safe-area-inset-top))] bottom-0 z-30 mx-auto flex max-w-[480px] flex-col rounded-t-sheet bg-white"
      >
        <div className="grow overflow-y-auto px-5 pt-3">
          <div className="mx-auto mb-3.5 h-[5px] w-11 rounded-[3px] bg-[#D5DEDE]" />
          <div className="flex items-center justify-between">
            <h1 id="filter-title" className="text-[26px] font-bold tracking-[-0.4px]">
              I-filter ang balita
            </h1>
            <Link href="/verisite/home" className="text-base font-bold text-link no-underline">
              I-clear
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-4 pb-4">
            {groups.map((g) => (
              <fieldset key={g.name}>
                <legend className="mb-2 text-[17px] font-bold">{g.name}</legend>
                <div className="flex flex-wrap gap-2">
                  {g.options.map((o, i) => (
                    <label
                      key={o}
                      className="flex h-11 cursor-pointer items-center rounded-[22px] bg-white px-[15px] text-base font-semibold whitespace-nowrap shadow-[inset_0_0_0_1.5px_#D8E6EF] has-checked:bg-primary has-checked:text-white has-checked:shadow-none has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-link"
                    >
                      <input type="radio" name={g.name} defaultChecked={i === 0} className="sr-only" />
                      {o}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </div>
        <div className="px-5 pt-3 pb-[max(34px,env(safe-area-inset-bottom))]">
          <ButtonLink href="/verisite/home">Ipakita ang {projects.length} proyekto</ButtonLink>
        </div>
      </section>
    </>
  );
}
