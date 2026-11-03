import Link from "next/link";
import { Suspense } from "react";
import ButtonLink from "@/components/ButtonLink";
import Icon from "@/components/Icon";
import HomePage from "../home/page";
import { noFilters, parseFilters, sorts, statuses, toQuery, types, type Filters } from "../filters";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Group = "sort" | "status" | "type" | "near";

const groups: { key: Group; title: string; options: Record<string, string>; multi: boolean }[] = [
  { key: "sort", title: "Ayusin ayon sa", options: sorts, multi: false },
  { key: "status", title: "Status", options: statuses, multi: true },
  { key: "type", title: "Uri ng proyekto", options: types, multi: true },
  { key: "near", title: "Lugar", options: { "1": "Malapit sa akin" }, multi: true },
];

function isPicked(f: Filters, key: Group, value: string) {
  if (key === "near") return f.near;
  if (key === "sort") return f.sort === value;
  return (f[key] as string[]).includes(value);
}

// The sheet. `?show=sort|status|type|near` (from a Home chip) shows one group; the others still submit hidden.
async function Sheet({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const f = parseFilters(params);
  const show = groups.find((g) => g.key === params.show)?.key;
  // "Alisin lahat" clears only what the sheet shows, so the hidden groups keep their picks.
  const cleared: Filters = show ? { ...f, [show]: noFilters[show] } : noFilters;

  return (
    <>
      <Link href={`/verisite/home?${toQuery(f)}`} aria-label="Isara ang filter" className="fixed inset-0 z-20 bg-[rgba(8,30,28,.55)]" />
      {/* key: remount when the URL changes so the unmanaged checkboxes pick up new defaults (e.g. after "Alisin lahat"). */}
      <form
        key={`${toQuery(f)}&${show}`}
        action="/verisite/home"
        aria-labelledby="filter-title"
        className="fixed inset-x-0 top-[max(84px,env(safe-area-inset-top))] bottom-0 z-30 mx-auto flex max-w-[480px] flex-col rounded-t-sheet bg-white"
      >
        <div className="grow overflow-y-auto px-5 pt-3">
          <div className="mx-auto mb-3.5 h-[5px] w-11 rounded-[3px] bg-[#D5DEDE]" />
          <div className="flex items-center justify-between gap-3">
            <h1 id="filter-title" className="text-[26px] font-bold tracking-[-0.4px]">
              {show ? groups.find((g) => g.key === show)?.title : "I-filter ang balita"}
            </h1>
            <Link
              href={`/verisite/filter?${toQuery(cleared)}${show ? `&show=${show}` : ""}`}
              replace
              scroll={false}
              className="text-base font-bold whitespace-nowrap text-link no-underline"
            >
              Alisin lahat
            </Link>
          </div>
          <p className="mt-1 text-[15px] text-muted">Puwedeng pumili ng marami. Kapag walang pinili, ipapakita ang lahat.</p>
          <div className="mt-4 flex flex-col gap-4 pb-4">
            {groups.map((g) => (
              <fieldset key={g.key} hidden={!!show && show !== g.key}>
                {!show && <legend className="mb-2 text-[17px] font-bold">{g.title}</legend>}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(g.options).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex h-11 cursor-pointer items-center gap-1 rounded-[22px] bg-white px-[15px] text-base font-semibold whitespace-nowrap shadow-[inset_0_0_0_1.5px_#D8E6EF] has-checked:bg-primary has-checked:text-white has-checked:shadow-none has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-link"
                    >
                      <input
                        type={g.multi ? "checkbox" : "radio"}
                        name={g.key}
                        value={value}
                        defaultChecked={isPicked(f, g.key, value)}
                        className="peer sr-only"
                      />
                      {/* Check mark on picked multi-select chips, so "picked" isn't shown by color alone. */}
                      {g.multi && (
                        <span className="hidden peer-checked:block">
                          <Icon name="check" size={17} strokeWidth={2.6} />
                        </span>
                      )}
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

// Filter sheet over the Home feed (W-Filter). Submits to Home as a plain GET form.
export default function FilterPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <HomePage searchParams={searchParams} />
      <Suspense>
        <Sheet searchParams={searchParams} />
      </Suspense>
    </>
  );
}
