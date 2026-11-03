import Link from "next/link";
import { Suspense } from "react";
import ButtonLink from "@/components/ButtonLink";
import Icon from "@/components/Icon";
import HomePage from "../home/page";
import { parseFilters, statuses, toQuery, types, type Filters } from "../filters";
import ClearButton from "./ClearButton";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Group = "status" | "type" | "near";

const groups: { key: Group; title: string; options: Record<string, string> }[] = [
  { key: "status", title: "Status", options: statuses },
  { key: "type", title: "Uri", options: types },
  { key: "near", title: "Lugar", options: { "1": "Malapit sa akin" } },
];

function isPicked(f: Filters, key: Group, value: string) {
  return key === "near" ? f.near : (f[key] as string[]).includes(value);
}

async function Sheet({ searchParams }: { searchParams: SearchParams }) {
  const f = parseFilters(await searchParams);

  return (
    <>
      <Link href={`/verisite/home?${toQuery(f)}`} aria-label="Isara ang filter" className="fixed inset-0 z-20 bg-[rgba(8,30,28,.55)]" />
      {/* key: remount when the URL changes so the unmanaged checkboxes pick up new defaults. */}
      <form
        key={toQuery(f)}
        action="/verisite/home"
        aria-labelledby="filter-title"
        className="group fixed inset-x-0 top-[max(84px,env(safe-area-inset-top))] bottom-0 z-30 mx-auto flex max-w-[480px] flex-col rounded-t-sheet bg-white"
      >
        {/* Sort lives outside the filters; carry it through so applying keeps it. */}
        {f.sort !== "bago" && <input type="hidden" name="sort" value={f.sort} />}
        <div className="grow overflow-y-auto px-5 pt-3">
          <div className="mx-auto mb-3.5 h-[5px] w-11 rounded-[3px] bg-[#D5DEDE]" />
          <div className="flex min-h-10 items-center justify-between gap-3">
            <h1 id="filter-title" className="text-[26px] font-bold tracking-[-0.4px]">
              Filter
            </h1>
            <ClearButton />
          </div>
          <div className="mt-4 flex flex-col gap-4 pb-4">
            {groups.map((g) => (
              <fieldset key={g.key}>
                <legend className="mb-2 text-[17px] font-bold">{g.title}</legend>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(g.options).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex h-11 cursor-pointer items-center gap-1 rounded-[22px] bg-white px-[15px] text-base font-semibold whitespace-nowrap shadow-[inset_0_0_0_1.5px_#D8E6EF] has-checked:bg-primary has-checked:text-white has-checked:shadow-none has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-link"
                    >
                      <input type="checkbox" name={g.key} value={value} defaultChecked={isPicked(f, g.key, value)} className="peer sr-only" />
                      {/* Check mark on every picked option, so "picked" isn't shown by color alone. */}
                      <span className="hidden peer-checked:block">
                        <Icon name="check" size={17} strokeWidth={2.6} />
                      </span>
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </div>
        <div className="px-5 pt-3 pb-[max(34px,env(safe-area-inset-bottom))]">
          <ButtonLink>Ipakita ang mga proyekto</ButtonLink>
        </div>
      </form>
    </>
  );
}

// Filter popup over the Home feed (W-Filter). Submits to Home as a plain GET form.
export default function FilterPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <HomePage />
      <Suspense>
        <Sheet searchParams={searchParams} />
      </Suspense>
    </>
  );
}
